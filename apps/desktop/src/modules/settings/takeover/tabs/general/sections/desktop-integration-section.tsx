import type { ComponentType } from "react";
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
import { useState } from "react";

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
import { useMountEffect } from "@/hooks/use-mount-effect";
import { SettingsSection, SettingsDivider } from "../components/settings-field";

type ActionState = "idle" | "refreshing" | "installing" | "enabling" | "opening";

interface CapabilityItem {
  label: string;
  supported: boolean;
}

function StatusPill({ supported }: { supported: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-launcher-2xs font-semibold tracking-[-0.01em]",
        supported
          ? "border-[var(--launcher-card-selected-border)] bg-[var(--launcher-card-selected-bg)] text-foreground"
          : "border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] text-muted-foreground",
      )}
    >
      {supported ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
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
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-3.5">
      <div className="flex items-start gap-3">
        <IconChip variant="cyan" size="sm" className="mt-0.5 rounded-lg">
          <Icon className="size-3.5" />
        </IconChip>
        <div className="min-w-0">
          <p className="text-launcher-2xs uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-launcher-md font-semibold tracking-[-0.02em] text-foreground">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function GeneralDesktopIntegrationSection() {
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

  useMountEffect(() => {
    void refresh();
  });

  const capabilityItems: CapabilityItem[] = status
    ? [
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
      ]
    : [];

  const gnomeExtension = status?.gnomeExtension ?? null;
  const isBusy = actionState !== "idle";

  return (
    <div className="space-y-4">
      {/* ── Desktop Session Overview ── */}
      <SettingsSection
        title="Desktop Integration"
        description="Session-aware backends and capability reporting for your Linux desktop."
        icon={Monitor}
        iconVariant="green"
        headerAction={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-lg border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2.5 text-launcher-2xs font-medium text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground"
            disabled={isBusy}
            onClick={() => void refresh("refreshing")}
          >
            {actionState === "refreshing" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            Refresh
          </Button>
        }
      >
        {/* Summary grid */}
        <div className="grid gap-2.5 p-5 md:grid-cols-2">
          <SummaryCard
            label="Session Type"
            value={status?.sessionType ?? "loading"}
            icon={Monitor}
          />
          <SummaryCard
            label="Desktop"
            value={status ? `${status.desktopEnvironment} / ${status.compositor}` : "loading"}
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
          <SummaryCard
            label="Selected Text"
            value={status?.selectedTextBackend ?? "loading"}
            icon={CheckCircle2}
          />
          <SummaryCard
            label="Selected Files"
            value={status?.selectedFilesBackend ?? "loading"}
            icon={FolderOpen}
          />
          <SummaryCard
            label="Wayland Helper"
            value={
              status
                ? status.waylandHelper.available
                  ? (status.waylandHelper.backend ?? "available")
                  : (status.waylandHelper.lastError ?? "unavailable")
                : "loading"
            }
            icon={Wrench}
          />
        </div>

        {errorMessage ? (
          <div className="mx-5 mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-launcher-xs text-red-200">
            {errorMessage}
          </div>
        ) : null}
      </SettingsSection>

      {/* ── Capability Matrix ── */}
      <SettingsSection
        title="Capability Matrix"
        description="What Beam can provide in the current Linux session."
        icon={CheckCircle2}
        iconVariant="cyan"
      >
        <div className="grid gap-2 p-5 md:grid-cols-2">
          {capabilityItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3.5 py-2.5"
            >
              <span className="text-launcher-sm tracking-[-0.01em] text-foreground">
                {item.label}
              </span>
              <StatusPill supported={item.supported} />
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* ── GNOME Shell Extension ── */}
      {status?.desktopEnvironment === "gnome" ? (
        <SettingsSection
          title="GNOME Shell Extension"
          description="Beam's Shell bridge enables window management and selection support on GNOME."
          icon={Wrench}
          iconVariant="primary"
          headerAction={<StatusPill supported={Boolean(gnomeExtension?.dbusReachable)} />}
        >
          {/* Stats */}
          <div className="grid gap-2 p-5 md:grid-cols-2">
            {[
              { label: "Installed", value: gnomeExtension?.installed ? "Yes" : "No" },
              { label: "Enabled", value: gnomeExtension?.enabled ? "Yes" : "No" },
              { label: "Version", value: gnomeExtension?.version ?? "Unknown" },
              { label: "Update Required", value: gnomeExtension?.updateRequired ? "Yes" : "No" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3.5 py-3"
              >
                <p className="text-launcher-2xs uppercase tracking-[0.14em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-0.5 text-launcher-lg font-medium text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          <SettingsDivider />

          {/* Actions */}
          <div className="flex flex-wrap gap-2 px-5 py-4">
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
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <Wrench className="mr-2 size-3.5" />
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
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 size-3.5" />
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
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <FolderOpen className="mr-2 size-3.5" />
              )}
              Open Folder
            </Button>
          </div>

          {gnomeExtension?.path ? (
            <p className="px-5 pb-4 break-all text-launcher-xs text-muted-foreground">
              {gnomeExtension.path}
            </p>
          ) : null}
        </SettingsSection>
      ) : null}

      {/* ── Notes ── */}
      <SettingsSection
        title="Notes"
        description="Integration-specific warnings and information."
        icon={AlertTriangle}
        iconVariant="orange"
      >
        <div className="space-y-2 p-5">
          {(status?.notes.length ? status.notes : ["No additional integration notes."]).map(
            (note) => (
              <div
                key={note}
                className="rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-4 py-3 text-launcher-sm leading-5 text-muted-foreground"
              >
                {note}
              </div>
            ),
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
