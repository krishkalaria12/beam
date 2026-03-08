import { ModuleFooter } from "@/components/module";
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
  const parseShortcut = (shortcut?: string): string[] => {
    if (!shortcut) {
      return [];
    }
    return shortcut
      .split("+")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  };

  const actionElements = actions.map((action) => {
    const keys = parseShortcut(action.shortcut);
    return (
      <Button
        key={action.nodeId}
        size="sm"
        variant={action.style === "destructive" ? "destructive" : "outline"}
        onClick={() => onExecuteAction(action)}
        className="h-8 gap-1.5 bg-[var(--launcher-card-bg)] text-foreground border-[var(--launcher-card-border)] hover:bg-[var(--launcher-card-hover-bg)]"
      >
        <span className="truncate">{action.title}</span>
      </Button>
    );
  });

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
      shortcuts={[{ keys: ["Esc"], label: "Back" }, ...actions.filter(a => a.shortcut).map(a => ({ keys: parseShortcut(a.shortcut), label: a.title }))]}
      actions={actionElements.length > 0 ? <>{actionElements}</> : undefined}
    />
  );
}

