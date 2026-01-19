import type { AuthData, JWTPayload } from "../types/index.js";

export function decodeJWT(token: string): JWTPayload {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) {
      throw new Error("Invalid JWT format");
    }
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error("Failed to decode JWT");
  }
}

export function safeDecodeJWT(token: string): JWTPayload | null {
  try {
    return decodeJWT(token);
  } catch (error) {
    return null;
  }
}

export function getTokenIssuedAt(token?: string | null): number | null {
  if (!token) {
    return null;
  }
  const payload = safeDecodeJWT(token);
  if (!payload || typeof payload.iat !== "number") {
    return null;
  }
  return payload.iat;
}

export function getAuthIssuedAt(auth?: AuthData | null): number | null {
  if (!auth?.tokens) {
    return null;
  }
  const idTokenIat = getTokenIssuedAt(auth.tokens.id_token);
  if (idTokenIat !== null) {
    return idTokenIat;
  }
  return getTokenIssuedAt(auth.tokens.access_token);
}
