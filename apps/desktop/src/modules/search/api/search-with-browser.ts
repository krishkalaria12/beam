import { invoke } from "@tauri-apps/api/core";

type SearchSite = "google" | "duckduckgo";

type SearchPayload = {
  site: SearchSite;
  query: string;
};

function isTauriRuntime() {
  return (
    typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

export async function searchWithBrowser({ site, query }: SearchPayload) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    throw new Error("search query is missing");
  }

  if (!isTauriRuntime()) {
    throw new Error("desktop runtime is required");
  }

  await invoke("search_with_browser", {
    site,
    query: normalizedQuery,
  });
}
