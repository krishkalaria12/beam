import React from "../../shared-react";
import { createWrapperComponent } from "../utils";
import { currentRootElement, navigationStack } from "../../state";
import { updateContainer } from "../../reconciler";

const Action = createWrapperComponent("Action");
const ActionPanel = createWrapperComponent("ActionPanel");
const ActionPanelSection = createWrapperComponent("ActionPanel.Section");
const ActionPanelSubmenu = createWrapperComponent("ActionPanel.Submenu");
const ActionOpen = createWrapperComponent("Action.Open");
const ActionShowInFinder = createWrapperComponent("Action.ShowInFinder");
const ActionRunInTerminal = createWrapperComponent("Action.RunInTerminal");
const ActionCreateQuicklink = createWrapperComponent("Action.CreateQuicklink");
const ActionPaste = createWrapperComponent("Action.Paste");
const ActionCopy = createWrapperComponent("Action.CopyToClipboard");
const ActionOpenInBrowser = createWrapperComponent("Action.OpenInBrowser");
const ActionSubmitForm = createWrapperComponent("Action.SubmitForm");

const ActionPush = ({
  onPush,
  target,
  ...props
}: {
  onPush?: () => void;
  target: React.ReactElement;
}) => {
  const handleAction = () => {
    if (currentRootElement) {
      navigationStack.push(currentRootElement);
    }
    updateContainer(target);
    onPush?.();
  };
  return React.createElement("Action.Push" as React.ElementType, {
    ...props,
    onAction: handleAction,
  });
};

const Style = {
  Regular: "regular",
  Destructive: "destructive",
} as const;

Object.assign(Action, {
  Open: ActionOpen,
  ShowInFinder: ActionShowInFinder,
  RunInTerminal: ActionRunInTerminal,
  CreateQuicklink: ActionCreateQuicklink,
  Paste: ActionPaste,
  CopyToClipboard: ActionCopy,
  OpenInBrowser: ActionOpenInBrowser,
  Push: ActionPush,
  SubmitForm: ActionSubmitForm,
  Style,
});
Object.assign(ActionPanel, {
  Section: ActionPanelSection,
  Submenu: ActionPanelSubmenu,
  Item: Action,
});

export { Action, ActionPanel };
