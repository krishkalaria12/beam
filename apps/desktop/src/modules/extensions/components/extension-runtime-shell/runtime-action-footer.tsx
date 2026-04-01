import { useEffect } from "react";

import { RunnerActionBar } from "@/modules/extensions/components/runner/runner-action-bar";
import {
  clearExtensionRunnerActionItemsState,
  syncExtensionRunnerActionItemsState,
} from "@/modules/extensions/hooks/use-extension-runner-action-items";
import type { ExtensionActionPanelPage } from "@/modules/extensions/components/runner/types";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";

interface RuntimeActionFooterProps {
  state: UseExtensionRunnerStateResult;
  actions: ExtensionActionPanelPage;
}

export function RuntimeActionFooter({ state, actions }: RuntimeActionFooterProps) {
  useEffect(() => {
    syncExtensionRunnerActionItemsState({
      page: actions,
      onExecuteAction: (action) => {
        void state.executeAction(action);
      },
      onOpenSubmenu: (submenu) => {
        if (submenu.hasOnOpen) {
          state.dispatchNodeEvent(submenu.nodeId, "onOpen");
        }
      },
    });
    return () => {
      clearExtensionRunnerActionItemsState();
    };
  }, [actions, state.dispatchNodeEvent, state.executeAction]);

  return (
    <RunnerActionBar
      actions={actions}
      toast={state.activeToast}
      onToastAction={state.handleToastAction}
      onToastHide={state.handleToastHide}
    />
  );
}
