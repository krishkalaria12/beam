import {
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  Loader2,
  Monitor,
  RefreshCw,
  Wrench,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { IconChip } from "@/components/module";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  enableGnomeShellExtension,
  getDesktopIntegrationStatus,
  installGnomeShellExtension,
  openGnomeShellExtensionDirectory,
  type DesktopIntegrationStatus,
} from "@/modules/settings/api/desktop-integration";

type ActionState = "idle" | "refreshing" | "installing" | "enabling" | "opening";
type StatusTone = "supported" | "unsupported";

interface CapabilityItem {
  label: string;
  supported: boolean;
}

function StatusPill({ supported }: { supported: boolean }) {
  const tone: StatusTone = supported ? "supported" : "unsupported";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[-0.01em]",
        tone === "supported"
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
          : "border-white/10 bg-white/5 text-muted-foreground",
      )}
    >
      {supported ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
      {supported ? "Supported" : "Unavailable"}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/75",
        "px-4 py-4 shadow-[0_18px_42px_-32px_rgba(0,0,0,0.85)]",
      )}
    >
      <div className="flex items-start gap-3">
        <IconChip variant="cyan" size="md" className="rounded-xl">
          <Icon className="size-4" />
        </IconChip>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DesktopIntegrationSettings() {
  const [status, setStatus] = useState<DesktopIntegrationStatus | null>(null);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function refresh(nextState: ActionState = "refreshing") {
    setActionState(nextState);
    setErrorMessage("");
    try {
      const nextStatus = await getDesktopIntegrationStatus();
      setStatus(nextStatus);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load desktop status.");
    } finally {
      setActionState("idle");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const capabilityItems = useMemo<CapabilityItem[]>(() => {
    if (!status) {
      return [];
    }

    return [
      { label: "Window listing", supported: status.supportsWindowListing },
      { label: "Window focus", supported: status.supportsWindowFocus },
      { label: "Window close", supported: status.supportsWindowClose },
      { label: "Frontmost app", supported: status.supportsFrontmostApplication },
      { label: "Default app", supported: status.supportsDefaultApplication },
      { label: "Clipboard read", supported: status.supportsClipboardRead },
      { label: "Clipboard write", supported: status.supportsClipboardWrite },
      { label: "Clipboard paste", supported: status.supportsClipboardPaste },
      { label: "Selected text", supported: status.supportsSelectedText },
      { label: "Selected files", supported: status.supportsSelectedFileItems },
    ];
  }, [status]);

  const gnomeExtension = status?.gnomeExtension ?? null;
  const isBusy = actionState !== "idle";

  return (
    <div className="px-4 py-4">
      <div className="space-y-4">
        <div
          className={cn(
            "rounded-[24px] border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/90",
            "overflow-hidden shadow-[0_22px_70px_-46px_rgba(0,0,0,0.95)]",
          )}
        >
          <div className="border-b border-[var(--launcher-card-border)] bg-[linear-gradient(135deg,rgba(24,29,36,0.92),rgba(14,18,24,0.76))] px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <IconChip variant="green" size="lg" className="rounded-2xl">
                  <Monitor className="size-5" />
                </IconChip>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Linux Desktop Integration
                  </p>
                  <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-foreground">
                    Session-aware backends and capability reporting
                  </h3>
                  <p className="mt-1 max-w-[520px] text-[12px] leading-5 text-muted-foreground">
                    Beam now detects the active Linux desktop backend instead of assuming Hyprland
                    or Sway.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl"
                disabled={isBusy}
                onClick={() => void refresh("refreshing")}
              >
                {actionState === "refreshing" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
            <SummaryCard label="Session Type" value={status?.sessionType ?? "loading"} icon={Monitor} />
            <SummaryCard
              label="Desktop"
              value={
                status ? `${status.desktopEnvironment} / ${status.compositor}` : "loading"
              }
              icon={Wrench}
            />
            <SummaryCard
              label="Window Backend"
              value={status?.windowBackend ?? "loading"}
              icon={CheckCircle2}
            />
            <SummaryCard
              label="Clipboard Backend"
              value={status?.clipboardBackend ?? "loading"}
              icon={FolderOpen}
            />
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="rounded-[22px] border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/75 px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.02em] text-foreground">
                Capability Matrix
              </p>
              <p className="text-[12px] text-muted-foreground">
                These are the capabilities Beam can actually provide in the current Linux session.
              </p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {capabilityItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-white/6 bg-black/10 px-3 py-3"
              >
                <span className="text-[13px] tracking-[-0.01em] text-foreground">{item.label}</span>
                <StatusPill supported={item.supported} />
              </div>
            ))}
          </div>
        </div>

        {status?.desktopEnvironment === "gnome" ? (
          <div className="rounded-[22px] border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/75 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tracking-[-0.02em] text-foreground">
                  GNOME Shell Extension
                </p>
                <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                  GNOME window management and selection support depend on Beam&apos;s Shell bridge.
                </p>
              </div>
              <StatusPill supported={Boolean(gnomeExtension?.dbusReachable)} />
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-white/6 bg-black/10 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Installed
                </p>
                <p className="mt-1 text-[14px] font-medium text-foreground">
                  {gnomeExtension?.installed ? "Yes" : "No"}
                </p>
              </div>
              <div className="rounded-xl border border-white/6 bg-black/10 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Enabled
                </p>
                <p className="mt-1 text-[14px] font-medium text-foreground">
                  {gnomeExtension?.enabled ? "Yes" : "No"}
                </p>
              </div>
              <div className="rounded-xl border border-white/6 bg-black/10 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Version
                </p>
                <p className="mt-1 text-[14px] font-medium text-foreground">
                  {gnomeExtension?.version ?? "Unknown"}
                </p>
              </div>
              <div className="rounded-xl border border-white/6 bg-black/10 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Update Required
                </p>
                <p className="mt-1 text-[14px] font-medium text-foreground">
                  {gnomeExtension?.updateRequired ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                disabled={isBusy}
                onClick={async () => {
                  try {
                    await installGnomeShellExtension();
                    await refresh("installing");
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error ? error.message : "Failed to install extension.",
                    );
                    setActionState("idle");
                  }
                }}
              >
                {actionState === "installing" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Wrench className="mr-2 size-4" />
                )}
                {gnomeExtension?.updateRequired ? "Update Extension" : "Install Extension"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={isBusy}
                onClick={async () => {
                  try {
                    setActionState("enabling");
                    setErrorMessage("");
                    await enableGnomeShellExtension();
                    await refresh("enabling");
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error ? error.message : "Failed to enable extension.",
                    );
                    setActionState("idle");
                  }
                }}
              >
                {actionState === "enabling" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 size-4" />
                )}
                Enable Extension
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl"
                disabled={isBusy}
                onClick={async () => {
                  try {
                    setActionState("opening");
                    setErrorMessage("");
                    await openGnomeShellExtensionDirectory();
                    setActionState("idle");
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error ? error.message : "Failed to open extension folder.",
                    );
                    setActionState("idle");
                  }
                }}
              >
                {actionState === "opening" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <FolderOpen className="mr-2 size-4" />
                )}
                Open Folder
              </Button>
            </div>

            {gnomeExtension?.path ? (
              <p className="mt-3 break-all text-[11px] text-muted-foreground">{gnomeExtension.path}</p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-[22px] border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/75 px-4 py-4">
          <div className="flex items-start gap-3">
            <IconChip variant="orange" size="md" className="rounded-xl">
              <AlertTriangle className="size-4" />
            </IconChip>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-[-0.02em] text-foreground">Notes</p>
              <div className="mt-2 space-y-2">
                {(status?.notes.length ? status.notes : ["No additional integration notes."]).map(
                  (note) => (
                    <div
                      key={note}
                      className="rounded-xl border border-white/6 bg-black/10 px-3 py-3 text-[12px] leading-5 text-muted-foreground"
                    >
                      {note}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
