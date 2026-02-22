import type {
  CustomActionRequest,
  DispatchResult,
} from "@/command-registry/dispatcher";
import {
  CALCULATOR_COPY_COMMAND_ID,
  INTERNAL_EXTENSION_ID,
  QUICKLINK_EXECUTE_COMMAND_ID,
} from "@/command-registry/default-providers";
import { saveCalculatorHistory } from "@/modules/calculator-history/api/save-calculator-history";
import { installExtension } from "@/modules/extensions/api/install-extension";
import { invalidateDiscoveredExtensionsCache } from "@/modules/extensions/extension-command-provider";
import { executeQuicklink } from "@/modules/quicklinks/api/quicklinks";

export interface CreateCustomActionHandlerInput {
  calculatorSessionId: string;
  setCommandSearch: (value: string) => void;
  onCalculatorHistoryChanged: () => void;
  runExtensionCommand?: (request: CustomActionRequest) => Promise<void>;
}

const EXTENSION_INSTALL_COMMAND_ID = "extensions.install";

export function createCustomActionHandler(
  input: CreateCustomActionHandlerInput,
): (request: CustomActionRequest) => Promise<DispatchResult> {
  return async (request: CustomActionRequest): Promise<DispatchResult> => {
    if (request.extensionId !== INTERNAL_EXTENSION_ID) {
      if (!input.runExtensionCommand) {
        return {
          ok: false,
          code: "UNSUPPORTED_ACTION",
          message: "Extension runtime is not configured.",
        };
      }

      try {
        await input.runExtensionCommand(request);
        input.setCommandSearch("");
        return {
          ok: true,
          payload: {
            extensionId: request.extensionId,
            extensionCommandId: request.extensionCommandId,
          },
        };
      } catch (error) {
        console.error("Failed to execute extension command:", error);
        return {
          ok: false,
          code: "BACKEND_FAILURE",
          message: "Could not execute extension command.",
        };
      }
    }

    if (request.extensionCommandId === CALCULATOR_COPY_COMMAND_ID) {
      const calculatorQuery = typeof request.payload.calculatorQuery === "string"
        ? request.payload.calculatorQuery.trim()
        : "";
      const calculatorResult = typeof request.payload.calculatorResult === "string"
        ? request.payload.calculatorResult.trim()
        : "";

      if (!calculatorQuery || !calculatorResult) {
        return {
          ok: false,
          code: "INVALID_INPUT",
          message: "Calculator command payload is missing query or result.",
        };
      }

      try {
        await navigator.clipboard.writeText(calculatorResult);
        await saveCalculatorHistory(
          calculatorQuery,
          calculatorResult,
          input.calculatorSessionId,
        );
        input.onCalculatorHistoryChanged();
        return { ok: true, payload: { copied: calculatorResult } };
      } catch (error) {
        console.error("Failed to execute calculator custom command:", error);
        return {
          ok: false,
          code: "BACKEND_FAILURE",
          message: "Could not copy calculator result.",
        };
      }
    }

    if (request.extensionCommandId === QUICKLINK_EXECUTE_COMMAND_ID) {
      const quicklinkKeywordFromPayload =
        typeof request.payload.quicklinkKeyword === "string"
          ? request.payload.quicklinkKeyword.trim()
          : "";
      const executionQuery = request.query?.trim() ?? "";
      if (!quicklinkKeywordFromPayload) {
        return {
          ok: false,
          code: "INVALID_INPUT",
          message: "Quicklink command payload is missing keyword.",
        };
      }

      try {
        await executeQuicklink(quicklinkKeywordFromPayload, executionQuery);
        input.setCommandSearch("");
        return { ok: true, payload: { keyword: quicklinkKeywordFromPayload } };
      } catch (error) {
        console.error("Failed to execute quicklink custom command:", error);
        return {
          ok: false,
          code: "BACKEND_FAILURE",
          message: "Could not execute quicklink.",
        };
      }
    }

    if (request.extensionCommandId === EXTENSION_INSTALL_COMMAND_ID) {
      const extensionInstallDownloadUrl =
        typeof request.payload.extensionInstallDownloadUrl === "string"
          ? request.payload.extensionInstallDownloadUrl.trim()
          : "";
      const extensionInstallSlug =
        typeof request.payload.extensionInstallSlug === "string"
          ? request.payload.extensionInstallSlug.trim()
          : "";
      const extensionInstallTitle =
        typeof request.payload.extensionInstallTitle === "string"
          ? request.payload.extensionInstallTitle.trim()
          : extensionInstallSlug;

      if (!extensionInstallDownloadUrl || !extensionInstallSlug) {
        return {
          ok: false,
          code: "INVALID_INPUT",
          message: "Extension install payload is missing download URL or slug.",
        };
      }

      try {
        const result = await installExtension({
          downloadUrl: extensionInstallDownloadUrl,
          slug: extensionInstallSlug,
          force: false,
        });

        if (result.status === "requiresConfirmation") {
          return {
            ok: false,
            code: "BACKEND_FAILURE",
            message: `Install for "${extensionInstallTitle}" requires confirmation before proceeding.`,
          };
        }

        invalidateDiscoveredExtensionsCache();
        input.setCommandSearch("");
        return {
          ok: true,
          payload: {
            installedExtension: extensionInstallTitle,
            slug: extensionInstallSlug,
          },
        };
      } catch (error) {
        console.error("Failed to install extension:", error);
        return {
          ok: false,
          code: "BACKEND_FAILURE",
          message: "Could not install extension.",
        };
      }
    }

    return {
      ok: false,
      code: "UNSUPPORTED_ACTION",
      message: "Unsupported custom command action.",
    };
  };
}
