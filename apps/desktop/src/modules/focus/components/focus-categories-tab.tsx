import type { Dispatch } from "react";
import { Check, Edit2, Plus, Trash2, Library, PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FocusMutations } from "@/modules/focus/hooks/use-focus";
import type { FocusStatus } from "@/modules/focus/types";
import { SettingsSection, SettingsField, SettingsDivider } from "@/modules/settings/takeover/tabs/general/components/settings-field";

import type { FocusViewAction, FocusViewState } from "./focus-view-state";

interface FocusCategoriesTabProps {
  state: FocusViewState;
  dispatch: Dispatch<FocusViewAction>;
  status: FocusStatus | undefined;
  mutations: FocusMutations;
  isBusy: boolean;
  onSaveCategory: () => void;
}

export function FocusCategoriesTab({
  state,
  dispatch,
  status,
  mutations,
  isBusy,
  onSaveCategory,
}: FocusCategoriesTabProps) {
  const isEditing = !!state.categoryEditor.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      {/* ─── Your Categories ─── */}
      <SettingsSection
        title="Your Categories"
        description="Manage preset groups of apps and websites."
        icon={Library}
        iconVariant="primary"
        headerAction={
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "new-category" })} className="gap-1.5 h-8">
            <Plus className="size-3.5" />
            New
          </Button>
        }
      >
        <div className="p-5">
          {(status?.categories ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--launcher-card-border)] p-8 text-center">
              <p className="text-launcher-sm font-medium text-foreground">No categories yet</p>
              <p className="text-launcher-xs text-muted-foreground mt-1">Create a category to quickly reuse focus rules.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {(status?.categories ?? []).map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-3 shadow-sm transition-colors hover:bg-[var(--launcher-card-hover-bg)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-launcher-sm font-semibold text-foreground">{category.title}</p>
                    <p className="truncate text-launcher-xs text-muted-foreground mt-0.5">
                      {category.apps.length > 0 ? `${category.apps.length} apps` : "No apps"} • {" "}
                      {category.websites.length > 0 ? `${category.websites.length} websites` : "No websites"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      aria-label="Edit category"
                      onClick={() => dispatch({ type: "edit-category", category })}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Delete category"
                      onClick={() => mutations.deleteCategory.mutate(category.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingsSection>

      {/* ─── Category Editor ─── */}
      <SettingsSection
        title={isEditing ? "Edit Category" : "Create Category"}
        description={isEditing ? "Modify your category rules." : "Add a new category of apps and sites."}
        icon={PackagePlus}
        iconVariant="cyan"
      >
        <SettingsField label="Title" description="Name your category" stacked>
          <Input
            value={state.categoryEditor.title}
            onChange={(event) => dispatch({ type: "set-category-title", value: event.target.value })}
            placeholder="e.g. Work, Social Media, Gaming"
            className="w-full sm:max-w-md"
          />
        </SettingsField>

        <SettingsDivider />

        <div className="grid gap-6 sm:grid-cols-2 p-5 pt-4">
          <div className="space-y-2">
            <label className="text-launcher-sm font-medium text-foreground">Apps</label>
            <p className="text-launcher-xs text-muted-foreground">List apps to block or allow, one per line.</p>
            <Textarea
              value={state.categoryEditor.appsText}
              onChange={(event) =>
                dispatch({ type: "set-category-apps-text", value: event.target.value })
              }
              placeholder="slack&#10;discord&#10;steam"
              className="min-h-[120px] resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-launcher-sm font-medium text-foreground">Websites</label>
            <p className="text-launcher-xs text-muted-foreground">List domains to block or allow, one per line.</p>
            <Textarea
              value={state.categoryEditor.websitesText}
              onChange={(event) =>
                dispatch({ type: "set-category-websites-text", value: event.target.value })
              }
              placeholder="youtube.com&#10;x.com&#10;reddit.com"
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>

        <SettingsDivider />
        
        <div className="p-5 flex justify-end gap-3">
          {isEditing && (
            <Button variant="ghost" onClick={() => dispatch({ type: "new-category" })}>
              Cancel
            </Button>
          )}
          <Button onClick={onSaveCategory} disabled={isBusy} className="gap-2">
            <Check className="size-4" />
            Save Category
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
