import { invokeCommand } from "./rpc";

type FileEntry = {
  path: string;
  name: string;
  size: number;
  modified: number;
};

type SearchResponse = {
  results?: Array<{
    entry?: {
      path?: unknown;
      name?: unknown;
      size?: unknown;
      modified?: unknown;
    };
  }>;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export const FileSearch = {
  async search(query: string, options?: { page?: number; perPage?: number }): Promise<FileEntry[]> {
    const page =
      typeof options?.page === "number" && options.page > 0 ? Math.floor(options.page) : 1;
    const perPage =
      typeof options?.perPage === "number" && options.perPage > 0
        ? Math.floor(options.perPage)
        : 20;

    const response = await invokeCommand<SearchResponse>("search_files", {
      request: {
        query,
        page,
        per_page: perPage,
      },
    });

    const results = response?.results ?? [];
    return results.map((result) => ({
      path: asString(result.entry?.path),
      name: asString(result.entry?.name),
      size: asNumber(result.entry?.size),
      modified: asNumber(result.entry?.modified),
    }));
  },
};
