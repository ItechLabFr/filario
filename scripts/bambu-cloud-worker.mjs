import crypto from "node:crypto";
import mqtt from "mqtt";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET must contain at least 32 characters");
}

const pool = new Pool({ connectionString: DATABASE_URL });
const sessions = new Map();

function key() {
  return crypto.createHash("sha256").update(AUTH_SECRET, "utf8").digest();
}

function decryptSecret({ ciphertext, iv, tag }) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const value = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final()
  ]);
  return value.toString("utf8");
}

function baseUrl(region) {
  return region === "china" ? "https://api.bambulab.cn" : "https://api.bambulab.com";
}

function brokerUrl(region) {
  return region === "china"
    ? "mqtts://cn.mqtt.bambulab.com:8883"
    : "mqtts://us.mqtt.bambulab.com:8883";
}

async function getCloudUserId(token, region) {
  const response = await fetch(`${baseUrl(region)}/v1/design-user-service/my/preference`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "Filario/0.2 (+https://filario.fr)"
    },
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    throw new Error(`Bambu user preference HTTP ${response.status}`);
  }

  const payload = await response.json();
  const uid =
    payload?.uid ??
    payload?.data?.uid ??
    payload?.user_id ??
    payload?.userId ??
    payload?.id ??
    payload?.data?.id;

  if (uid == null || String(uid).trim() === "") {
    throw new Error("Bambu Cloud user id unavailable");
  }

  return String(uid);
}

function deepMerge(target, source) {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== "object") return source;

  const base = target && typeof target === "object" && !Array.isArray(target)
    ? { ...target }
    : {};

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      base[key] = value;
    } else if (value && typeof value === "object") {
      base[key] = deepMerge(base[key], value);
    } else {
      base[key] = value;
    }
  }

  return base;
}

function printerStatus(telemetry) {
  const state = String(telemetry?.print?.gcode_state ?? "").toUpperCase();
  if (state === "RUNNING" || state === "PREPARE") return "printing";
  if (state === "PAUSE") return "paused";
  if (state === "FAILED") return "error";
  if (state === "IDLE" || state === "FINISH") return "idle";
  return "idle";
}

async function loadAccounts() {
  const result = await pool.query(
    `SELECT
       id, organization_id, user_id, email, region,
       token_ciphertext, token_iv, token_tag, cloud_user_id, updated_at
     FROM bambu_accounts
     WHERE status = 'connected'`
  );
  return result.rows;
}

async function loadDevices(accountId) {
  const result = await pool.query(
    `SELECT id, printer_id, dev_id, telemetry
     FROM bambu_devices
     WHERE account_id = $1`,
    [accountId]
  );
  return result.rows;
}

async function persistTelemetry(deviceId, printerId, telemetry) {
  const status = printerStatus(telemetry);

  await pool.query(
    `UPDATE bambu_devices
     SET telemetry = $1::jsonb,
         telemetry_updated_at = now(),
         online = true,
         last_seen_at = now(),
         updated_at = now()
     WHERE id = $2`,
    [JSON.stringify(telemetry), deviceId]
  );

  if (printerId) {
    await pool.query(
      `UPDATE printers
       SET status = $1, updated_at = now()
       WHERE id = $2`,
      [status, printerId]
    );
  }
}

function schedulePersist(session, device) {
  const state = session.deviceState.get(device.dev_id);
  if (!state || state.timer) return;

  state.timer = setTimeout(async () => {
    state.timer = null;
    try {
      await persistTelemetry(device.id, device.printer_id, state.telemetry);
    } catch (error) {
      console.error("[bambu-worker] persist telemetry failed", device.dev_id, error);
    }
  }, 1200);
}

function publishPushAll(session, devId) {
  if (!session.client?.connected) return;
  const topic = `device/${devId}/request`;
  const body = JSON.stringify({
    pushing: {
      sequence_id: "0",
      command: "pushall",
      version: 1,
      push_target: 1
    }
  });
  session.client.publish(topic, body, { qos: 0 });
}

async function ensureDevices(session) {
  const devices = await loadDevices(session.account.id);

  for (const device of devices) {
    if (!session.deviceState.has(device.dev_id)) {
      session.deviceState.set(device.dev_id, {
        device,
        telemetry: device.telemetry || {},
        timer: null
      });
    } else {
      session.deviceState.get(device.dev_id).device = device;
    }

    if (!session.subscribed.has(device.dev_id) && session.client?.connected) {
      const topic = `device/${device.dev_id}/report`;
      session.client.subscribe(topic, { qos: 0 }, (error) => {
        if (error) {
          console.error("[bambu-worker] subscribe failed", topic, error);
          return;
        }
        session.subscribed.add(device.dev_id);
        setTimeout(() => publishPushAll(session, device.dev_id), 350);
      });
    }
  }

  const existingIds = new Set(devices.map((device) => device.dev_id));
  for (const devId of session.deviceState.keys()) {
    if (!existingIds.has(devId)) {
      session.deviceState.delete(devId);
      session.subscribed.delete(devId);
    }
  }
}

async function connectAccount(account) {
  const token = decryptSecret({
    ciphertext: account.token_ciphertext,
    iv: account.token_iv,
    tag: account.token_tag
  });

  let uid = account.cloud_user_id;
  if (!uid) {
    uid = await getCloudUserId(token, account.region);
    await pool.query(
      "UPDATE bambu_accounts SET cloud_user_id = $1, updated_at = now() WHERE id = $2",
      [uid, account.id]
    );
  }

  const session = {
    account,
    token,
    uid,
    client: null,
    subscribed: new Set(),
    deviceState: new Map(),
    refreshTimer: null,
    pushAllTimer: null
  };

  const client = mqtt.connect(brokerUrl(account.region), {
    username: `u_${uid}`,
    password: token,
    clean: true,
    reconnectPeriod: 10_000,
    connectTimeout: 20_000,
    keepalive: 45,
    rejectUnauthorized: true,
    clientId: `filario_${account.id.replaceAll("-", "").slice(0, 12)}_${crypto.randomBytes(4).toString("hex")}`
  });

  session.client = client;

  client.on("connect", async () => {
    console.log("[bambu-worker] connected", account.email);
    session.subscribed.clear();

    try {
      await ensureDevices(session);
      await pool.query(
        "UPDATE bambu_accounts SET status = 'connected', last_error = NULL WHERE id = $1",
        [account.id]
      );
    } catch (error) {
      console.error("[bambu-worker] device setup failed", account.email, error);
    }
  });

  client.on("message", (topic, payload) => {
    const match = /^device\/([^/]+)\/report$/.exec(topic);
    if (!match) return;

    const devId = match[1];
    const state = session.deviceState.get(devId);
    if (!state) return;

    try {
      const message = JSON.parse(payload.toString("utf8"));
      state.telemetry = deepMerge(state.telemetry, message);
      schedulePersist(session, state.device);
    } catch (error) {
      console.error("[bambu-worker] invalid MQTT payload", devId, error);
    }
  });

  client.on("error", async (error) => {
    console.error("[bambu-worker] mqtt error", account.email, error.message);
    await pool.query(
      `UPDATE bambu_accounts
       SET last_error = $1, updated_at = now()
       WHERE id = $2`,
      [String(error.message || "MQTT error").slice(0, 500), account.id]
    ).catch(() => undefined);
  });

  client.on("close", () => {
    console.log("[bambu-worker] disconnected", account.email);
  });

  session.refreshTimer = setInterval(() => {
    ensureDevices(session).catch((error) => {
      console.error("[bambu-worker] refresh devices failed", account.email, error);
    });
  }, 30_000);

  session.pushAllTimer = setInterval(() => {
    for (const devId of session.subscribed) {
      publishPushAll(session, devId);
    }
  }, 5 * 60_000);

  sessions.set(account.id, session);
}

async function disconnectSession(accountId) {
  const session = sessions.get(accountId);
  if (!session) return;

  clearInterval(session.refreshTimer);
  clearInterval(session.pushAllTimer);
  for (const state of session.deviceState.values()) {
    if (state.timer) clearTimeout(state.timer);
  }

  await new Promise((resolve) => {
    if (!session.client) return resolve();
    session.client.end(true, {}, resolve);
  });

  sessions.delete(accountId);
}

async function reconcile() {
  const accounts = await loadAccounts();
  const liveIds = new Set(accounts.map((account) => account.id));

  for (const accountId of sessions.keys()) {
    if (!liveIds.has(accountId)) await disconnectSession(accountId);
  }

  for (const account of accounts) {
    const existing = sessions.get(account.id);
    if (!existing) {
      try {
        await connectAccount(account);
      } catch (error) {
        console.error("[bambu-worker] connect account failed", account.email, error);
        await pool.query(
          `UPDATE bambu_accounts
           SET last_error = $1, updated_at = now()
           WHERE id = $2`,
          [error instanceof Error ? error.message.slice(0, 500) : "Bambu worker error", account.id]
        ).catch(() => undefined);
      }
      continue;
    }

    if (String(existing.account.updated_at) !== String(account.updated_at)) {
      await disconnectSession(account.id);
      try {
        await connectAccount(account);
      } catch (error) {
        console.error("[bambu-worker] reconnect account failed", account.email, error);
      }
    }
  }
}

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[bambu-worker] stopping");

  for (const accountId of [...sessions.keys()]) {
    await disconnectSession(accountId);
  }

  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[bambu-worker] starting");
await reconcile();
setInterval(() => {
  reconcile().catch((error) => console.error("[bambu-worker] reconcile failed", error));
}, 30_000);
