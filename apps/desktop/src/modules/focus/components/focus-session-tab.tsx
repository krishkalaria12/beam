import type { Dispatch } from "react";
import { 
  Check, 
  ChevronRight, 
  Clock3, 
  Pause, 
  Play, 
  Shield, 
  Target, 
  Timer, 
  Layers, 
  BellOff, 
  Plus 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FocusMutations } from "@/modules/focus/hooks/use-focus";
import type { FocusSession, FocusStatus } from "@/modules/focus/types";
import { SettingsSection, SettingsField, SettingsDivider } from "@/modules/settings/takeover/tabs/general/components/settings-field";

import {
  textToRules,
  textToWebsiteRules,
  type FocusViewAction,
  type FocusViewState,
} from "./focus-view-state";

interface FocusSessionTabProps {
  state: FocusViewState;
  dispatch: Dispatch<FocusViewAction>;
  status: FocusStatus | undefined;
  activeSession: FocusSession | null;
  remainingText: string;
  mutations: FocusMutations;
  onSnooze: () => void;
}

export function FocusSessionTab({
  state,
  dispatch,
  status,
  activeSession,
  remainingText,
  mutations,
  onSnooze,
}: FocusSessionTabProps) {
  const selectedCategoryCount = state.categoryIds.length;
  const directApps = textToRules(state.appsText);
  const directWebsites = textToWebsiteRules(state.websitesText);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      {/* ─── Active Session Status ─── */}
      {activeSession && (
        <SettingsSection
          title="Current Session"
          description={activeSession.status === "paused" ? "Session is paused." : "Stay focused."}
          icon={Target}
          iconVariant="primary"
          headerAction={
            <div className="flex items-center gap-2 text-launcher-lg font-semibold text-foreground">
              <Clock3 className="size-5 text-muted-foreground" />
              {remainingText}
            </div>
          }
        >
          <div className="flex flex-wrap gap-3 p-5">
            {activeSession.status === "paused" ? (
              <Button onClick={() => mutations.resumeSession.mutate()} className="gap-2">
                <Play className="size-4" />
                Resume
              </Button>
            ) : (
              <Button variant="outline" onClick={() => mutations.pauseSession.mutate()} className="gap-2">
                <Pause className="size-4" />
                Pause
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => mutations.completeSession.mutate()}
              className="gap-2"
            >
              <Check className="size-4" />
              Complete
            </Button>
          </div>
          <SettingsDivider />
          <div className="grid grid-cols-3 gap-px bg-[var(--launcher-card-border)]/60">
            <Stat label="Categories" value={selectedCategoryCount} />
            <Stat label="Apps Blocked" value={directApps.length} />
            <Stat label="Sites Blocked" value={directWebsites.length} />
          </div>
        </SettingsSection>
      )}

      {/* ─── Configuration ─── */}
      <SettingsSection
        title="Session Details"
        description="Define what you want to achieve and for how long."
        icon={Timer}
        iconVariant="cyan"
      >
        <SettingsField label="Goal" description="What are you focusing on?" stacked>
          <Input
            value={state.goal}
            onChange={(event) => dispatch({ type: "set-goal", value: event.target.value })}
            placeholder="e.g. Deep work on the new feature..."
            className="w-full"
          />
        </SettingsField>

        <SettingsDivider />

        <SettingsField label="Duration" description="Set a timer or run untimed.">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                inputMode="numeric"
                value={state.durationMinutes}
                disabled={state.untimed}
                onChange={(event) =>
                  dispatch({ type: "set-duration-minutes", value: event.target.value })
                }
                className="w-24 text-right"
                rightIcon={<span className="text-launcher-xs text-muted-foreground pr-2">min</span>}
              />
            </div>
            <label className="flex items-center gap-2 text-launcher-sm font-medium text-muted-foreground cursor-pointer">
              <Checkbox
                checked={state.untimed}
                onCheckedChange={(checked) =>
                  dispatch({ type: "set-untimed", value: checked === true })
                }
              />
              Untimed
            </label>
          </div>
        </SettingsField>
      </SettingsSection>

      {/* ─── Rules & Categories ─── */}
      <SettingsSection
        title="Distraction Rules"
        description="Select what should be blocked or allowed during this session."
        icon={Layers}
        iconVariant="orange"
      >
        <SettingsField label="Enforcement Mode" description="Choose how rules are applied.">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={state.mode === "block" ? "secondary" : "outline"}
              onClick={() => dispatch({ type: "set-mode", value: "block" })}
              className="gap-2"
            >
              <Shield className="size-4" />
              Block
            </Button>
            <Button
              type="button"
              variant={state.mode === "allow" ? "secondary" : "outline"}
              onClick={() => dispatch({ type: "set-mode", value: "allow" })}
              className="gap-2"
            >
              <Check className="size-4" />
              Allow
            </Button>
          </div>
        </SettingsField>

        <SettingsDivider />

        <SettingsField label="Categories" description="Toggle preset groups of apps and websites." stacked>
          <div className="grid gap-2 sm:grid-cols-2">
            {(status?.categories ?? []).map((category) => {
              const isSelected = state.categoryIds.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => dispatch({ type: "toggle-category", id: category.id })}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-3 text-left transition-colors",
                    isSelected
                      ? "border-[var(--launcher-card-selected-border)] bg-[var(--launcher-card-selected-bg)]"
                      : "border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] hover:bg-[var(--launcher-card-hover-bg)]"
                  )}
                >
                  <div className="min-w-0">
                    <p className={cn("truncate text-launcher-sm font-semibold", isSelected ? "text-foreground" : "text-muted-foreground")}>
                      {category.title}
                    </p>
                    <p className="truncate text-launcher-xs text-muted-foreground/70">
                      {category.apps.length} apps, {category.websites.length} sites
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-[var(--ring)]">
                      <Check className="size-3 text-background" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
            {(status?.categories.length ?? 0) === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-[var(--launcher-card-border)] p-4 text-center text-launcher-sm text-muted-foreground">
                No categories available. You can create them in the Categories tab.
              </div>
            )}
          </div>
        </SettingsField>

        <SettingsDivider />

        <div className="grid gap-4 sm:grid-cols-2 p-5 pt-0">
          <div className="space-y-2">
            <label className="text-launcher-sm font-medium text-foreground">Direct Apps</label>
            <Textarea
              value={state.appsText}
              onChange={(event) => dispatch({ type: "set-apps-text", value: event.target.value })}
              placeholder="slack&#10;discord&#10;steam"
              className="min-h-[100px] resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-launcher-sm font-medium text-foreground">Direct Websites</label>
            <Textarea
              value={state.websitesText}
              onChange={(event) => dispatch({ type: "set-websites-text", value: event.target.value })}
              placeholder="youtube.com&#10;x.com&#10;reddit.com"
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
      </SettingsSection>

      {/* ─── Snooze ─── */}
      <SettingsSection
        title="Quick Snooze"
        description="Temporarily allow an app or website for 5 minutes."
        icon={BellOff}
        iconVariant="neutral"
      >
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex rounded-lg border border-[var(--launcher-card-border)] p-1 bg-[var(--launcher-card-bg)]">
            <Button
              type="button"
              size="sm"
              variant={state.snoozeTargetType === "app" ? "secondary" : "ghost"}
              onClick={() => dispatch({ type: "set-snooze-target-type", value: "app" })}
              className="px-4"
            >
              App
            </Button>
            <Button
              type="button"
              size="sm"
              variant={state.snoozeTargetType === "website" ? "secondary" : "ghost"}
              onClick={() => dispatch({ type: "set-snooze-target-type", value: "website" })}
              className="px-4"
            >
              Website
            </Button>
          </div>
          
          <div className="flex flex-1 items-center gap-2 w-full">
            <Input
              value={state.snoozeTarget}
              onChange={(event) =>
                dispatch({ type: "set-snooze-target", value: event.target.value })
              }
              placeholder={state.snoozeTargetType === "website" ? "e.g. reddit.com" : "e.g. discord"}
              className="flex-1"
            />
            <Button variant="outline" onClick={onSnooze} className="gap-2 whitespace-nowrap">
              <Clock3 className="size-4" />
              Snooze 5m
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--launcher-card-bg)] p-4 text-center flex flex-col gap-1">
      <div className="text-launcher-2xl font-bold text-foreground">{value}</div>
      <div className="text-launcher-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

