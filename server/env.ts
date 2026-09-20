import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readDotEnv(root: string) {
  const file = join(root, ".env");
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const i = text.indexOf("=");
    if (i < 0) continue;
    const key = text.slice(0, i).trim();
    const value = text.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) out[key] = value;
  }
  return out;
}

export function envGet(root: string, key: string, fallback = "") {
  return process.env[key] || readDotEnv(root)[key] || fallback;
}
