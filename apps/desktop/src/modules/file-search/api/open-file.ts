import { invoke } from "@tauri-apps/api/core";

export async function openFile(filePath: string): Promise<void> {
  await invoke("open_file", { filePath });
}
