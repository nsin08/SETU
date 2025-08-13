// apps/desktop/src/main/ssh/config-loader.ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import fg from "fast-glob";

export type SshOptionKV = { key: string; value: string; file: string; line: number };
export type SshHostPattern = {
  pattern: string;                // e.g., "prod-* dev db-1"
  tokens: string[];               // split by whitespace
  file: string;
  line: number;
  options: SshOptionKV[];         // raw options captured under this Host block
};

export type LoadResult = {
  files: string[];                // all files used (primary + includes)
  hosts: SshHostPattern[];
  errors: string[];
};

const MAX_INCLUDE_FILES = 200;
const MAX_DEPTH = 5;

export function expandTilde(p: string) {
  if (!p) return p;
  if (p.startsWith("~")) return path.join(os.homedir(), p.slice(1));
  return p;
}

function readLines(file: string): string[] {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
}

function resolveIncludeGlobs(baseFile: string, pattern: string): string[] {
  const baseDir = path.dirname(baseFile);
  const expanded = expandTilde(pattern);
  const absPattern = path.isAbsolute(expanded) ? expanded : path.join(baseDir, expanded);
  return fg.sync(absPattern, { dot: true, onlyFiles: true });
}

/**
 * Collect files in parse order:
 * - start with primary
 * - whenever "Include <glob...>" occurs, splice the matched files at that point
 * - recursion limited to MAX_DEPTH and MAX_INCLUDE_FILES
 */
export function collectConfigFiles(primaryPath: string): { ordered: string[]; errors: string[] } {
  const errors: string[] = [];
  const ordered: string[] = [];

  function walk(file: string, depth: number) {
    if (depth > MAX_DEPTH) { errors.push(`Include depth exceeded at ${file}`); return; }
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) { errors.push(`Missing file: ${abs}`); return; }
    const lines = readLines(abs);
    ordered.push(abs);

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = /^Include\s+(.+)$/.exec(line);
      if (!m) continue;

      const patterns = m[1].split(/\s+/);
      for (const p of patterns) {
        const matches = resolveIncludeGlobs(abs, p);
        if (matches.length === 0) errors.push(`Include matched no files at ${abs}:${i + 1} -> ${p}`);
        for (const inc of matches) {
          if (ordered.length > MAX_INCLUDE_FILES) {
            errors.push(`Include file cap ${MAX_INCLUDE_FILES} exceeded; stopping at ${inc}`);
            return;
          }
          walk(inc, depth + 1);
        }
      }
    }
  }

  walk(expandTilde(primaryPath), 1);
  return { ordered, errors };
}

/**
 * Very small Host-block parser for list/provenance UI.
 * We do NOT resolve final semantics here; ssh -G remains the source of truth.
 */
export function parseHosts(filesInOrder: string[]): LoadResult {
  const hosts: SshHostPattern[] = [];
  const errors: string[] = [];
  for (const file of filesInOrder) {
    const lines = readLines(file);
    let inHost = false;
    let current: SshHostPattern | null = null;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const hostMatch = /^Host\s+(.+)$/.exec(trimmed);
      if (hostMatch) {
        inHost = true;
        current = {
          pattern: hostMatch[1].trim(),
          tokens: hostMatch[1].trim().split(/\s+/),
          file,
          line: i + 1,
          options: [],
        };
        hosts.push(current);
        continue;
      }

      const matchMatch = /^Match\s+(.+)$/.exec(trimmed);
      if (matchMatch) {
        // We do not model Match blocks; ssh -G will handle. End any Host.
        inHost = false;
        current = null;
        continue;
      }

      const includeMatch = /^Include\s+(.+)$/.exec(trimmed);
      if (includeMatch) continue; // handled in collect step

      // key value lines (within Host)
      if (inHost && current) {
        const kv = /^([A-Za-z][A-Za-z0-9]+)\s+(.*)$/.exec(trimmed);
        if (kv) {
          current.options.push({
            key: kv[1],
            value: kv[2],
            file,
            line: i + 1,
          });
        } else {
          // tolerate weird lines but report
          errors.push(`Unparsed line at ${file}:${i + 1} -> "${trimmed}"`);
        }
      }
    }
  }
  return { files: filesInOrder, hosts, errors };
}

export function loadConfig(primaryPath: string): LoadResult {
  const { ordered, errors: e1 } = collectConfigFiles(primaryPath);
  const { hosts, errors: e2 } = parseHosts(ordered);
  return { files: ordered, hosts, errors: [...e1, ...e2] };
}
