export const Channels = {
  TERMINAL_START: "terminal:start",
  TERMINAL_WRITE: "terminal:write",
  TERMINAL_RESIZE: "terminal:resize",
  TERMINAL_KILL: "terminal:kill",
} as const;

export type TerminalStartRequest = { cwd?: string; shell?: string; cols: number; rows: number };
export type TerminalStartResponse = { pid: number };
export type TerminalWriteRequest = { data: string; pid: number };
export type TerminalResizeRequest = { pid: number; cols: number; rows: number };
export type TerminalKillRequest = { pid: number };
