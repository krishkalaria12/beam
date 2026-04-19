import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

const fileSearchBackendStatusSchema = z.object({
  backend: z.string().default("native"),
  dsearch_available: z.boolean().default(false),
  install_url: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }

      return value.length > 0 ? value : null;
    }),
});

export type FileSearchBackendStatus = z.infer<typeof fileSearchBackendStatusSchema>;

function defaultStatus(): FileSearchBackendStatus {
  return {
    backend: "native",
    dsearch_available: false,
    install_url: null,
  };
}

export async function getFileSearchBackendStatus(): Promise<FileSearchBackendStatus> {
  if (!isTauri()) {
    return defaultStatus();
  }

  const result = await invoke<unknown>("get_file_search_backend_status");
  const parsed = fileSearchBackendStatusSchema.safeParse(result);
  if (!parsed.success) {
    return defaultStatus();
  }

  return parsed.data;
}
