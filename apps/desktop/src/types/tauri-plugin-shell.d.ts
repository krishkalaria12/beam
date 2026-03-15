declare module "@tauri-apps/plugin-shell" {
  export function open(path: string, openWith?: string): Promise<void>;
}
