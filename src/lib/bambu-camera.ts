import { spawn } from "node:child_process";
import tls from "node:tls";

export type CameraTransport = "jpeg-tunnel" | "rtsps";

export function cameraTransport(model: string | null): CameraTransport | null {
  const value = String(model || "").toUpperCase();
  if (/\bA1\b|A1 MINI|\bP1S\b|\bP1P\b/.test(value)) return "jpeg-tunnel";
  if (/X1|P2S|H2D|H2S/.test(value)) return "rtsps";
  return null;
}

export function isPrivateIpv4(host: string) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function fingerprint(cert: tls.PeerCertificate) {
  return String(cert.fingerprint256 || "").replaceAll(":", "").toLowerCase();
}

function verifyPrinterCertificate(
  cert: tls.PeerCertificate,
  serial: string,
  expectedFingerprint: string | null
) {
  const actual = fingerprint(cert);
  if (!actual) throw new Error("Certificat caméra Bambu introuvable.");

  if (expectedFingerprint) {
    if (actual !== expectedFingerprint.toLowerCase()) {
      throw new Error("Le certificat de la caméra Bambu a changé.");
    }
    return actual;
  }

  const cn = String(cert.subject?.CN || "").trim();
  if (cn && serial && cn !== serial) {
    throw new Error("Le certificat caméra ne correspond pas au numéro de série de l’imprimante.");
  }

  return actual;
}

export async function captureJpegTunnelFrame(input: {
  host: string;
  serial: string;
  accessCode: string;
  expectedFingerprint: string | null;
}) {
  return new Promise<{ jpeg: Buffer; fingerprint: string }>((resolve, reject) => {
    const socket = tls.connect({
      host: input.host,
      port: 6000,
      servername: input.serial,
      rejectUnauthorized: false
    });

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("La caméra Bambu ne répond pas sur le port 6000."));
    }, 8000);

    let packet = Buffer.alloc(0);
    let expectedSize: number | null = null;
    let certFingerprint = "";

    function fail(error: Error) {
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    }

    socket.once("error", (error) => fail(error));

    socket.once("secureConnect", () => {
      try {
        certFingerprint = verifyPrinterCertificate(
          socket.getPeerCertificate(),
          input.serial,
          input.expectedFingerprint
        );

        const auth = Buffer.alloc(80);
        auth.writeUInt32LE(0x40, 0);
        auth.writeUInt32LE(0x3000, 4);
        auth.writeUInt32LE(0, 8);
        auth.writeUInt32LE(0, 12);
        auth.write("bblp", 16, 32, "ascii");
        auth.write(input.accessCode.slice(0, 32), 48, 32, "ascii");
        socket.write(auth);
      } catch (error) {
        fail(error instanceof Error ? error : new Error("Authentification caméra impossible."));
      }
    });

    socket.on("data", (chunk) => {
      packet = Buffer.concat([packet, chunk]);

      if (expectedSize == null && packet.length >= 16) {
        expectedSize = packet.readUInt32LE(0);
        if (expectedSize <= 0 || expectedSize > 8 * 1024 * 1024) {
          fail(new Error("Taille d’image caméra invalide."));
          return;
        }
      }

      if (expectedSize != null && packet.length >= 16 + expectedSize) {
        const jpeg = packet.subarray(16, 16 + expectedSize);
        if (
          jpeg.length < 4 ||
          jpeg[0] !== 0xff ||
          jpeg[1] !== 0xd8 ||
          jpeg[jpeg.length - 2] !== 0xff ||
          jpeg[jpeg.length - 1] !== 0xd9
        ) {
          fail(new Error("La caméra Bambu n’a pas renvoyé une image JPEG valide."));
          return;
        }

        clearTimeout(timer);
        socket.destroy();
        resolve({ jpeg, fingerprint: certFingerprint });
      }
    });
  });
}

async function probeTlsFingerprint(input: {
  host: string;
  port: number;
  serial: string;
  expectedFingerprint: string | null;
}) {
  return new Promise<string>((resolve, reject) => {
    const socket = tls.connect({
      host: input.host,
      port: input.port,
      servername: input.serial,
      rejectUnauthorized: false
    });

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("La caméra Bambu ne répond pas."));
    }, 5000);

    socket.once("error", (error) => {
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    });

    socket.once("secureConnect", () => {
      try {
        const value = verifyPrinterCertificate(
          socket.getPeerCertificate(),
          input.serial,
          input.expectedFingerprint
        );
        clearTimeout(timer);
        socket.destroy();
        resolve(value);
      } catch (error) {
        clearTimeout(timer);
        socket.destroy();
        reject(error);
      }
    });
  });
}

export async function captureRtspFrame(input: {
  host: string;
  serial: string;
  accessCode: string;
  expectedFingerprint: string | null;
}) {
  const certFingerprint = await probeTlsFingerprint({
    host: input.host,
    port: 322,
    serial: input.serial,
    expectedFingerprint: input.expectedFingerprint
  });

  const password = encodeURIComponent(input.accessCode);
  const url = `rtsps://bblp:${password}@${input.host}:322/streaming/live/1`;

  const jpeg = await new Promise<Buffer>((resolve, reject) => {
    const child = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-rtsp_transport", "tcp",
      "-rw_timeout", "7000000",
      "-tls_verify", "0",
      "-i", url,
      "-frames:v", "1",
      "-f", "image2pipe",
      "-vcodec", "mjpeg",
      "pipe:1"
    ], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    let total = 0;

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("La caméra RTSPS Bambu ne répond pas."));
    }, 10_000);

    child.stdout.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total <= 8 * 1024 * 1024) chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (Buffer.concat(errors).length < 4096) errors.push(chunk);
    });

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.once("close", (code) => {
      clearTimeout(timer);
      const output = Buffer.concat(chunks);
      if (code !== 0 || output.length < 4) {
        const detail = Buffer.concat(errors).toString("utf8").trim();
        reject(new Error(detail ? `Caméra RTSPS : ${detail.slice(0, 300)}` : "Caméra RTSPS indisponible."));
        return;
      }
      resolve(output);
    });
  });

  return { jpeg, fingerprint: certFingerprint };
}
