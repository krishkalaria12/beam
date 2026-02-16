import { invoke } from "@tauri-apps/api/core";
import type { PaginatedSearchResponse, SearchRequest } from "../types";

export async function searchFiles(request: SearchRequest): Promise<PaginatedSearchResponse> {
  return await invoke("search_files", { request });
}
