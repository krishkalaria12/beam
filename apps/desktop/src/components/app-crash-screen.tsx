import { Home, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppCrashScreenProps = {
  title?: string;
  description?: string;
  error?: unknown;
  onGoHome: () => void;
  onTryAgain?: () => void;
  className?: string;
};

const DEFAULT_TITLE = "Something Went Wrong";
const DEFAULT_DESCRIPTION =
  "Beam ran into an unexpected issue and couldn't finish rendering this view. You can go back to the main screen to recover.";

function toErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return null;
}

export function AppCrashScreen({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  error,
  onGoHome,
  onTryAgain,
  className,
}: AppCrashScreenProps) {
  const debugMessage = import.meta.env.DEV ? toErrorMessage(error) : null;

  return (
    <div
      className={cn(
        "h-screen w-screen bg-background text-foreground flex items-center justify-center px-6",
        className,
      )}
    >
      <div className="flex w-full max-w-md flex-col items-center">
        {/* Error icon */}
        <div className="relative mb-5 flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--icon-red-bg)] text-[var(--icon-red-fg)]">
          <X className="size-5" strokeWidth={2.5} />
          <div className="absolute -inset-1 rounded-[18px] border border-[var(--icon-red-bg)] opacity-50" />
        </div>

        {/* Content */}
        <div className="mb-6 max-w-80 text-center">
          <h1 className="text-launcher-xl mb-2 font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-launcher-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>

        {/* Debug info (dev only) */}
        {debugMessage ? (
          <div className="mb-5 w-full">
            <pre className="text-launcher-2xs m-0 max-h-30 overflow-y-auto break-all rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3 py-2.5 font-mono whitespace-pre-wrap text-muted-foreground">
              {debugMessage}
            </pre>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button onClick={onGoHome}>
            <Home className="size-3.5" />
            Go to Main Screen
          </Button>

          {onTryAgain ? (
            <Button variant="ghost" onClick={onTryAgain}>
              <RotateCcw className="size-3.5" />
              Try Again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
