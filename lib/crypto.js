import crypto from "node:crypto";

function encryptionKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || "";
  const key = /^[a-f0-9]{64}$/i.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (base64) or 64 hex characters.");
  }
  return key;
}

export function encryptSecret(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value) {
  if (!value) return null;
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Invalid encrypted token.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function stateSecret() {
  const value = process.env.OAUTH_STATE_SECRET || "";
  if (value.length < 32) throw new Error("OAUTH_STATE_SECRET must contain at least 32 characters.");
  return value;
}

export function createOAuthState(userId) {
  const payload = Buffer.from(JSON.stringify({
    userId,
    nonce: crypto.randomBytes(18).toString("base64url"),
    exp: Date.now() + 10 * 60 * 1000,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOAuthState(state) {
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature) throw new Error("Invalid OAuth state.");
  const expected = crypto.createHmac("sha256", stateSecret()).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    throw new Error("Invalid OAuth state.");
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!parsed.userId || !parsed.exp || parsed.exp < Date.now()) throw new Error("OAuth state expired.");
  return parsed;
}
