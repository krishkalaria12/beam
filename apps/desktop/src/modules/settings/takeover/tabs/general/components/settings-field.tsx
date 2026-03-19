import type { ElementType, ReactNode } from "react";

import { IconChip, type IconChipVariant } from "@/components/module";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────
 *  SettingsSection — Card wrapper for a group
 * ──────────────────────────────────────────── */

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: ElementType;
  iconVariant?: IconChipVariant;
  /** Extra controls rendered in the header row (e.g. count pill, refresh button) */
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  icon: Icon,
  iconVariant = "neutral",
  headerAction,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <div
      className={cn(
        "settings-panel settings-section overflow-hidden rounded-2xl bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]",
        className,
      )}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 border-b border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]/30 px-5 py-4">
        {Icon && (
          <IconChip variant={iconVariant} size="md" className="rounded-xl">
            <Icon className="size-4" />
          </IconChip>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-launcher-md font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-launcher-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {headerAction}
      </div>

      {/* Body */}
      <div className="settings-section-body">{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────
 *  SettingsField — Label-left / control-right row
 *  Inspired by Vicinae's FormField pattern
 * ──────────────────────────────────────────── */

interface SettingsFieldProps {
  label: string;
  description?: string;
  /** Pill badge shown next to the label */
  badge?: string;
  /** The control on the right side */
  children: ReactNode;
  /** Full-width control below the label instead of inline */
  stacked?: boolean;
  className?: string;
}

export function SettingsField({
  label,
  description,
  badge,
  children,
  stacked = false,
  className,
}: SettingsFieldProps) {
  if (stacked) {
    return (
      <div className={cn("settings-field space-y-3 px-5 py-4", className)}>
        <div className="flex items-center gap-2">
          <span className="text-launcher-sm font-medium tracking-[-0.01em] text-foreground">
            {label}
          </span>
          {badge && (
            <span className="rounded-full border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2 py-0.5 text-launcher-2xs font-medium text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-launcher-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
        <div className="min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "settings-field flex items-center justify-between gap-4 px-5 py-3.5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-launcher-sm font-medium tracking-[-0.01em] text-foreground">
            {label}
          </span>
          {badge && (
            <span className="rounded-full border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-2 py-0.5 text-launcher-2xs font-medium text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-launcher-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────
 *  SettingsDivider — Thin line between fields
 * ──────────────────────────────────────────── */

export function SettingsDivider() {
  return <div className="mx-5 h-px bg-[var(--launcher-card-border)]/60" />;
}

/* ────────────────────────────────────────────
 *  SettingsSubLabel — Section sub-header inside body
 * ──────────────────────────────────────────── */

interface SettingsSubLabelProps {
  children: string;
  className?: string;
}

export function SettingsSubLabel({ children, className }: SettingsSubLabelProps) {
  return (
    <div className={cn("flex items-center gap-3 px-5 pt-4 pb-1", className)}>
      <span className="text-launcher-2xs font-semibold uppercase tracking-[0.10em] text-muted-foreground">
        {children}
      </span>
      <div className="h-px flex-1 bg-[var(--launcher-card-border)]/40" />
    </div>
  );
}

/* ────────────────────────────────────────────
 *  SettingsHint — Footnote-style hint text
 * ──────────────────────────────────────────── */

interface SettingsHintProps {
  children: ReactNode;
  className?: string;
}

export function SettingsHint({ children, className }: SettingsHintProps) {
  return (
    <p
      className={cn(
        "px-5 pb-4 pt-1 text-launcher-xs leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
