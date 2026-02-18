import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Quicklink, QuicklinkFormData } from "../types";

export function isWebQuicklinkTarget(value: string): boolean {
  const target = value.trim().toLowerCase();
  return target.startsWith("http://") || target.startsWith("https://");
}

export function isFileQuicklinkTarget(value: string): boolean {
  const target = value.trim();
  return target.length > 0 && !isWebQuicklinkTarget(target);
}

type DialogOpenResult = string | string[] | null;

async function openSystemPathPicker(options: {
  directory: boolean;
  title: string;
}): Promise<string | null> {
  if (!isTauri()) {
    throw new Error("Not running in Tauri");
  }

  const result = await invoke<DialogOpenResult>("plugin:dialog|open", {
    options: {
      directory: options.directory,
      multiple: false,
      title: options.title,
    },
  });

  if (Array.isArray(result)) {
    return result[0] ?? null;
  }

  return result;
}

export async function pickQuicklinkFilePath(): Promise<string | null> {
  return openSystemPathPicker({
    directory: false,
    title: "Select File",
  });
}

export async function pickQuicklinkFolderPath(): Promise<string | null> {
  return openSystemPathPicker({
    directory: true,
    title: "Select Folder",
  });
}

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
