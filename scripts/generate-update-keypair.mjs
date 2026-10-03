import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");

const publicDer = publicKey.export({ format: "der", type: "spki" });
const privateDer = privateKey.export({ format: "der", type: "pkcs8" });

console.log("FILARIO_UPDATE_PUBLIC_KEY_B64=");
console.log(publicDer.toString("base64"));
console.log("");
console.log("FILARIO_UPDATE_SIGNING_KEY_B64 (SECRET - store in GitHub Actions, never commit):");
console.log(privateDer.toString("base64"));
