// apps/desktop/src/renderer/screens/Connections/ConnectionsList.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSshStore } from "../../state/sshConfig.store";

export default function ConnectionsList({ onPick }: { onPick: (alias: string) => void }) {
  const { hosts, reload } = useSshStore();
  const [q, setQ] = useState("");

  useEffect(() => {
    reload();
    const off = window.ssh.onConfigUpdated(() => reload());
    return () => off();
  }, [reload]);

  const rows = useMemo(() => {
    const allTokens = hosts.flatMap(h => h.tokens);
    const uniq = Array.from(new Set(allTokens));
    if (!q) return uniq;
    return uniq.filter(t => t.toLowerCase().includes(q.toLowerCase()));
  }, [hosts, q]);

  return (
    <div className="p-3 space-y-2">
      <input
        placeholder="Search alias/token…"
        className="w-full border rounded px-2 py-1"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="max-h-[70vh] overflow-auto divide-y">
        {rows.map((alias) => (
          <div key={alias} className="py-2 cursor-pointer hover:bg-gray-100 rounded px-2" onClick={() => onPick(alias)}>
            {alias}
          </div>
        ))}
      </div>
    </div>
  );
}
