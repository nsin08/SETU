// Phase 2: Replace with real SSH service (e.g., ssh2, agent-forwarding, etc.)
export const sshService = {
  connect: async () => { throw new Error("SSH not implemented in Phase 1"); }
};
