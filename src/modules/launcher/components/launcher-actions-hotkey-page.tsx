import { CheckCircle2, Loader2 } from "lucide-react";

import { Kbd } from "@/components/module";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import HotkeyRecorder from "@/modules/settings/components/HotkeyRecorder";

import { HOTKEY_EXAMPLE } from "@/modules/launcher/helper";
import type { SaveFeedback } from "@/modules/launcher/types";

interface LauncherActionsHotkeyPageProps {
  hotkeyValue: string;
  saving: boolean;
  canSave: boolean;
  feedback: SaveFeedback | null;
  availability: SaveFeedback;
  onHotkeyChange: (value: string) => void;
  onSave: () => void;
  onBack: () => void;
}

export function LauncherActionsHotkeyPage({
  hotkeyValue,
  saving,
  canSave,
  feedback,
  availability,
  onHotkeyChange,
  onSave,
  onBack,
}: LauncherActionsHotkeyPageProps) {
  return (
    <>
      <div className="flex max-h-[210px] min-h-[210px] flex-col items-center justify-center gap-4 px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          {saving ? (
            <div className="flex min-h-10 items-center gap-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Saving...</span>
            </div>
          ) : feedback?.tone === "success" ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-[var(--icon-green-fg)]">Hotkey Saved</span>
              <HotkeyRecorder
                value={hotkeyValue}
                onChange={onHotkeyChange}
                autoRecord={false}
                disabled={false}
              />
            </div>
          ) : (
            <HotkeyRecorder
              value={hotkeyValue}
              onChange={onHotkeyChange}
              autoRecord
              disabled={false}
            />
          )}
        </div>

        {feedback?.tone !== "success" ? (
          <p
            className={cn(
              "text-center text-[11px]",
              availability.tone === "error" && "text-[var(--icon-red-fg)]",
              availability.tone === "success" && "text-[var(--icon-green-fg)]",
              availability.tone === "neutral" && "text-muted-foreground/65",
            )}
          >
            {availability.text}
          </p>
        ) : null}

        {!hotkeyValue.trim() && !feedback ? (
          <p className="text-[10px] tracking-wide text-muted-foreground/50">
            Example: {HOTKEY_EXAMPLE}
          </p>
        ) : null}
      </div>

      <div className="sc-actions-panel-footer flex items-center justify-between gap-2 border-t border-[var(--ui-divider)] px-3 py-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-7 rounded-md px-2.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          Close
          <Kbd className="ml-1.5">Esc</Kbd>
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          onClick={onSave}
          className={cn("h-7 rounded-md px-2.5 text-[12px]", saving && "animate-pulse")}
        >
          {saving ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (feedback ?? availability).tone === "success" ? (
            <CheckCircle2 className="mr-1.5 size-3.5" />
          ) : null}
          Save
          <Kbd className="ml-1.5">↩</Kbd>
        </Button>
      </div>
    </>
  );
}
