import { ActionListPanel, ModuleFooter } from "@/components/module";
import { RunnerToast } from "@/modules/extensions/components/runner/runner-toast";
import type { FlattenedAction } from "@/modules/extensions/components/runner/types";
import type { ExtensionToast } from "@/modules/extensions/runtime/store";

interface RunnerActionBarProps {
  actions: FlattenedAction[];
  toast?: ExtensionToast;
  onToastAction: (toastId: number, actionType: "primary" | "secondary") => void;
  onToastHide: (toastId: number) => void;
  onExecuteAction: (action: FlattenedAction) => void;
}

export function RunnerActionBar({
  actions,
  toast,
  onToastAction,
  onToastHide,
  onExecuteAction,
}: RunnerActionBarProps) {
  const parseShortcut = (shortcut?: string): string[] => {
    if (!shortcut) {
      return [];
    }
    return shortcut
      .split("+")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  };

  return (
    <ModuleFooter
      className="h-auto min-h-[48px] py-2"
      leftSlot={
        toast ? (
          <div className="min-w-0">
            <RunnerToast toast={toast} onAction={onToastAction} onHide={onToastHide} />
          </div>
        ) : (
          <span>Extension actions</span>
        )
      }
      shortcuts={[
        { keys: ["Esc"], label: "Back" },
        ...actions
          .filter((action) => action.shortcut)
          .map((action) => ({ keys: parseShortcut(action.shortcut), label: action.title })),
      ]}
      actions={
        actions.length > 0 ? (
          <ActionListPanel
            items={actions.map((action) => ({
              key: String(action.nodeId),
              title: action.title,
              shortcut: parseShortcut(action.shortcut),
              danger: action.style === "destructive",
              onSelect: () => onExecuteAction(action),
            }))}
          />
        ) : undefined
      }
    />
  );
}
