import { ArrowDown, ArrowUp, RotateCcw, WandSparkles } from "lucide-react";

import {
  AVAILABLE_FALLBACK_COMMAND_IDS,
  DEFAULT_FALLBACK_COMMAND_IDS,
} from "@/command-registry/fallback-commands";
import { staticCommandRegistry } from "@/command-registry/registry";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CommandGroup } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface FallbackActionsSettingsProps {
  enabled: boolean;
  fallbackCommandIds: readonly string[];
  onSetEnabled: (enabled: boolean) => void;
  onSetFallbackCommandIds: (fallbackCommandIds: readonly string[]) => void;
}

function moveItem(
  items: readonly string[],
  commandId: string,
  direction: "up" | "down",
): string[] {
  const index = items.indexOf(commandId);
  if (index < 0) {
    return [...items];
  }

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) {
    return [...items];
  }

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function FallbackActionsSettings({
  enabled,
  fallbackCommandIds,
  onSetEnabled,
  onSetFallbackCommandIds,
}: FallbackActionsSettingsProps) {
  const selectedSet = new Set(fallbackCommandIds);

  return (
    <CommandGroup>
      <div className="space-y-4 px-2 pb-2 pt-4">
        <div className="space-y-1 px-1">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
            Fallback Actions
          </p>
          <p className="text-xs text-muted-foreground">
            Show these actions when query has no strong command match.
          </p>
        </div>

        <Card className="rounded-xl border border-border/50 bg-muted/10 py-3">
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Label className="text-sm font-medium text-foreground">Enable fallback actions</Label>
              <p className="text-xs text-muted-foreground">Only applies in normal/compact command mode.</p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(value) => {
                onSetEnabled(Boolean(value));
              }}
              aria-label="Enable fallback actions"
            />
          </CardContent>
        </Card>

        <div className="space-y-2">
          {AVAILABLE_FALLBACK_COMMAND_IDS.map((commandId) => {
            const command = staticCommandRegistry.getById(commandId);
            const isSelected = selectedSet.has(commandId);
            const index = fallbackCommandIds.indexOf(commandId);

            return (
              <Card
                key={commandId}
                className={cn(
                  "rounded-xl border py-3",
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/50 bg-muted/10",
                )}
              >
                <CardContent className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(value) => {
                      if (Boolean(value)) {
                        onSetFallbackCommandIds([...fallbackCommandIds, commandId]);
                      } else {
                        onSetFallbackCommandIds(
                          fallbackCommandIds.filter((entry) => entry !== commandId),
                        );
                      }
                    }}
                    aria-label={`Enable ${command?.title ?? commandId} fallback action`}
                  />
                  <div className="min-w-0 flex-1">
                    <Label className="truncate text-sm font-medium text-foreground">
                      {command?.title ?? commandId}
                    </Label>
                    <p className="truncate text-xs text-muted-foreground">{command?.subtitle ?? commandId}</p>
                  </div>

                  <div className="ml-auto inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        onSetFallbackCommandIds(moveItem(fallbackCommandIds, commandId, "up"));
                      }}
                      className="h-7 w-7"
                      disabled={!isSelected || index <= 0}
                      aria-label={`Move ${command?.title ?? commandId} up`}
                      title="Move up"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        onSetFallbackCommandIds(moveItem(fallbackCommandIds, commandId, "down"));
                      }}
                      className="h-7 w-7"
                      disabled={!isSelected || index < 0 || index >= fallbackCommandIds.length - 1}
                      aria-label={`Move ${command?.title ?? commandId} down`}
                      title="Move down"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onSetEnabled(true);
            onSetFallbackCommandIds(DEFAULT_FALLBACK_COMMAND_IDS);
          }}
          className="w-fit gap-2"
        >
          <RotateCcw className="size-3.5" />
          Reset defaults
        </Button>

        <Card className="rounded-xl border border-dashed border-border/50 bg-background/10 py-3">
          <CardContent className="text-xs text-muted-foreground">
            <p className="inline-flex items-center gap-1.5 text-foreground">
              <WandSparkles className="size-3.5 text-primary/80" />
              Active when Beam cannot find a strong match.
            </p>
          </CardContent>
        </Card>
      </div>
    </CommandGroup>
  );
}
