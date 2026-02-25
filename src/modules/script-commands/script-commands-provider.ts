import type { CommandDescriptor, CommandProvider } from "@/command-registry/types";
import { getScriptCommands } from "@/modules/script-commands/api/get-script-commands";
import {
  SCRIPT_COMMANDS_PROVIDER_CACHE_TTL_MS,
  SCRIPT_COMMANDS_PROVIDER_SCOPE,
  SCRIPT_COMMANDS_RUN_EXTENSION_COMMAND_ID,
} from "@/modules/script-commands/constants";
import type { ScriptCommandSummary } from "@/modules/script-commands/types";

const INTERNAL_EXTENSION_ID = "beam.internal";

let cachedScripts: ScriptCommandSummary[] = [];
let cacheUpdatedAt = 0;
let inflightScriptsPromise: Promise<ScriptCommandSummary[]> | null = null;

function nowMs(): number {
  if (
    typeof globalThis.performance !== "undefined" &&
    typeof globalThis.performance.now === "function"
  ) {
    return globalThis.performance.now();
  }

  return Date.now();
}

export function invalidateScriptCommandsProviderCache() {
  cachedScripts = [];
  cacheUpdatedAt = 0;
  inflightScriptsPromise = null;
}

function createScriptRunCommandId(scriptId: string): string {
  const normalized = scriptId.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "-");
  return `script_commands.run.${normalized || "script"}`;
}

function matchScript(script: ScriptCommandSummary, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return false;
  }

  const haystack = [
    script.title,
    script.scriptName,
    script.subtitle,
    script.scriptExtension ?? "",
    "script",
    "terminal",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function toScriptDescriptor(script: ScriptCommandSummary): CommandDescriptor {
  return {
    id: createScriptRunCommandId(script.id),
    title: script.title,
    subtitle: script.scriptName,
    keywords: [
      "script",
      "run script",
      script.title,
      script.scriptName,
      script.subtitle,
      script.scriptExtension ?? "",
    ]
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
    endText: "script",
    icon: "terminal",
    kind: "provider-item",
    scope: SCRIPT_COMMANDS_PROVIDER_SCOPE,
    requiresQuery: true,
    priority: 28,
    action: {
      type: "CUSTOM",
      payload: {
        extensionId: INTERNAL_EXTENSION_ID,
        extensionCommandId: SCRIPT_COMMANDS_RUN_EXTENSION_COMMAND_ID,
        scriptCommandId: script.id,
        scriptCommandTitle: script.title,
        sandbox: {
          allowOpenUrl: false,
          allowReadQuery: false,
        },
      },
    },
  };
}

async function loadScripts(): Promise<ScriptCommandSummary[]> {
  const now = nowMs();
  if (cachedScripts.length > 0 && now - cacheUpdatedAt < SCRIPT_COMMANDS_PROVIDER_CACHE_TTL_MS) {
    return cachedScripts;
  }

  if (inflightScriptsPromise) {
    return inflightScriptsPromise;
  }

  inflightScriptsPromise = getScriptCommands()
    .then((scripts) => {
      cachedScripts = scripts;
      cacheUpdatedAt = nowMs();
      return scripts;
    })
    .finally(() => {
      inflightScriptsPromise = null;
    });

  return inflightScriptsPromise;
}

export function createScriptCommandsProvider(): CommandProvider {
  return {
    id: "script-commands-provider",
    scope: SCRIPT_COMMANDS_PROVIDER_SCOPE,
    async provide({ context, signal }) {
      const normalizedQuery = context.query.trim().toLowerCase();
      if (!normalizedQuery || signal.aborted || !context.isDesktopRuntime) {
        return [];
      }

      const scripts = await loadScripts();
      if (signal.aborted) {
        return [];
      }

      return scripts
        .filter((script) => matchScript(script, normalizedQuery))
        .map((script) => toScriptDescriptor(script));
    },
  };
}
