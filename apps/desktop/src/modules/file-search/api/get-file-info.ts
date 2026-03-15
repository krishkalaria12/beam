import { invoke } from "@tauri-apps/api/core";
import type { FileEntry } from "../types";

export async function getFileInfo(filePath: string): Promise<FileEntry> {
  return await invoke("get_file_info", { filePath });
}
