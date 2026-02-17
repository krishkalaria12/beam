import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Quicklink, QuicklinkFormData } from "../types";

export async function getQuicklinks(): Promise<Quicklink[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<Quicklink[]>("get_quicklinks");
  return response;
}

export function findQuicklinkByKeyword(quicklinks: Quicklink[], keyword: string): Quicklink | undefined {
  return quicklinks.find((ql) => ql.keyword.toLowerCase() === keyword.toLowerCase());
}

export async function executeQuicklink(keyword: string, query: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("Not running in Tauri");
  }

  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) {
    throw new Error("keyword is required");
  }

  await invoke("execute_quicklink", {
    keyword: normalizedKeyword,
    query: query.trim(),
  });
}

export async function createQuicklink(data: QuicklinkFormData): Promise<void> {
  if (!isTauri()) {
    throw new Error("Not running in Tauri");
  }

  await invoke("create_quicklink", {
    quickLinkData: {
      name: data.name,
      keyword: data.keyword,
      url: data.url,
      icon: data.icon,
    },
  });
}

export async function updateQuicklink(
  keyword: string,
  data: QuicklinkFormData
): Promise<void> {
  if (!isTauri()) {
    throw new Error("Not running in Tauri");
  }

  await invoke("update_quicklink", {
    keyword,
    newQuicklink: {
      name: data.name,
      keyword: data.keyword,
      url: data.url,
      icon: data.icon,
    },
  });
}

export async function deleteQuicklink(keyword: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("Not running in Tauri");
  }

  await invoke("delete_quicklink", { keyword });
}

export async function getFaviconForUrl(url: string): Promise<string> {
  if (!isTauri()) {
    throw new Error("Not running in Tauri");
  }

  const response = await invoke<string>("get_favicon_for_url", { url });
  return response;
}
