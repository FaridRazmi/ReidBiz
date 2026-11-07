const encoder = new TextEncoder();

export const SESSION_COOKIE = "reidbiz_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const normalised = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalised + "=".repeat((4 - (normalised.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function sessionSecret(): string {
  return process.env.AUTH_SECRET || `reidbiz:${process.env.APP_PASSWORD ?? ""}`;
}

async function signingKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export async function createSessionToken(): Promise<string> {
  const payload = base64urlEncode(
    encoder.encode(JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 })),
  );
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(payload));
  return `${payload}.${base64urlEncode(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      base64urlDecode(signature),
      encoder.encode(payload),
    );
  } catch {
    return false;
  }
  if (!valid) return false;

  try {
    const data = JSON.parse(new TextDecoder().decode(base64urlDecode(payload))) as {
      exp?: unknown;
    };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
