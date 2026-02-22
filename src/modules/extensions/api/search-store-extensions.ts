import {
  extensionStoreSearchResponseSchema,
  type ExtensionStoreListing,
} from "@/modules/extensions/types";
import {
  EXTENSIONS_STORE_SEARCH_DEFAULT_LIMIT,
  EXTENSIONS_STORE_SEARCH_MAX_LIMIT,
  EXTENSIONS_STORE_SEARCH_URL,
} from "@/modules/extensions/constants";

export async function searchStoreExtensions(
  query: string,
  limit = EXTENSIONS_STORE_SEARCH_DEFAULT_LIMIT,
): Promise<ExtensionStoreListing[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const params = new URLSearchParams({
    q: normalizedQuery,
    per_page: String(Math.max(1, Math.min(limit, EXTENSIONS_STORE_SEARCH_MAX_LIMIT))),
  });

  const response = await fetch(`${EXTENSIONS_STORE_SEARCH_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`store search failed with status ${response.status}`);
  }

  const body = await response.json();
  const parsed = extensionStoreSearchResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("invalid store search response");
  }

  return parsed.data.data;
}
