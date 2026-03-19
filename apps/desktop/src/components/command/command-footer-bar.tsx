import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { requestLauncherActionsToggle } from "@/lib/launcher-actions";
import { Kbd } from "@/components/module/kbd";
import { Button } from "@/components/ui/button";

/** Individual footer action configuration */
export interface FooterAction {
  label: string;
  shortcut?: string[];
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
}

interface CommandFooterBarProps {
  /** Left slot content (typically app name or context) */
  leftSlot?: ReactNode;
  /** Primary action (bold text, shown first on right) */
  primaryAction?: FooterAction;
  /** Secondary actions (normal weight, shown after primary) */
  secondaryActions?: FooterAction[];
  /** Actions button (opens action panel, shown last with divider) */
  actionsButton?: FooterAction;
  /** Show default Cmd+K actions button when `actionsButton` is not supplied */
  showDefaultActionsButton?: boolean;
  /** Show default Cmd+K actions hint when no explicit actions button is supplied */
  showDefaultActionsHint?: boolean;
  /** Legacy: right slot for custom content */
  rightSlot?: ReactNode;
  /** Optional anchored overlay rendered above the footer (e.g. actions panel) */
  overlay?: ReactNode;
  className?: string;
  leftSlotClassName?: string;
  rightSlotClassName?: string;
}

const KEY_CLASS = cn(
  "inline-flex items-center justify-center min-w-5 h-4.5 px-1.25 rounded",
  "bg-[var(--kbd-bg)] text-[length:calc(var(--beam-font-size-base)*0.6923)] text-muted-foreground font-medium font-mono",
);

function ActionButton({
  action,
  isPrimary = false,
  dataSlot,
}: {
  action: FooterAction;
  isPrimary?: boolean;
  dataSlot?: string;
}) {
  const shortcuts = action.shortcut || [];

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      data-slot={dataSlot}
      onClick={() => {
        if (!action.disabled && action.onClick) {
          void Promise.resolve(action.onClick());
        }
      }}
      disabled={action.disabled}
      className={cn(
        "h-auto px-0 py-0 transition-colors",
        "flex items-center gap-1.5",
        isPrimary
          ? "text-foreground hover:text-muted-foreground"
          : "text-muted-foreground hover:text-muted-foreground",
        action.disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "text-[length:calc(var(--beam-font-size-base)*0.7692)] truncate max-w-[180px]",
          isPrimary ? "font-medium" : "font-normal",
        )}
      >
        {action.label}
      </span>
      {shortcuts.map((key) => (
        <Kbd key={`${action.label}-${key}`} className={KEY_CLASS}>
          {key}
        </Kbd>
      ))}
    </Button>
  );
}

function ActionHint({ action }: { action: FooterAction }) {
  const shortcuts = action.shortcut || [];

  return (
    <div className="flex items-center gap-1.5 text-[length:calc(var(--beam-font-size-base)*0.7692)] text-muted-foreground">
      <span className="truncate max-w-[180px]">{action.label}</span>
      {shortcuts.map((key) => (
        <Kbd key={`${action.label}-${key}`} className={KEY_CLASS}>
          {key}
        </Kbd>
      ))}
    </div>
  );
}

export function CommandFooterBar({
  leftSlot,
  primaryAction,
  secondaryActions,
  actionsButton,
  showDefaultActionsButton = false,
  showDefaultActionsHint = true,
  rightSlot,
  overlay,
  className,
  leftSlotClassName,
  rightSlotClassName,
}: CommandFooterBarProps) {
  const canUseDefaultActionsAffordance = rightSlot == null;
  const resolvedActionsButton =
    actionsButton ??
    (canUseDefaultActionsAffordance && showDefaultActionsButton
      ? {
          label: "Actions",
          shortcut: ["⌘", "K"],
          onClick: requestLauncherActionsToggle,
        }
      : undefined);
  const resolvedActionsHint =
    !resolvedActionsButton && canUseDefaultActionsAffordance && showDefaultActionsHint
      ? {
          label: "Actions",
          shortcut: ["⌘", "K"],
        }
      : undefined;

  const hasActions =
    primaryAction || secondaryActions?.length || resolvedActionsButton || resolvedActionsHint;
  const showDivider =
    Boolean(primaryAction || secondaryActions?.length) &&
    Boolean(resolvedActionsButton || resolvedActionsHint);

  return (
    <div
      className={cn(
        "sc-glass-footer relative flex h-[42px] shrink-0 items-center justify-between px-4 py-2.5",
        className,
      )}
    >
      {/* Left slot: app name or context */}
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 text-[length:calc(var(--beam-font-size-base)*0.7692)] font-normal text-muted-foreground",
          leftSlotClassName,
        )}
      >
        {leftSlot}
      </div>

      {/* Right slot: actions or legacy custom content */}
      <div className={cn("ml-3 flex items-center gap-3", rightSlotClassName)}>
        {hasActions ? (
          <>
            {/* Primary action (bold) */}
            {primaryAction && <ActionButton action={primaryAction} isPrimary />}

            {/* Secondary actions */}
            {secondaryActions?.map((action) => (
              <ActionButton key={action.label} action={action} />
            ))}

            {/* Divider before actions button */}
            {showDivider && <span className="h-5 w-px bg-[var(--ui-divider)] mx-0.5" />}

            {/* Actions button */}
            {resolvedActionsButton && (
              <ActionButton
                action={resolvedActionsButton}
                dataSlot="command-footer-actions-button"
              />
            )}

            {resolvedActionsHint ? <ActionHint action={resolvedActionsHint} /> : null}
          </>
        ) : (
          rightSlot
        )}
      </div>

      {overlay}
    </div>
  );
}
