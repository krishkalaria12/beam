import type { CommandDescriptor, CommandProvider } from "@/command-registry/types";
import { getTriggerSymbol, QUICKLINK_TRIGGER_MODE } from "@/command-registry/trigger-registry";
import { searchApplications } from "@/modules/applications/api/search-applications";
import { calculateExpression } from "@/modules/calculator/api/calculate-expression";
import { looksLikeCalculationQuery } from "@/modules/calculator/lib/query-match";
import { findQuicklinkByKeyword, getQuicklinks } from "@/modules/quicklinks/api/quicklinks";
import { createExtensionCommandProvider } from "@/modules/extensions/extension-command-provider";
import { createExtensionStoreProvider } from "@/modules/extensions/extension-store-provider";
import { createScriptCommandsProvider } from "@/modules/script-commands/script-commands-provider";

const PROVIDER_SCOPE: ReadonlyArray<"normal" | "compressed"> = ["normal", "compressed"];
const QUICKLINK_SCOPE: ReadonlyArray<typeof QUICKLINK_TRIGGER_MODE> = [QUICKLINK_TRIGGER_MODE];

export const INTERNAL_EXTENSION_ID = "beam.internal";
export const CALCULATOR_COPY_COMMAND_ID = "calculator.copy-result";
export const CALCULATOR_RESULT_COMMAND_ID = "calculator.result";
export const QUICKLINK_EXECUTE_COMMAND_ID = "quicklinks.execute";

function normalizeIdSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashText(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function toApplicationCommandId(name: string, execPath: string): string {
  const nameSegment = normalizeIdSegment(name) || "app";
  return `applications.open.${nameSegment}::${hashText(execPath)}`;
}

export function toQuicklinkExecuteCommandId(keyword: string): string {
  const normalizedKeyword = normalizeIdSegment(keyword);
  if (!normalizedKeyword) {
    return QUICKLINK_EXECUTE_COMMAND_ID;
  }

  return `${QUICKLINK_EXECUTE_COMMAND_ID}::${normalizedKeyword}`;
}

export function createQuicklinkExecuteCommandDescriptor(input: {
  keyword: string;
  query: string;
  name?: string;
}): CommandDescriptor {
  const normalizedKeyword = input.keyword.trim();
  const normalizedQuery = input.query.trim();
  const name = input.name?.trim() || normalizedKeyword;
  const quicklinkSymbol = getTriggerSymbol(QUICKLINK_TRIGGER_MODE) ?? "!";

  return {
    id: toQuicklinkExecuteCommandId(normalizedKeyword),
    title: `run ${quicklinkSymbol}${normalizedKeyword}`,
    subtitle: normalizedQuery.length > 0 ? `${name} -> ${normalizedQuery}` : name,
    keywords: [
      "quicklink",
      "run quicklink",
      `${quicklinkSymbol}${normalizedKeyword}`,
      normalizedKeyword,
      name,
      normalizedQuery,
    ].filter((entry) => entry.trim().length > 0),
    endText: "quicklink",
    icon: "quicklink-manage",
    kind: "provider-item",
    scope: QUICKLINK_SCOPE,
    priority: 72,
    action: {
      type: "CUSTOM",
      payload: {
        extensionId: INTERNAL_EXTENSION_ID,
        extensionCommandId: QUICKLINK_EXECUTE_COMMAND_ID,
        quicklinkKeyword: normalizedKeyword,
        sandbox: {
          allowOpenUrl: false,
          allowReadQuery: true,
        },
      },
    },
  };
}

export function buildApplicationTitle(name: string, execPath: string): string {
  const normalizedName = name.trim();
  if (normalizedName.length > 0) {
    return normalizedName;
  }

  const pathParts = execPath.split(/[\\/]/).filter(Boolean);
  return pathParts[pathParts.length - 1] ?? "Open Application";
}

function createApplicationsCommandProvider(): CommandProvider {
  return {
    id: "applications-provider",
    scope: PROVIDER_SCOPE,
    async provide({ context, signal }) {
      const query = context.query.trim();
      if (!query || signal.aborted) {
        return [];
      }

      const applications = await searchApplications(query);
      if (signal.aborted) {
        return [];
      }

      return applications
        .filter((application) => application.exec_path.length > 0)
        .map((application) => {
          const title = buildApplicationTitle(application.name, application.exec_path);
          const keywords = [title, application.description, application.exec_path].filter(
            (item) => item.trim().length > 0,
          );

          return {
            id: toApplicationCommandId(title, application.exec_path),
            title,
            subtitle: application.description || undefined,
            keywords,
            endText: "app",
            icon: application.icon ? `app-icon:${application.icon}` : "search",
            kind: "provider-item",
            scope: PROVIDER_SCOPE,
            requiresQuery: true,
            priority: 16,
            action: {
              type: "OPEN_APP",
              payload: {
                execPath: application.exec_path,
              },
            },
          };
        });
    },
  };
}

function createCalculatorCommandProvider(): CommandProvider {
  return {
    id: "calculator-provider",
    scope: PROVIDER_SCOPE,
    async provide({ context, signal }) {
      const normalizedQuery = context.query.replace(/\s+/g, " ").trim();
      if (!looksLikeCalculationQuery(normalizedQuery) || signal.aborted) {
        return [];
      }

      const result = await calculateExpression(normalizedQuery);
      if (!result || signal.aborted || result.status !== "valid") {
        return [];
      }

      const successfulOutputs = result.outputs
        .filter((entry) => !entry.is_error)
        .map((entry) => entry.value.trim())
        .filter((value) => value.length > 0);
      const outputValue = successfulOutputs[0] ?? "";
      if (!outputValue) {
        return [];
      }

      const expression = result.query.trim() || normalizedQuery;
      return [
        {
          id: CALCULATOR_RESULT_COMMAND_ID,
          title: outputValue,
          subtitle: expression,
          keywords: ["calculator", "calculate", "result", expression, outputValue],
          endText: "copy",
          icon: "calculator",
          kind: "provider-item",
          scope: PROVIDER_SCOPE,
          requiresQuery: true,
          priority: 48,
          action: {
            type: "CUSTOM",
            payload: {
              extensionId: INTERNAL_EXTENSION_ID,
              extensionCommandId: CALCULATOR_COPY_COMMAND_ID,
              sandbox: {
                allowOpenUrl: false,
                allowReadQuery: false,
              },
              calculatorQuery: expression,
              calculatorResult: outputValue,
            },
          },
        },
      ];
    },
  };
}

function createQuicklinkCommandProvider(): CommandProvider {
  return {
    id: "quicklinks-provider",
    scope: QUICKLINK_SCOPE,
    async provide({ context, signal }) {
      const keyword = context.quicklinkKeyword.trim();
      if (!keyword || signal.aborted) {
        return [];
      }

      const quicklinks = await getQuicklinks();
      if (signal.aborted) {
        return [];
      }

      const quicklink = findQuicklinkByKeyword(quicklinks, keyword);
      if (!quicklink) {
        return [];
      }

      return [
        createQuicklinkExecuteCommandDescriptor({
          keyword: quicklink.keyword,
          query: context.query,
          name: quicklink.name,
        }),
      ];
    },
  };
}

export function createDefaultCommandProviders(): CommandProvider[] {
  return [
    createQuicklinkCommandProvider(),
    createCalculatorCommandProvider(),
    createApplicationsCommandProvider(),
    createScriptCommandsProvider(),
    createExtensionCommandProvider(),
    createExtensionStoreProvider(),
  ];
}
