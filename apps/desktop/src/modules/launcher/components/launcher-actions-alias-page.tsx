import { CheckCircle2, Loader2 } from "lucide-react";
import type React from "react";

import { Kbd } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { SaveFeedback } from "@/modules/launcher/types";

interface LauncherActionsAliasPageProps {
  aliasInputId: string;
  aliasInputRef: (node: HTMLInputElement | null) => void;
  aliasValue: string;
  saving: boolean;
  canSave: boolean;
  feedback: SaveFeedback | null;
  availability: SaveFeedback;
  onAliasChange: (value: string) => void;
  onSave: () => void;
  onBack: () => void;
}

export function LauncherActionsAliasPage({
  aliasInputId,
  aliasInputRef,
  aliasValue,
  saving,
  canSave,
  feedback,
  availability,
  onAliasChange,
  onSave,
  onBack,
}: LauncherActionsAliasPageProps) {
  return (
    <>
      <div className="flex max-h-[210px] min-h-[210px] flex-col justify-center gap-3 px-4 py-4">
        <div className="space-y-1">
          <Label htmlFor={aliasInputId} className="text-[11px] text-muted-foreground/80">
            Alias
          </Label>
          <Input
            ref={aliasInputRef}
            id={aliasInputId}
            value={aliasValue}
            onChange={(event) => {
              onAliasChange(event.target.value);
            }}
            placeholder="Type alias..."
            minimal
            aria-invalid={(feedback ?? availability).tone === "error"}
            className="h-8 text-[12px]"
          />
        </div>

        <p
          className={cn(
            "text-[11px]",
            (feedback ?? availability).tone === "error" && "text-[var(--icon-red-fg)]",
            (feedback ?? availability).tone === "success" && "text-[var(--icon-green-fg)]",
            (feedback ?? availability).tone === "neutral" && "text-muted-foreground/75",
          )}
        >
          {(feedback ?? availability).text}
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--ui-divider)] px-3 py-2.5">
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
