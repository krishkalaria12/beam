import { z } from "zod";

const rawSnippetContentTypeSchema = z.union([
  z.literal("Text"),
  z.literal("Markdown"),
  z.literal("Code"),
  z.literal("text"),
  z.literal("markdown"),
  z.literal("code"),
]);

export const snippetContentTypeSchema = rawSnippetContentTypeSchema.transform((value) => {
  const normalized = value.toLowerCase();
  if (normalized === "markdown") {
    return "Markdown" as const;
  }
  if (normalized === "code") {
    return "Code" as const;
  }
  return "Text" as const;
});

export const snippetSchema = z.object({
  id: z.string(),
  name: z.string(),
  trigger: z.string(),
  template: z.string(),
  content_type: snippetContentTypeSchema,
  word_count: z.number(),
  copied_count: z.number(),
  tags: z.array(z.string()),
  enabled: z.boolean(),
  case_sensitive: z.boolean(),
  word_boundary: z.boolean(),
  use_count: z.number(),
  last_used_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const snippetListSchema = z.array(snippetSchema);

export const triggerModeSchema = z.union([z.literal("delimiter"), z.literal("instant")]);

export const snippetRuntimeSettingsSchema = z.object({
  enabled: z.boolean(),
  trigger_mode: triggerModeSchema,
  cooldown_ms: z.number(),
  max_buffer_len: z.number(),
});

export type SnippetContentType = z.infer<typeof snippetContentTypeSchema>;
export type TriggerMode = z.infer<typeof triggerModeSchema>;
export type Snippet = z.infer<typeof snippetSchema>;
export type SnippetRuntimeSettings = z.infer<typeof snippetRuntimeSettingsSchema>;

export interface CreateSnippetInput {
  name: string;
  trigger: string;
  template: string;
  tags?: string[];
  contentType?: SnippetContentType;
  enabled?: boolean;
  caseSensitive?: boolean;
  wordBoundary?: boolean;
  instantExpand?: boolean;
}

export interface UpdateSnippetInput {
  id: string;
  name?: string;
  trigger?: string;
  template?: string;
  tags?: string[];
  contentType?: SnippetContentType;
  enabled?: boolean;
  caseSensitive?: boolean;
  wordBoundary?: boolean;
  instantExpand?: boolean;
}

export interface UpdateSnippetRuntimeSettingsInput {
  enabled?: boolean;
  triggerMode?: TriggerMode;
  cooldownMs?: number;
  maxBufferLen?: number;
}

export interface SnippetEditorDraft {
  name: string;
  trigger: string;
  template: string;
  tags: string[];
  contentType: SnippetContentType;
  enabled: boolean;
  caseSensitive: boolean;
  wordBoundary: boolean;
  instantExpand: boolean;
}
