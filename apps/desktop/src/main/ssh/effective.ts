// apps/desktop/src/main/ssh/effective.ts
import { execa } from "execa";
import os from "node:os";
import path from "node:path";

export type EffectiveResult = {
  ok: true;
  map: Record<string, string>;
  raw: string;
  version: string;
} | {
  ok: false;
  error: string;
  raw?: string;
  version?: string;
};

export function defaultConfigPath() {
  return path.join(os.homedir(), ".ssh", "my_ssh_config");
}

export async function detectSshVersion(): Promise<string> {
  try {
    const { stderr, stdout } = await execa("ssh", ["-V"], { all: true });
    const out = (stdout || stderr || "").trim(); // ssh -V prints to stderr on many builds
    return out;
  } catch (e: any) {
    return `ssh -V failed: ${e?.shortMessage || e?.message || String(e)}`;
  }
}

export async function getEffective(alias: string, cfgPath?: string, overrides?: Record<string, string>): Promise<EffectiveResult> {
  const args = ["-G", alias];
  if (cfgPath) args.unshift("-F", cfgPath);
  // apply overrides as -o key=value (only if provided & non-empty)
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== undefined && v !== null && String(v).length > 0) {
        args.push("-o", `${k}=${v}`);
      }
    }
  }
  try {
    const { stdout } = await execa("ssh", args, { timeout: 5000 });
    const raw = stdout || "";
    const map: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const m = /^(\S+)\s+(.*)$/.exec(line.trim());
      if (m) map[m[1].toLowerCase()] = m[2];
    }
    const version = await detectSshVersion();
    return { ok: true, map, raw, version };
  } catch (e: any) {
    return { ok: false, error: e?.shortMessage || e?.message || String(e), raw: e?.stdout, version: await detectSshVersion() };
  }
}
