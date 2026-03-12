import { writeLog } from "../io";
import { writeRuntimeOutput } from "../protocol/runtime-output";
import { type CommandLoadOptions, loadCommandModule } from "./load-command-module";

export default async function loadNoViewCommand(options: CommandLoadOptions) {
  const { launchProps, pluginRoot } = await loadCommandModule(options);

  if (typeof pluginRoot !== "function") {
    throw new Error("No-view command did not export a default function.");
  }

  await (pluginRoot as (props: typeof launchProps) => Promise<void>)(launchProps);
  writeLog("No-view command finished.");
  writeRuntimeOutput({ goBackToPluginList: {} });
}
