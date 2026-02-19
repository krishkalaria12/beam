import type { CommandProvider } from "@/command-registry/types";
import { searchApplications } from "@/modules/applications/api/search-applications";
import { calculateExpression } from "@/modules/calculator/api/calculate-expression";

const CALCULATOR_QUERY_PATTERN = /[\d()+\-*/%=]|(^|\s)(to|time|at)(\s|$)/i;
const PROVIDER_SCOPE: ReadonlyArray<"normal" | "compressed"> = ["normal", "compressed"];

export const INTERNAL_EXTENSION_ID = "beam.internal";
export const CALCULATOR_COPY_COMMAND_ID = "calculator.copy-result";
export const CALCULATOR_RESULT_COMMAND_ID = "calculator.result";

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

function looksLikeCalculationQuery(query: string): boolean {
  const normalized = query.trim();
  if (!normalized) {
    return false;
  }

  if (/^[-+]?\d+(\.\d+)?$/.test(normalized)) {
    return false;
  }

  return CALCULATOR_QUERY_PATTERN.test(normalized);
}

function toApplicationCommandId(name: string, execPath: string): string {
  const nameSegment = normalizeIdSegment(name) || "app";
  return `applications.open.${nameSegment}::${hashText(execPath)}`;
}

function buildApplicationTitle(name: string, execPath: string): string {
  const normalizedName = name.trim();
  if (normalizedName.length > 0) {
    return normalizedName;
  }

  const pathParts = execPath.split(/[\\/]/).filter(Boolean);
  return pathParts[pathParts.length - 1] ?? "Open Application";
}

export function createApplicationsCommandProvider(): CommandProvider {
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
          const keywords = [
            title,
            application.description,
            application.exec_path,
          ].filter((item) => item.trim().length > 0);

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

export function createCalculatorCommandProvider(): CommandProvider {
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

      const primaryOutput = result.outputs.find((entry) => !entry.is_error);
      const outputValue = primaryOutput?.value?.trim() ?? "";
      if (!outputValue) {
        return [];
      }

      const expression = result.query.trim() || normalizedQuery;
      return [
        {
          id: CALCULATOR_RESULT_COMMAND_ID,
          title: outputValue,
          subtitle: expression,
          keywords: [
            "calculator",
            "calculate",
            "result",
            expression,
            outputValue,
          ],
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

export function createDefaultCommandProviders(): CommandProvider[] {
  return [
    createCalculatorCommandProvider(),
    createApplicationsCommandProvider(),
  ];
}
