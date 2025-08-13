import { ipcMain } from "electron";
import { spawn, IPty } from "node-pty";
import os from "node:os";
import {
  Channels,
  TerminalStartRequest,
  TerminalWriteRequest,
  TerminalResizeRequest,
  TerminalKillRequest,
} from "./channels";

const terms = new Map<number, IPty>();

ipcMain.handle(Channels.TERMINAL_START, (evt, req: TerminalStartRequest) => {
  const shell = req.shell ?? (process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "bash");
  const pty = spawn(shell, [], {
    name: "xterm-color",
    cols: req.cols,
    rows: req.rows,
    cwd: req.cwd ?? os.homedir(),
    env: process.env,
  });
  terms.set(pty.pid, pty);
  pty.onData((data) => {
    evt.sender.send(`terminal:data:${pty.pid}`, data);
  });
  pty.onExit(() => {
    evt.sender.send(`terminal:exit:${pty.pid}`);
    terms.delete(pty.pid);
  });
  return { pid: pty.pid };
});

ipcMain.handle(Channels.TERMINAL_WRITE, (_evt, req: TerminalWriteRequest) => {
  const term = terms.get(req.pid);
  if (term) term.write(req.data);
  return true;
});

ipcMain.handle(Channels.TERMINAL_RESIZE, (_evt, req: TerminalResizeRequest) => {
  const term = terms.get(req.pid);
  if (term) term.resize(req.cols, req.rows);
  return true;
});

ipcMain.handle(Channels.TERMINAL_KILL, (_evt, req: TerminalKillRequest) => {
  const term = terms.get(req.pid);
  if (term) {
    try { term.kill(); } catch {}
    terms.delete(req.pid);
  }
  return true;
});
