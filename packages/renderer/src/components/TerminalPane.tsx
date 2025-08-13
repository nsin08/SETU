import React, { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";


export default function TerminalPane() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const pidRef = useRef<number | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const unsubExitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      fontSize: 13,
      theme: { background: "#0b0f19" }
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    (async () => {
      const cols = term.cols || 80;
      const rows = term.rows || 24;
      const { pid } = await window.api.terminal.start({ cols, rows });
      pidRef.current = pid;

      unsubRef.current = window.api.terminal.onData(pid, (chunk) => {
        term.write(chunk);
      });
      unsubExitRef.current = window.api.terminal.onExit(pid, () => {
        term.writeln("\r\n[process exited]\r\n");
      });

      term.onData((data) => {
        if (pidRef.current != null) window.api.terminal.write(pidRef.current, data);
      });
    })();

    const onResize = () => {
      if (fitRef.current) {
        fitRef.current.fit();
        const p = pidRef.current;
        if (p != null && termRef.current) {
          window.api.terminal.resize(p, termRef.current.cols, termRef.current.rows);
        }
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      unsubRef.current?.();
      unsubExitRef.current?.();
      const p = pidRef.current;
      if (p != null) window.api.terminal.kill(p);
      term.dispose();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
