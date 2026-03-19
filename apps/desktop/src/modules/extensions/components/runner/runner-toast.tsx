import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ExtensionToast } from "@/modules/extensions/runtime/store";

interface RunnerToastProps {
  toast: ExtensionToast;
  onAction: (toastId: number, actionType: "primary" | "secondary") => void;
  onHide: (toastId: number) => void;
}

function ToastIcon({ style }: { style?: ExtensionToast["style"] }) {
  if (style === "ANIMATED") {
    return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  }

  if (style === "SUCCESS") {
    return <CheckCircle2 className="size-4 text-[var(--icon-green-fg)]" />;
  }

  if (style === "FAILURE") {
    return <XCircle className="size-4 text-[var(--icon-red-fg)]" />;
  }

  return <span className="mt-1 size-2 rounded-full bg-muted-foreground/70" />;
}

export function RunnerToast({ toast, onAction, onHide }: RunnerToastProps) {
  const primaryAction = toast.primaryAction?.onAction ? toast.primaryAction : undefined;
  const secondaryAction = toast.secondaryAction?.onAction ? toast.secondaryAction : undefined;

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] px-2.5 py-1.5">
      <ToastIcon style={toast.style} />
      <div className="min-w-0">
        <p className="truncate text-launcher-sm font-medium text-foreground">{toast.title}</p>
        {toast.message ? (
          <p className="truncate text-launcher-xs text-muted-foreground">{toast.message}</p>
        ) : null}
      </div>
      {secondaryAction ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-launcher-xs px-2"
          onClick={() => onAction(toast.id, "secondary")}
        >
          {secondaryAction.title}
        </Button>
      ) : null}
      {primaryAction ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-launcher-xs px-2 bg-[var(--launcher-card-bg)] border-[var(--launcher-card-border)]"
          onClick={() => onAction(toast.id, "primary")}
        >
          {primaryAction.title}
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-launcher-xs text-muted-foreground"
        onClick={() => onHide(toast.id)}
      >
        Dismiss
      </Button>
    </div>
  );
}
