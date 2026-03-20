import { Keyboard, Loader2 } from "lucide-react";

import { CommandIcon } from "@/components/icons/command-icon";
import { DetailPanel, EmptyView } from "@/components/module";
import type { CompositorBindings, HotkeyCapabilities } from "@/modules/settings/api/hotkeys";
import HotkeyRecorder from "@/modules/settings/takeover/components/hotkey-recorder";

import type { KeybindRow } from "../types";

interface KeybindsDetailPaneProps {
  selectedRow: KeybindRow | null;
  savingId: string | null;
  bindings: CompositorBindings | null;
  capabilities: HotkeyCapabilities | null;
  onRecord: (nextShortcut: string) => void;
}

export function KeybindsDetailPane({
  selectedRow,
  savingId,
  bindings,
  capabilities,
  onRecord,
}: KeybindsDetailPaneProps) {
  return (
    <DetailPanel className="min-h-0 bg-transparent">
      {!selectedRow ? (
        <DetailPanel.Content className="flex items-center justify-center">
          <EmptyView
            icon={<Keyboard />}
            title="Select a keybind"
            description="Shortcut details and recording controls appear here."
          />
        </DetailPanel.Content>
      ) : (
        <DetailPanel.Content className="space-y-5">
          <div className="flex items-start gap-3">
            <CommandIcon
              icon={selectedRow.icon}
              commandId={selectedRow.kind === "command" ? selectedRow.id : undefined}
              className="size-11 rounded-xl"
            />
            <div className="min-w-0">
              <div className="truncate font-mono text-launcher-3xl text-foreground">
                {selectedRow.title}
              </div>
              <div className="mt-1 text-launcher-sm text-muted-foreground">
                {selectedRow.kind === "global" ? "Launcher shortcut" : selectedRow.id}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-mono text-launcher-xs uppercase tracking-[0.14em] text-muted-foreground">
              Description
            </div>
            <p className="text-launcher-md leading-6 text-foreground/90">
              {selectedRow.description}
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-mono text-launcher-xs uppercase tracking-[0.14em] text-muted-foreground">
              Record Shortcut
            </div>
            <HotkeyRecorder
              value={selectedRow.shortcut}
              onChange={onRecord}
              disabled={savingId === selectedRow.id}
              className="w-full"
            />
          </div>

          {selectedRow.kind === "global" && bindings ? (
            <div className="space-y-2 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4">
              <div className="font-mono text-launcher-xs uppercase tracking-[0.14em] text-muted-foreground">
                Compositor Hints
              </div>
              <div className="space-y-2 text-launcher-sm text-muted-foreground">
                <div>Command prefix: {bindings.commandPrefix}</div>
                {bindings.launcherBindingExamples[0] ? (
                  <div>Example: {bindings.launcherBindingExamples[0]}</div>
                ) : null}
                {(capabilities?.notes ?? []).map((note) => (
                  <div key={note}>{note}</div>
                ))}
                {bindings.notes.map((note) => (
                  <div key={note}>{note}</div>
                ))}
              </div>
            </div>
          ) : null}

          {savingId === selectedRow.id ? (
            <div className="flex items-center gap-2 text-launcher-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Saving shortcut...
            </div>
          ) : null}
        </DetailPanel.Content>
      )}
    </DetailPanel>
  );
}
