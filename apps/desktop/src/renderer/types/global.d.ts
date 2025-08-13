// apps/desktop/src/renderer/types/global.d.ts
export {};

declare global {
  interface Window {
    ssh: {
      getPrefs(): Promise<{ strictSourceMode: boolean; configPath: string; overrides: any }>;
      setConfigPath(p: string): Promise<void>;
      setStrictMode(b: boolean): Promise<void>;
      list(): Promise<{ hosts: any[]; files: string[]; errors: string[] }>;
      effective(alias: string): Promise<{
        ok: boolean;
        map?: Record<string,string>;
        raw?: string;
        version?: string;
        error?: string;
        overridesApplied?: boolean;
        overrides?: Record<string,string>;
      }>;
      getOverride(alias: string): Promise<{ enabled: boolean; values: Record<string,string> }>;
      setOverride(alias: string, payload: { enabled: boolean; values: Record<string,string> }): Promise<{ enabled: boolean; values: Record<string,string> }>;
      onConfigUpdated(cb: () => void): () => void;
    };
  }
}
