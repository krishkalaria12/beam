import * as fs from "node:fs";
import * as path from "node:path";
import { Clipboard, environment, open, Toast, showToast } from "@beam-launcher/api";

/**
 * Shows a failure Toast for a given Error.
 *
 * @example
 * ```typescript
 * import { showHUD } from "@beam-launcher/api";
 * import { runAppleScript, showFailureToast } from "@beam-launcher/utils";
 *
 * export default async function () {
 *   try {
 *     const res = await runAppleScript(
 *       `
 *       on run argv
 *         return "hello, " & item 1 of argv & "."
 *       end run
 *       `,
 *       ["world"]
 *     );
 *     await showHUD(res);
 *   } catch (error) {
 *     showFailureToast(error, { title: "Could not run AppleScript" });
 *   }
 * }
 * ```
 */
export function showFailureToast(
  error: unknown,
  options?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>,
) {
  const message = error instanceof Error ? error.message : String(error);
  return showToast({
    style: Toast.Style.Failure,
    title: options?.title ?? "Something went wrong",
    message: options?.message ?? message,
    primaryAction: options?.primaryAction ?? handleErrorToastAction(error),
    secondaryAction: options?.primaryAction ? handleErrorToastAction(error) : undefined,
  });
}

const handleErrorToastAction = (error: unknown): Toast.ActionOptions => {
  let reportUrl: string | undefined;
  try {
    const packageJSON = JSON.parse(fs.readFileSync(path.join(environment.assetsPath, "..", "package.json"), "utf8"));

    if (packageJSON.bugs && typeof packageJSON.bugs === "object" && typeof packageJSON.bugs.url === "string") {
      reportUrl = packageJSON.bugs.url;
    } else if (typeof packageJSON.homepage === "string") {
      reportUrl = packageJSON.homepage;
    } else if (
      packageJSON.repository &&
      typeof packageJSON.repository === "object" &&
      typeof packageJSON.repository.url === "string"
    ) {
      reportUrl = packageJSON.repository.url;
    } else if ((packageJSON.owner || packageJSON.author) && typeof packageJSON.name === "string") {
      reportUrl = `beam://extensions/${encodeURIComponent(packageJSON.owner || packageJSON.author)}/${encodeURIComponent(
        packageJSON.name,
      )}`;
    }
  } catch (err) {
    // no-op
  }

  const fallback = environment.isDevelopment || !reportUrl;
  const stack = error instanceof Error ? error?.stack || error?.message || "" : String(error);

  return {
    title: fallback ? "Copy Logs" : "Report Error",
    async onAction(toast) {
      await toast.hide();
      await Clipboard.copy(stack);
      if (!fallback && reportUrl) {
        await open(reportUrl);
      }
    },
  };
};
