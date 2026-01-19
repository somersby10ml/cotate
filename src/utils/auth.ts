import type { AuthData } from "../types/index.js";
import { getAuthIssuedAt } from "./jwt.js";

export function selectLatestAuth(
  preferred: AuthData,
  candidate?: AuthData | null
): { auth: AuthData; fromPreferred: boolean } {
  const preferredIat = getAuthIssuedAt(preferred);
  const candidateIat = getAuthIssuedAt(candidate);

  if (
    candidate &&
    candidateIat !== null &&
    (preferredIat === null || candidateIat > preferredIat)
  ) {
    return { auth: candidate, fromPreferred: false };
  }

  return { auth: preferred, fromPreferred: true };
}
