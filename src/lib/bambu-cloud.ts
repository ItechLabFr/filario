type BambuRegion = "global" | "china";

type BambuDevice = {
  dev_id?: string;
  devId?: string;
  name?: string;
  dev_name?: string;
  online?: boolean;
  dev_online?: boolean;
  dev_product_name?: string;
  dev_model_name?: string;
  product_name?: string;
  model_name?: string;
  dev_access_code?: string;
  access_code?: string;
  [key: string]: unknown;
};

function baseUrl(region: BambuRegion) {
  return region === "china" ? "https://api.bambulab.cn" : "https://api.bambulab.com";
}

async function parseJson(response: Response) {
  const text = await response.text();
  let payload: any = {};
  try { payload = text ? JSON.parse(text) : {}; } catch {}
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Bambu Cloud HTTP ${response.status}`);
  }
  return payload;
}

export async function sendBambuLoginCode(email: string, region: BambuRegion) {
  const response = await fetch(`${baseUrl(region)}/v1/user-service/user/sendemail/code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Filario/0.1 (+https://filario.fr)"
    },
    body: JSON.stringify({ email, type: "codeLogin" }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });
  return parseJson(response);
}

export async function verifyBambuLoginCode(email: string, code: string, region: BambuRegion) {
  const response = await fetch(`${baseUrl(region)}/v1/user-service/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Filario/0.1 (+https://filario.fr)"
    },
    body: JSON.stringify({ account: email, code }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });

  const payload = await parseJson(response);
  const accessToken = payload?.accessToken;
  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error(payload?.message || "Bambu Cloud n’a pas renvoyé de jeton de connexion.");
  }

  return {
    accessToken,
    expiresIn: Number(payload?.expiresIn || 0) || null
  };
}

export async function getBambuDevices(token: string, region: BambuRegion) {
  const response = await fetch(`${baseUrl(region)}/v1/iot-service/api/user/bind`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "Filario/0.1 (+https://filario.fr)"
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });

  const payload = await parseJson(response);
  const candidates =
    (Array.isArray(payload?.devices) && payload.devices) ||
    (Array.isArray(payload?.data?.devices) && payload.data.devices) ||
    (Array.isArray(payload?.data) && payload.data) ||
    [];

  return candidates.map((device: BambuDevice) => ({
    devId: String(device.dev_id ?? device.devId ?? ""),
    name: String(device.name ?? device.dev_name ?? device.dev_product_name ?? "Bambu Lab"),
    productName: String(device.dev_product_name ?? device.product_name ?? "") || null,
    modelName: String(device.dev_model_name ?? device.model_name ?? "") || null,
    online: Boolean(device.online ?? device.dev_online ?? false),
    accessCode: String(device.dev_access_code ?? device.access_code ?? "").trim() || null,
    raw: device
  })).filter((device: { devId: string }) => device.devId);
}

export function bambuModelLabel(productName: string | null, modelName: string | null) {
  const value = [productName, modelName].filter(Boolean).join(" ").toUpperCase();
  const aliases: Array<[RegExp,string]> = [
    [/X1.*CARBON|X1C/, "X1 Carbon"],
    [/\bX1E\b/, "X1E"],
    [/\bX1\b/, "X1"],
    [/\bP1S\b/, "P1S"],
    [/\bP1P\b/, "P1P"],
    [/A1.*MINI/, "A1 mini"],
    [/\bA1\b/, "A1"],
    [/\bH2D\b/, "H2D"],
    [/\bH2S\b/, "H2S"],
    [/\bP2S\b/, "P2S"],
    [/\bX2D\b/, "X2D"]
  ];
  for (const [pattern,label] of aliases) if (pattern.test(value)) return label;
  return productName || modelName || "Imprimante Bambu Lab";
}
