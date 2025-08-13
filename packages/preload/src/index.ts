import { contextBridge, ipcRenderer } from "electron";

const channels = {
  TERMINAL_START: "terminal:start",
  TERMINAL_WRITE: "terminal:write",
  TERMINAL_RESIZE: "terminal:resize",
  TERMINAL_KILL: "terminal:kill",
} as const;

type TerminalStartRequest = { cwd?: string; shell?: string; cols: number; rows: number };
type TerminalStartResponse = { pid: number };

const api = {
  terminal: {
    start: (req: TerminalStartRequest): Promise<TerminalStartResponse> => ipcRenderer.invoke(channels.TERMINAL_START, req),
    write: (pid: number, data: string) => ipcRenderer.invoke(channels.TERMINAL_WRITE, { pid, data }),
    resize: (pid: number, cols: number, rows: number) => ipcRenderer.invoke(channels.TERMINAL_RESIZE, { pid, cols, rows }),
    kill: (pid: number) => ipcRenderer.invoke(channels.TERMINAL_KILL, { pid }),
    onData: (pid: number, cb: (chunk: string) => void) => {
      const ch = `terminal:data:${pid}`;
      const listener = (_: any, data: string) => cb(data);
      ipcRenderer.on(ch, listener);
      return () => ipcRenderer.removeListener(ch, listener);
    },
    onExit: (pid: number, cb: () => void) => {
      const ch = `terminal:exit:${pid}`;
      const listener = () => cb();
      ipcRenderer.on(ch, listener);
      return () => ipcRenderer.removeListener(ch, listener);
    }
  }
} as const;

contextBridge.exposeInMainWorld("api", api);
