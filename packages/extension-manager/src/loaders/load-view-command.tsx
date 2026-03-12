import React from "react";
import { updateContainer } from "../reconciler";
import { type CommandLoadOptions, loadCommandModule } from "./load-command-module";

export default async function loadViewCommand(options: CommandLoadOptions) {
  const { launchProps, pluginRoot } = await loadCommandModule(options);

  if (!pluginRoot) {
    throw new Error("Plugin did not export a default component.");
  }

  const ViewComponent = pluginRoot as unknown as React.ComponentType<typeof launchProps>;
  const appElement = React.createElement(ViewComponent, launchProps);

  updateContainer(appElement);
}
