import { invoke, isTauri } from "@tauri-apps/api/core";
import { parseExtensionStoreSearchResult } from "@beam/extension-protocol";

import type { ExtensionStoreListing } from "@/modules/extensions/types";
import {
  EXTENSIONS_STORE_SEARCH_DEFAULT_LIMIT,
  EXTENSIONS_STORE_SEARCH_MAX_LIMIT,
} from "@/modules/extensions/constants";

export async function searchStoreExtensions(
  query: string,
  limit = EXTENSIONS_STORE_SEARCH_DEFAULT_LIMIT,
): Promise<ExtensionStoreListing[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  if (!isTauri()) {
    return [];
  }

  const body = await invoke<unknown>("search_extension_store", {
    query: normalizedQuery,
    limit: Math.max(1, Math.min(limit, EXTENSIONS_STORE_SEARCH_MAX_LIMIT)),
  });
  const parsed = parseExtensionStoreSearchResult(body);
  if (!parsed) {
    throw new Error("invalid store search response");
  }

  return parsed;
}
