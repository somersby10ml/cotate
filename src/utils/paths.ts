import os from "os";
import path from "path";

export function getCodexDir(): string {
  return path.join(os.homedir(), ".codex");
}

export function getAuthPath(): string {
  return path.join(getCodexDir(), "auth.json");
}

export function getAuthsPath(): string {
  return path.join(getCodexDir(), "_auths.json");
}
