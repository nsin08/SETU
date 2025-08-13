# Phase 2 — SSH config parsing & effective settings

This drop contains the new backend + renderer modules and a helper script.

## Install deps
```bash
pnpm add -w execa chokidar fast-glob electron-store zod
pnpm add -w -D @types/node
```

## Files layout
- apps/desktop/src/main/ssh/config-loader.ts
- apps/desktop/src/main/ssh/effective.ts
- apps/desktop/src/main/ssh/index.ts
- apps/desktop/src/main/preload-ssh.ts
- apps/desktop/src/renderer/types/global.d.ts
- apps/desktop/src/renderer/state/sshConfig.store.ts
- apps/desktop/src/renderer/screens/Connections/ConnectionsList.tsx
- apps/desktop/src/renderer/screens/Connections/ConnectionDetails.tsx
- apps/desktop/src/renderer/screens/Connections/index.tsx
- scripts/ssh-pick.sh

## Wire-up steps

1) **Main process** — register IPC
```ts
// apps/desktop/src/main/index.ts (or your bootstrap)
import { registerSshIpc } from "./ssh";
app.whenReady().then(() => {
  registerSshIpc();
  // ... your BrowserWindow creation ...
});
```

2) **Preload** — expose `window.ssh`
- If you already have a preload, either merge `preload-ssh.ts` into it
  or `import "./preload-ssh"` from your preload entry.
- Ensure your BrowserWindow uses the preload file.

3) **Renderer** — mount the screen
```tsx
// Example: add a route or a tab to show ConnectionsScreen
import ConnectionsScreen from "@/screens/Connections";
// <ConnectionsScreen />
```

4) **Strict Source Mode**
- Defaults to using `~/.ssh/my_ssh_config` only.
- Overrides are present but disabled by default. The UI checkbox toggles per-alias overrides,
  applied via `-o key=value` at runtime only (never written to disk).

5) **Helper CLI (optional)**
```bash
chmod +x scripts/ssh-pick.sh
./scripts/ssh-pick.sh
```
Uses: `CONFIG` env to select config, `SSH_OPTS` for ephemeral overrides.

## Notes
- `ssh -G` is used for authoritative effective settings.
- Includes are expanded for listing; `Match` blocks are not interpreted in parser but are honored by `ssh -G`.
- File watching with `chokidar` auto-refreshes the list when any config file changes.
