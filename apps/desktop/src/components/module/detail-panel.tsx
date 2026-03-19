import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DetailPanelProps {
  children: ReactNode;
  className?: string;
}

export function DetailPanel({ children, className }: DetailPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-hidden",
        "bg-[var(--launcher-card-bg)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface DetailPanelHeaderProps {
  children: ReactNode;
  className?: string;
}

function Header({ children, className }: DetailPanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center border-b border-[var(--ui-divider)] px-4",
        "text-launcher-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface DetailPanelContentProps {
  children: ReactNode;
  className?: string;
}

function Content({ children, className }: DetailPanelContentProps) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto p-4", className)}>{children}</div>;
}

interface DetailPanelActionsProps {
  children: ReactNode;
  className?: string;
}

function Actions({ children, className }: DetailPanelActionsProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-t border-[var(--ui-divider)] px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface DetailPanelEmptyProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

/** Placeholder shown when nothing is selected */
function Empty({
  icon,
  title = "Nothing selected",
  description,
  className,
}: DetailPanelEmptyProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && <div className="mb-1 text-muted-foreground/30 [&_svg]:size-10">{icon}</div>}
      <p className="text-launcher-md font-medium text-muted-foreground/60">{title}</p>
      {description && <p className="text-launcher-sm text-muted-foreground/40">{description}</p>}
    </div>
  );
}

DetailPanel.Header = Header;
DetailPanel.Content = Content;
DetailPanel.Actions = Actions;
DetailPanel.Empty = Empty;
