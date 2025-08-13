// apps/desktop/src/renderer/screens/Connections/ConnectionDetails.tsx
import React, { useEffect, useState } from "react";

type Eff = {
  ok: boolean;
  map?: Record<string,string>;
  raw?: string;
  version?: string;
  error?: string;
  overridesApplied?: boolean;
  overrides?: Record<string,string>;
};

export default function ConnectionDetails({ alias }: { alias?: string }) {
  const [data, setData] = useState<Eff | null>(null);
  const [override, setOverride] = useState<{ enabled: boolean; values: Record<string,string> }>({ enabled: false, values: {} });

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!alias) { setData(null); return; }
      const [eff, ov] = await Promise.all([window.ssh.effective(alias), window.ssh.getOverride(alias)]);
      if (!mounted) return;
      setData(eff);
      setOverride(ov);
    }
    run(); return () => { mounted = false; };
  }, [alias]);

  if (!alias) return <div className="p-4 text-gray-500">Select a connection</div>;
  if (!data) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{alias}</h2>
        <div className="text-sm text-gray-500">{data.version}</div>
      </div>

      {!data.ok && <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700">
        ssh -G failed: {data.error}
      </div>}

      {data.ok && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.map || {}).map(([k, v]) => (
              <div key={k} className="border rounded p-2">
                <div className="text-xs text-gray-500">{k}</div>
                <div className="font-mono break-all">{v}</div>
              </div>
            ))}
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer">Raw (ssh -G)</summary>
            <pre className="bg-gray-50 border p-2 rounded overflow-auto max-h-64">{data.raw}</pre>
          </details>

          <div className="mt-4 border-t pt-3">
            <div className="flex items-center gap-2">
              <input
                id="ov-enabled"
                type="checkbox"
                checked={override.enabled}
                onChange={(e) => {
                  const en = e.target.checked;
                  const payload = { ...override, enabled: en };
                  setOverride(payload);
                  window.ssh.setOverride(alias!, payload).then(() => window.ssh.effective(alias!).then(setData));
                }}
              />
              <label htmlFor="ov-enabled" className="font-medium">Enable Overrides (app-side, not saved to SSH files)</label>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 opacity-90">
              {["Port","ProxyJump","IdentityFile","StrictHostKeyChecking","ServerAliveInterval","ServerAliveCountMax","ConnectTimeout"].map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <label className="w-48 text-sm">{k}</label>
                  <input
                    className="flex-1 border rounded px-2 py-1"
                    value={override.values[k] ?? ""}
                    placeholder="(empty = no override)"
                    onChange={(e) => {
                      const values = { ...override.values, [k]: e.target.value };
                      if (!e.target.value) delete values[k];
                      const payload = { ...override, values };
                      setOverride(payload);
                    }}
                    onBlur={() => window.ssh.setOverride(alias!, override).then(() => window.ssh.effective(alias!).then(setData))}
                  />
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500 mt-2">
              {data.overridesApplied ? "Overrides applied to ssh -G result." : "Overrides disabled (Strict Source Mode)."}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
