import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

const applicationSchema = z.object({
  name: z.string().default("").transform((name) => name.trim()),
  description: z
    .string()
    .default("launch application")
    .transform((description) => description.trim()),
  exec_path: z.string().default("").transform((execPath) => execPath.trim()),
  icon: z.string().default("").transform((icon) => icon.trim()),
});

const applicationsSchema = z.array(applicationSchema);
export type Application = z.infer<typeof applicationSchema>;

const MAX_APPLICATIONS = 500;

function isTauriRuntime() {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

function normalizeApplications(applications: Application[]) {
  const dedupe = new Set<string>();
  const normalized: Application[] = [];

  for (const application of applications) {
    if (application.name.length === 0) {
      continue;
    }

    const description =
      application.description.length > 0 ? application.description : "launch application";

    const normalizedApplication = {
      ...application,
      description,
    };

    const key = `${normalizedApplication.name.toLowerCase()}::${normalizedApplication.exec_path.toLowerCase()}`;
    if (dedupe.has(key)) {
      continue;
    }

    dedupe.add(key);
    normalized.push(normalizedApplication);
  }

  return normalized
    .sort((first, second) => first.name.localeCompare(second.name))
    .slice(0, MAX_APPLICATIONS);
}

export async function getApplications() {
  if (!isTauriRuntime()) {
    return [];
  }

  const applications = await invoke<unknown>("get_applications");
  const parsedApplications = applicationsSchema.safeParse(applications);

  if (!parsedApplications.success) {
    throw new Error("invalid applications response from backend");
  }

  return normalizeApplications(parsedApplications.data);
}
