import { RunnerActionBar } from "@/modules/extensions/components/runner/runner-action-bar";
import type { FlattenedAction } from "@/modules/extensions/components/runner/types";
import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";

interface RuntimeActionFooterProps {
  state: UseExtensionRunnerStateResult;
  actions: FlattenedAction[];
}

export function RuntimeActionFooter({ state, actions }: RuntimeActionFooterProps) {
  return (
    <RunnerActionBar
      actions={actions}
      toast={state.activeToast}
      onToastAction={state.handleToastAction}
      onToastHide={state.handleToastHide}
      onExecuteAction={(action) => {
        void state.executeAction(action);
      }}
    />
  );
}
