import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

const applicationSchema = z.object({
  app_id: z
    .string()
    .default("")
    .transform((appId) => appId.trim()),
  name: z
    .string()
    .default("")
    .transform((name) => name.trim()),
  description: z
    .string()
    .default("launch application")
    .transform((description) => description.trim()),
  exec_path: z
    .string()
    .default("")
    .transform((execPath) => execPath.trim()),
  icon: z
    .string()
    .default("")
    .transform((icon) => icon.trim()),
  desktop_file_path: z
    .string()
    .default("")
    .transform((desktopFilePath) => desktopFilePath.trim()),
});

const applicationsSchema = z.array(applicationSchema);

export type Application = z.infer<typeof applicationSchema>;

function isTauriRuntime() {
  return (
    typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

export async function searchApplications(query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery || !isTauriRuntime()) {
    return [];
  }

  const applications = await invoke<unknown>("search_applications", {
    query: normalizedQuery,
  });

  const parsedApplications = applicationsSchema.safeParse(applications);
  if (!parsedApplications.success) {
    throw new Error("invalid application search response from backend");
  }

  return parsedApplications.data;
}
