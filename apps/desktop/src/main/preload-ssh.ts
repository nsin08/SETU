// apps/desktop/src/main/preload-ssh.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ssh", {
  getPrefs: () => ipcRenderer.invoke("ssh:get-prefs"),
  setConfigPath: (p: string) => ipcRenderer.invoke("ssh:set-config-path", p),
  setStrictMode: (b: boolean) => ipcRenderer.invoke("ssh:set-strict-mode", b),

  list: () => ipcRenderer.invoke("ssh:list"),
  effective: (alias: string) => ipcRenderer.invoke("ssh:effective", alias),

  getOverride: (alias: string) => ipcRenderer.invoke("ssh:get-override", alias),
  setOverride: (alias: string, payload: { enabled: boolean; values: Record<string,string> }) =>
    ipcRenderer.invoke("ssh:set-override", alias, payload),

  onConfigUpdated: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on("ssh:config-updated", handler);
    return () => ipcRenderer.removeListener("ssh:config-updated", handler);
  },
});
