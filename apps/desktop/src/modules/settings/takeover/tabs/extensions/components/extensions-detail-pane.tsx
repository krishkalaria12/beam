import type { ExtensionPreferenceField } from "@/modules/extensions/types";
import { DetailPanel, EmptyView } from "@/components/module";
import { PreferenceEditor } from "@/modules/extensions/components/extensions-view/preference-editor";

import type { ExtensionCommandEntry, ExtensionGroupEntry } from "../types";
import { ExtensionsEntryIcon } from "./extensions-entry-icon";

interface ExtensionsDetailPaneProps {
  selectedGroup: ExtensionGroupEntry | null;
  selectedCommand: ExtensionCommandEntry | null;
  selectedFields: ExtensionPreferenceField[];
  preferenceValues: Record<string, unknown>;
  isPreferenceLoading: boolean;
  isPreferenceSaving: boolean;
  preferenceError: string | null;
  validationError: string | null;
  onChangePreference: (key: string, value: unknown) => void;
  onSavePreferences: () => Promise<void>;
}

export function ExtensionsDetailPane({
  selectedGroup,
  selectedCommand,
  selectedFields,
  preferenceValues,
  isPreferenceLoading,
  isPreferenceSaving,
  preferenceError,
  validationError,
  onChangePreference,
  onSavePreferences,
}: ExtensionsDetailPaneProps) {
  return (
    <DetailPanel className="min-h-0 bg-transparent">
      {!selectedGroup ? (
        <DetailPanel.Content className="flex items-center justify-center">
          <EmptyView
            title="Select an extension"
            description="Extension details, aliases, and preferences appear here."
          />
        </DetailPanel.Content>
      ) : (
        <DetailPanel.Content className="space-y-5">
          <div className="flex items-start gap-3">
            <ExtensionsEntryIcon
              sourceKind={selectedCommand?.sourceKind ?? selectedGroup.sourceKind}
              iconReference={selectedCommand?.iconReference ?? selectedGroup.iconReference}
              title={selectedCommand?.title ?? selectedGroup.title}
              commandId={selectedCommand?.commandId}
              className="size-11 rounded-xl"
            />
            <div className="min-w-0">
              <div className="truncate font-mono text-[18px] text-foreground">
                {selectedCommand?.title ?? selectedGroup.title}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                {selectedCommand
                  ? `${selectedGroup.sourceKind === "beam" ? "beam/core" : `${selectedGroup.owner}/${selectedGroup.pluginName}`} · ${selectedCommand.commandName}`
                  : selectedGroup.sourceKind === "beam"
                    ? "beam/core"
                    : `${selectedGroup.owner}/${selectedGroup.pluginName}`}
              </div>
            </div>
          </div>

          {(selectedCommand?.description || selectedGroup.description) ? (
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Description
              </div>
              <p className="text-[13px] leading-6 text-foreground/90">
                {selectedCommand?.description || selectedGroup.description}
              </p>
            </div>
          ) : null}

          <div className="rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
            <div className="grid grid-cols-2 gap-px bg-[var(--launcher-card-border)]">
              {[
                {
                  label: "Type",
                  value: selectedGroup.sourceKind === "beam"
                    ? selectedCommand
                      ? "Built-in Command"
                      : "Built-in Group"
                    : selectedCommand
                      ? "Command"
                      : "Extension",
                },
                {
                  label: "Version",
                  value: selectedCommand?.version ?? selectedGroup.version ?? "Unknown",
                },
                {
                  label: "Owner",
                  value: selectedGroup.owner,
                },
                {
                  label: "Commands",
                  value: String(selectedGroup.commands.length),
                },
              ].map((item) => (
                <div key={item.label} className="bg-[var(--launcher-card-bg)] px-4 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-1 text-[13px] text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <PreferenceEditor
            fields={selectedFields}
            values={preferenceValues}
            isLoading={isPreferenceLoading}
            isSaving={isPreferenceSaving}
            error={preferenceError}
            validationError={validationError}
            onChange={onChangePreference}
            onSave={onSavePreferences}
          />
        </DetailPanel.Content>
      )}
    </DetailPanel>
  );
}
