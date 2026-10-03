import { createHash, createPublicKey, verify } from "node:crypto";
import JSZip from "jszip";
import { z } from "zod";

const updateManifestSchema = z.object({
  format: z.literal("filario-update"),
  formatVersion: z.literal(1),
  version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/),
  image: z.string().regex(/^ghcr\.io\/itechlabfr\/filario@sha256:[a-f0-9]{64}$/),
  publishedAt: z.string().datetime(),
  minimumVersion: z.string().optional(),
  releaseNotes: z.string().max(20000).optional()
});

export type FilarioUpdateManifest = z.infer<typeof updateManifestSchema>;

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function getPublicKey() {
  const encoded = process.env.FILARIO_UPDATE_PUBLIC_KEY_B64;
  if (!encoded) {
    throw new Error("La clé publique de mise à jour Filario n'est pas configurée.");
  }

  return createPublicKey({
    key: Buffer.from(encoded, "base64"),
    format: "der",
    type: "spki"
  });
}

export async function verifyUpdatePackage(bytes: Buffer) {
  if (bytes.length > 25 * 1024 * 1024) {
    throw new Error("Le paquet de mise à jour dépasse 25 Mo.");
  }

  const zip = await JSZip.loadAsync(bytes);
  const manifestFile = zip.file("manifest.json");
  const checksumsFile = zip.file("checksums.sha256");
  const signatureFile = zip.file("signature.ed25519");

  if (!manifestFile || !checksumsFile || !signatureFile) {
    throw new Error("Paquet Filario incomplet.");
  }

  const manifestBytes = await manifestFile.async("nodebuffer");
  const manifest = updateManifestSchema.parse(
    JSON.parse(manifestBytes.toString("utf8"))
  );

  const checksumText = await checksumsFile.async("string");
  for (const line of checksumText.split(/\r?\n/).filter(Boolean)) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9_./-]+)$/.exec(line);
    if (!match) throw new Error("checksums.sha256 invalide.");

    const [, expected, path] = match;
    if (path === "signature.ed25519") continue;

    const file = zip.file(path);
    if (!file) throw new Error(`Fichier manquant dans le paquet : ${path}`);
    const actual = sha256(await file.async("nodebuffer"));
    if (actual !== expected) {
      throw new Error(`Checksum invalide : ${path}`);
    }
  }

  const signatureText = (await signatureFile.async("string")).trim();
  const signature = Buffer.from(signatureText, "base64");
  if (signature.length !== 64) {
    throw new Error("Signature Ed25519 invalide.");
  }

  const valid = verify(null, manifestBytes, getPublicKey(), signature);
  if (!valid) {
    throw new Error("La signature de cette mise à jour n'est pas valide.");
  }

  return manifest;
}
