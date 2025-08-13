// apps/desktop/src/main/ssh/index.ts
import { ipcMain, BrowserWindow } from "electron";
import chokidar from "chokidar";
import path from "node:path";
import os from "node:os";
import Store from "electron-store";
import { loadConfig } from "./config-loader";
import { getEffective, defaultConfigPath, EffectiveResult } from "./effective";

type Overrides = { enabled: boolean; values: Record<string, string> };
type OverridesMap = Record<string, Overrides>;

type Prefs = {
  strictSourceMode: boolean;        // default true: only use ~/.ssh/my_ssh_config
  configPath: string;               // default ~/.ssh/my_ssh_config
  overrides: OverridesMap;          // per-alias overrides (disabled by default)
};

const schema = {
  strictSourceMode: { type: "boolean", default: true },
  configPath: { type: "string", default: path.join(os.homedir(), ".ssh", "my_ssh_config") },
  overrides: { type: "object", default: {} },
} as const;

const store = new Store<Prefs>({ name: "ssh-prefs", schema: schema as any });

function getPrefs(): Prefs {
  return {
    strictSourceMode: store.get("strictSourceMode", true),
    configPath: store.get("configPath", defaultConfigPath()),
    overrides: store.get("overrides", {}),
  };
}

let watcher: chokidar.FSWatcher | null = null;

export function registerSshIpc() {
  ipcMain.handle("ssh:get-prefs", () => getPrefs());
  ipcMain.handle("ssh:set-config-path", (_e, p: string) => {
    store.set("configPath", p);
    setupWatch();
  });
  ipcMain.handle("ssh:set-strict-mode", (_e, val: boolean) => store.set("strictSourceMode", val));

  ipcMain.handle("ssh:list", () => {
    const { configPath } = getPrefs();
    const { hosts, files, errors } = loadConfig(configPath);
    return { hosts, files, errors };
  });

  ipcMain.handle("ssh:effective", async (_e, alias: string) => {
    const { configPath, overrides } = getPrefs();
    const ov = overrides[alias];
    const applied = ov?.enabled ? ov.values : undefined;
    const res: EffectiveResult = await getEffective(alias, configPath, applied);
    return { ...res, overridesApplied: !!ov?.enabled, overrides: ov?.values || {} };
  });

  ipcMain.handle("ssh:get-override", (_e, alias: string) => {
    const { overrides } = getPrefs();
    return overrides[alias] || { enabled: false, values: {} };
  });

  ipcMain.handle("ssh:set-override", (_e, alias: string, payload: Overrides) => {
    const prefs = getPrefs();
    prefs.overrides[alias] = payload;
    store.set("overrides", prefs.overrides);
    return prefs.overrides[alias];
  });

  setupWatch();
}

function setupWatch() {
  const { configPath } = getPrefs();
  const files = loadConfig(configPath).files;
  watcher?.close().catch(() => {});
  watcher = chokidar.watch(files, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 } });
  watcher.on("all", (_evt) => {
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send("ssh:config-updated"));
  });
}
