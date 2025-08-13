// apps/desktop/src/renderer/state/sshConfig.store.ts
import { create } from "zustand";

type HostPattern = {
  pattern: string;
  tokens: string[];
  file: string;
  line: number;
  options: Array<{ key: string; value: string; file: string; line: number }>;
};

type State = {
  loading: boolean;
  hosts: HostPattern[];
  files: string[];
  errors: string[];
  selected?: string; // alias the user typed/clicked
  reload: () => Promise<void>;
  select: (alias: string) => void;
};

export const useSshStore = create<State>((set) => ({
  loading: true,
  hosts: [],
  files: [],
  errors: [],
  selected: undefined,
  reload: async () => {
    set({ loading: true });
    const res = await window.ssh.list();
    set({ loading: false, hosts: res.hosts, files: res.files, errors: res.errors });
  },
  select: (alias: string) => set({ selected: alias }),
}));
