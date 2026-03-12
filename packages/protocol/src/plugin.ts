import { z } from "zod/v4";

export const GoBackToPluginListSchema = z.object({
  type: z.literal("go-back-to-plugin-list"),
  payload: z.object({}),
});
export type GoBackToPluginList = z.infer<typeof GoBackToPluginListSchema>;
