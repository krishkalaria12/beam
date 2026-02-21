import { Button } from "@/components/ui/button";
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
  if (!toast && actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-3 py-2">
      {toast ? (
        <div className="min-w-0 flex-1">
          <RunnerToast
            toast={toast}
            onAction={onToastAction}
            onHide={onToastHide}
          />
        </div>
      ) : null}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.nodeId}
            size="sm"
            variant={action.style === "destructive" ? "destructive" : "outline"}
            onClick={() => onExecuteAction(action)}
            className="h-8 gap-1.5"
          >
            <span className="truncate">{action.title}</span>
            {action.shortcut ? (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {action.shortcut}
              </span>
            ) : null}
          </Button>
        ))}
      </div>
    </div>
  );
}
