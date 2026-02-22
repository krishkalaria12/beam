import { z } from "zod";

export const authorSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
  }),
]);

export const preferenceDataSchema = z.object({
  title: z.string(),
  value: z.string(),
});

export const preferenceSchema = z.object({
  name: z.string(),
  type: z.string(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  required: z.boolean().nullish(),
  default: z.unknown().nullish(),
  data: z.array(preferenceDataSchema).nullish(),
  label: z.string().nullish(),
});

export const pluginInfoSchema = z.object({
  title: z.string(),
  description: z.string().nullish(),
  pluginTitle: z.string(),
  pluginName: z.string(),
  commandName: z.string(),
  pluginPath: z.string(),
  icon: z.string().nullish(),
  preferences: z.array(preferenceSchema).nullish(),
  commandPreferences: z.array(preferenceSchema).nullish(),
  mode: z.string().nullish(),
  author: authorSchema.nullish(),
  owner: z.string().nullish(),
});

export const pluginListSchema = z.array(pluginInfoSchema);

export const heuristicViolationSchema = z.object({
  commandName: z.string(),
  reason: z.string(),
});

export const installResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
  }),
  z.object({
    status: z.literal("requiresConfirmation"),
    violations: z.array(heuristicViolationSchema),
  }),
]);

export const extensionStoreListingSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  description: z.string().default(""),
  download_url: z.string().url(),
  icons: z
    .object({
      light: z.string().nullish(),
      dark: z.string().nullish(),
    })
    .nullish(),
  author: z.object({
    handle: z.string(),
    name: z.string().optional(),
    avatar: z.string().nullish().optional(),
  }),
});

export const extensionStoreSearchResponseSchema = z.object({
  data: z.array(extensionStoreListingSchema),
});

export type Author = z.infer<typeof authorSchema>;
export type Preference = z.infer<typeof preferenceSchema>;
export type PluginInfo = z.infer<typeof pluginInfoSchema>;
export type HeuristicViolation = z.infer<typeof heuristicViolationSchema>;
export type InstallResult = z.infer<typeof installResultSchema>;
export type ExtensionStoreListing = z.infer<typeof extensionStoreListingSchema>;

export interface InstallExtensionInput {
  downloadUrl: string;
  slug: string;
  force?: boolean;
}

export type ExtensionPreferenceFieldType =
  | "textfield"
  | "password"
  | "dropdown"
  | "checkbox"
  | "textarea";

export interface ExtensionPreferenceOption {
  title: string;
  value: string;
}

export interface ExtensionPreferenceField {
  name: string;
  type: ExtensionPreferenceFieldType;
  title: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
  options: ExtensionPreferenceOption[];
}

export interface InstalledExtensionSummary {
  id: string;
  slug: string;
  title: string;
  owner: string;
  description: string;
  commandCount: number;
  icon: string | null;
  pluginName: string | null;
  preferences: ExtensionPreferenceField[];
}

export interface ExtensionStoreSearchCacheEntry {
  updatedAtMs: number;
  results: ExtensionStoreListing[];
}
