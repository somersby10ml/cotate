import fs from "fs";
import type { AuthData, AuthsData } from "../types/index.js";

export function readAuthData(path: string): AuthData {
  const content = fs.readFileSync(path, "utf-8");
  return JSON.parse(content);
}

export function writeAuthData(path: string, data: AuthData): void {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

export function readAuthsData(path: string): AuthsData {
  if (!fs.existsSync(path)) {
    return {};
  }
  const content = fs.readFileSync(path, "utf-8");
  return JSON.parse(content);
}

export function writeAuthsData(path: string, data: AuthsData): void {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

export function fileExists(path: string): boolean {
  return fs.existsSync(path);
}
