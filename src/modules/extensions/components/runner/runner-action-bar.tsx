import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";
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

  return (
    <CommandFooterBar
      className="h-auto min-h-[42px] py-2"
      leftSlot={
        toast ? (
          <div className="min-w-0">
            <RunnerToast toast={toast} onAction={onToastAction} onHide={onToastHide} />
          </div>
        ) : (
          <span>Extension actions</span>
        )
      }
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
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
                <div className="ml-0.5 flex items-center gap-1">
                  {parseShortcut(action.shortcut).map((shortcutKey) => (
                    <kbd
                      key={`${action.nodeId}:${shortcutKey}`}
                      className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded bg-[var(--kbd-bg)] px-1 font-mono text-[10px] text-muted-foreground"
                    >
                      {shortcutKey}
                    </kbd>
                  ))}
                </div>
              ) : null}
            </Button>
          ))}
          <CommandKeyHint keyLabel="ESC" label="Back" />
        </div>
      }
    />
  );
}
