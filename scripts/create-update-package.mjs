import { createHash, createPrivateKey, sign } from "node:crypto";
import { writeFile } from "node:fs/promises";
import JSZip from "jszip";

const [versionArg, image, outputArg] = process.argv.slice(2);

if (!versionArg || !image) {
  console.error("Usage: node scripts/create-update-package.mjs <version> <image@sha256:digest> [output.zip]");
  process.exit(1);
}

const version = versionArg.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error("Invalid semantic version");
}
if (!/^ghcr\.io\/itechlabfr\/filario@sha256:[a-f0-9]{64}$/.test(image)) {
  throw new Error("Image must be the official Filario GHCR image pinned by sha256 digest");
}

const encodedKey = process.env.FILARIO_UPDATE_SIGNING_KEY_B64;
if (!encodedKey) {
  throw new Error("FILARIO_UPDATE_SIGNING_KEY_B64 is required");
}

const privateKey = createPrivateKey({
  key: Buffer.from(encodedKey, "base64"),
  format: "der",
  type: "pkcs8"
});

const manifest = {
  format: "filario-update",
  formatVersion: 1,
  version,
  image,
  publishedAt: new Date().toISOString(),
  minimumVersion: "0.1.0",
  releaseNotes: `Filario ${version}`
};

const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n", "utf8");
const checksum = createHash("sha256").update(manifestBytes).digest("hex");
const signature = sign(null, manifestBytes, privateKey).toString("base64");

const zip = new JSZip();
zip.file("manifest.json", manifestBytes);
zip.file("checksums.sha256", `${checksum}  manifest.json\n`);
zip.file("signature.ed25519", `${signature}\n`);

const output = outputArg || `filario-update-${version}.zip`;
const bytes = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 7 }
});
await writeFile(output, bytes);

console.log(output);
