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
  title: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  data: z.array(preferenceDataSchema).optional(),
  label: z.string().optional(),
});

export const pluginInfoSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  pluginTitle: z.string(),
  pluginName: z.string(),
  commandName: z.string(),
  pluginPath: z.string(),
  icon: z.string().optional(),
  preferences: z.array(preferenceSchema).optional(),
  commandPreferences: z.array(preferenceSchema).optional(),
  mode: z.string().optional(),
  author: authorSchema.optional(),
  owner: z.string().optional(),
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
  author: z.object({
    handle: z.string(),
    name: z.string().optional(),
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
