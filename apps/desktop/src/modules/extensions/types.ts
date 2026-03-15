import { z } from "zod";
import type {
  DiscoveredPluginRecord as PluginInfo,
  ExtensionAuthor as Author,
  ExtensionPreference as Preference,
  ExtensionStoreListingRecord,
  ExtensionStoreUpdateRecord,
} from "@beam/extension-protocol";

export type { Author, Preference, PluginInfo };

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

export type HeuristicViolation = z.infer<typeof heuristicViolationSchema>;
export type InstallResult = z.infer<typeof installResultSchema>;
export type ExtensionStoreListing = ExtensionStoreListingRecord;
export type ExtensionStoreUpdate = ExtensionStoreUpdateRecord;

export interface InstallExtensionInput {
  packageId: string;
  slug: string;
  releaseVersion?: string;
  channel?: string;
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
  version: string | null;
  commandCount: number;
  icon: string | null;
  pluginName: string | null;
  preferences: ExtensionPreferenceField[];
}

export interface ExtensionStoreSearchCacheEntry {
  updatedAtMs: number;
  results: ExtensionStoreListing[];
}
