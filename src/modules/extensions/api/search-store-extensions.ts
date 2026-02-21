import {
  extensionStoreSearchResponseSchema,
  type ExtensionStoreListing,
} from "@/modules/extensions/types";

const RAYCAST_STORE_SEARCH_URL = "https://backend.raycast.com/api/v1/store_listings/search";
const DEFAULT_LIMIT = 8;

export async function searchStoreExtensions(
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<ExtensionStoreListing[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const params = new URLSearchParams({
    q: normalizedQuery,
    per_page: String(Math.max(1, Math.min(limit, 50))),
  });

  const response = await fetch(`${RAYCAST_STORE_SEARCH_URL}?${params.toString()}`);
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
