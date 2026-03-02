import type {
  CommandDescriptor,
  CommandKind,
  CommandMode,
  CommandScope,
} from "@/command-registry/types";
import { isCommandMode, isCommandScope } from "@/command-registry/modes";

export interface ExtensionCommandSandboxMetadata {
  allowOpenUrl?: boolean;
  allowReadQuery?: boolean;
}

export interface ExtensionCommandExecutionMetadata {
  requiresDesktopRuntime?: boolean;
  allowedModes?: readonly CommandMode[];
}

export interface ExtensionCommandMetadata {
  extensionId: string;
  commandId: string;
  title: string;
  subtitle?: string;
  keywords?: readonly string[];
  endText?: string;
  icon?: string;
  kind?: Exclude<CommandKind, "provider-item">;
  scope?: readonly CommandScope[];
  requiresQuery?: boolean;
  priority?: number;
  hidden?: boolean;
  payload?: Record<string, unknown>;
  sandbox?: ExtensionCommandSandboxMetadata;
  execution?: ExtensionCommandExecutionMetadata;
}

function normalizeSegment(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeScope(input?: readonly CommandScope[]): readonly CommandScope[] {
  if (!input || input.length === 0) {
    return ["normal", "compressed"];
  }

  const valid = input.filter((scope) => isCommandScope(scope));

  return valid.length > 0 ? valid : ["normal", "compressed"];
}

function normalizeKeywords(title: string, keywords?: readonly string[]): readonly string[] {
  const all = new Set<string>();
  all.add(title);

  for (const keyword of keywords ?? []) {
    const cleaned = keyword.trim();
    if (cleaned.length > 0) {
      all.add(cleaned);
    }
  }

  return [...all];
}

export function toExtensionCommandDescriptor(
  metadata: ExtensionCommandMetadata,
): CommandDescriptor {
  const extensionSegment = normalizeSegment(metadata.extensionId);
  const commandSegment = normalizeSegment(metadata.commandId);

  if (!extensionSegment || !commandSegment) {
    throw new Error("Extension command metadata has invalid extension or command id.");
  }

  const title = metadata.title.trim();
  if (!title) {
    throw new Error("Extension command metadata requires a title.");
  }

  const allowedModes = metadata.execution?.allowedModes ?? [];
  const validAllowedModes = allowedModes.filter((mode) => isCommandMode(mode));

  return {
    id: `extension.${extensionSegment}.${commandSegment}`,
    title,
    subtitle: metadata.subtitle?.trim() || undefined,
    keywords: normalizeKeywords(title, metadata.keywords),
    endText: metadata.endText?.trim() || "extension",
    icon: metadata.icon?.trim() || "extension",
    kind: metadata.kind ?? "action",
    scope: normalizeScope(metadata.scope),
    requiresQuery: Boolean(metadata.requiresQuery),
    priority: metadata.priority,
    hidden: Boolean(metadata.hidden),
    action: {
      type: "CUSTOM",
      payload: {
        ...(metadata.payload ?? {}),
        extensionId: metadata.extensionId.trim(),
        extensionCommandId: metadata.commandId.trim(),
        requiresDesktopRuntime: Boolean(metadata.execution?.requiresDesktopRuntime),
        allowedModes: validAllowedModes,
        sandbox: {
          allowOpenUrl: Boolean(metadata.sandbox?.allowOpenUrl),
          allowReadQuery: metadata.sandbox?.allowReadQuery ?? true,
        },
      },
    },
  };
}

export function toExtensionCommandDescriptors(
  metadataList: readonly ExtensionCommandMetadata[],
): CommandDescriptor[] {
  return metadataList.map((entry) => toExtensionCommandDescriptor(entry));
}
