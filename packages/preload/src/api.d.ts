export {};

declare global {
  interface Window {
    api: {
      terminal: {
        start(req: { cwd?: string; shell?: string; cols: number; rows: number }): Promise<{ pid: number }>,
        write(pid: number, data: string): Promise<any>,
        resize(pid: number, cols: number, rows: number): Promise<any>,
        kill(pid: number): Promise<any>,
        onData(pid: number, cb: (chunk: string) => void): () => void,
        onExit(pid: number, cb: () => void): () => void,
      }
    }
  }
}
