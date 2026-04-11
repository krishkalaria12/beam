import { invoke, isTauri } from "@tauri-apps/api/core";

import {
  snippetListSchema,
  snippetRuntimeSettingsSchema,
  snippetSchema,
  type CreateSnippetInput,
  type Snippet,
  type SnippetContentType,
  type SnippetRuntimeSettings,
  type UpdateSnippetInput,
  type UpdateSnippetRuntimeSettingsInput,
} from "@/modules/snippets/types";

function assertDesktopRuntime() {
  if (!isTauri()) {
    throw new Error("Snippets commands require desktop runtime.");
  }
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

function toBackendContentType(value: SnippetContentType): "Text" | "Markdown" | "Code" {
  if (value === "Markdown") {
    return "Markdown";
  }
  if (value === "Code") {
    return "Code";
  }
  return "Text";
}

function parseSnippet(input: unknown): Snippet {
  const parsed = snippetSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid snippet response from backend.");
  }
  return parsed.data;
}

export async function getSnippets(): Promise<Snippet[]> {
  if (!isTauri()) {
    return [];
  }

  const response = await invoke<unknown>("get_snippets");
  const parsed = snippetListSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Invalid snippet list response from backend.");
  }

  return parsed.data;
}

async function getSnippetById(id: string): Promise<Snippet | null> {
  assertDesktopRuntime();

  const snippetId = normalizeRequiredText(id, "snippet id");
  const response = await invoke<unknown>("get_snippet_by_id", { id: snippetId });
  if (response == null) {
    return null;
  }

  return parseSnippet(response);
}

export async function createSnippet(input: CreateSnippetInput): Promise<Snippet> {
  assertDesktopRuntime();

  const payload = {
    name: normalizeRequiredText(input.name, "snippet name"),
    trigger: normalizeRequiredText(input.trigger, "snippet keyword"),
    template: normalizeRequiredText(input.template, "snippet content"),
    ...(input.tags ? { tags: input.tags } : {}),
    ...(input.contentType ? { content_type: toBackendContentType(input.contentType) } : {}),
    ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
    ...(typeof input.caseSensitive === "boolean" ? { case_sensitive: input.caseSensitive } : {}),
    ...(typeof input.wordBoundary === "boolean" ? { word_boundary: input.wordBoundary } : {}),
    ...(typeof input.instantExpand === "boolean" ? { instant_expand: input.instantExpand } : {}),
  };

  const response = await invoke<unknown>("create_snippet", { payload });
  return parseSnippet(response);
}

export async function updateSnippet(input: UpdateSnippetInput): Promise<Snippet> {
  assertDesktopRuntime();

  const payload = {
    id: normalizeRequiredText(input.id, "snippet id"),
    ...(typeof input.name === "string"
      ? { name: normalizeRequiredText(input.name, "snippet name") }
      : {}),
    ...(typeof input.trigger === "string"
      ? { trigger: normalizeRequiredText(input.trigger, "snippet keyword") }
      : {}),
    ...(typeof input.template === "string"
      ? { template: normalizeRequiredText(input.template, "snippet content") }
      : {}),
    ...(input.tags ? { tags: input.tags } : {}),
    ...(input.contentType ? { content_type: toBackendContentType(input.contentType) } : {}),
    ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
    ...(typeof input.caseSensitive === "boolean" ? { case_sensitive: input.caseSensitive } : {}),
    ...(typeof input.wordBoundary === "boolean" ? { word_boundary: input.wordBoundary } : {}),
    ...(typeof input.instantExpand === "boolean" ? { instant_expand: input.instantExpand } : {}),
  };

  const response = await invoke<unknown>("update_snippet", { payload });
  return parseSnippet(response);
}

export async function deleteSnippet(id: string): Promise<void> {
  assertDesktopRuntime();

  const snippetId = normalizeRequiredText(id, "snippet id");
  await invoke("delete_snippet", { id: snippetId });
}

export async function setSnippetEnabled(id: string, enabled: boolean): Promise<Snippet> {
  assertDesktopRuntime();

  const payload = {
    id: normalizeRequiredText(id, "snippet id"),
    enabled,
  };

  const response = await invoke<unknown>("set_snippet_enabled", { payload });
  return parseSnippet(response);
}

export async function incrementSnippetCopiedCount(id: string): Promise<void> {
  assertDesktopRuntime();

  const snippetId = normalizeRequiredText(id, "snippet id");
  await invoke("increment_snippet_copied_count", { snippetId });
}

export async function pasteSnippet(id: string): Promise<void> {
  assertDesktopRuntime();

  const snippetId = normalizeRequiredText(id, "snippet id");
  await invoke("paste_snippet", { snippetId });
}

export async function getSnippetRuntimeSettings(): Promise<SnippetRuntimeSettings> {
  if (!isTauri()) {
    return {
      enabled: true,
      trigger_mode: "delimiter",
      cooldown_ms: 120,
      max_buffer_len: 96,
    };
  }

  const response = await invoke<unknown>("get_snippet_runtime_settings");
  const parsed = snippetRuntimeSettingsSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Invalid snippet runtime settings response from backend.");
  }

  return parsed.data;
}

export async function updateSnippetRuntimeSettings(
  input: UpdateSnippetRuntimeSettingsInput,
): Promise<void> {
  assertDesktopRuntime();

  const payload = {
    ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
    ...(input.triggerMode ? { trigger_mode: input.triggerMode } : {}),
    ...(typeof input.cooldownMs === "number" ? { cooldown_ms: input.cooldownMs } : {}),
    ...(typeof input.maxBufferLen === "number" ? { max_buffer_len: input.maxBufferLen } : {}),
  };

  await invoke("update_snippet_runtime_settings", { payload });
}
