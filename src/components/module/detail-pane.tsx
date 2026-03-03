import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DetailPaneProps {
  children: ReactNode;
  className?: string;
}

/**
 * The right-side detail/preview panel used in split-pane module layouts
 * (clipboard, snippets, file-search, todo, etc.).
 *
 * Uses `--solid-bg-recessed` / `--launcher-card-bg` for the background and
 * `--ui-divider` as the left border (via the parent panel's border-r),
 * so it responds correctly to solid, glassy, and user-defined themes.
 *
 * @example
 * // Before (file-search-view.tsx):
 * <div className="file-search-detail-pane flex-1 overflow-hidden bg-[var(--solid-bg-recessed,transparent)]">
 *   <FileDetails selectedFile={selectedFile} />
 * </div>
 *
 * // After:
 * <DetailPane>
 *   <FileDetails selectedFile={selectedFile} />
 * </DetailPane>
 */
export function DetailPane({ children, className }: DetailPaneProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-hidden",
        "bg-[var(--solid-bg-recessed,var(--launcher-card-bg))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compound sub-components
// ---------------------------------------------------------------------------

interface DetailPaneHeaderProps {
  children: ReactNode;
  className?: string;
}

function Header({ children, className }: DetailPaneHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center border-b border-[var(--ui-divider)] px-4",
        "text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface DetailPaneContentProps {
  children: ReactNode;
  className?: string;
}

function Content({ children, className }: DetailPaneContentProps) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto p-4", className)}>{children}</div>
  );
}

interface DetailPaneActionsProps {
  children: ReactNode;
  className?: string;
}

function Actions({ children, className }: DetailPaneActionsProps) {
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

interface DetailPaneEmptyProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

/** Placeholder shown when nothing is selected */
function Empty({ icon, title = "Nothing selected", description, className }: DetailPaneEmptyProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-1 text-muted-foreground/30 [&_svg]:size-10">{icon}</div>
      )}
      <p className="text-[13px] font-medium text-muted-foreground/60">{title}</p>
      {description && (
        <p className="text-[12px] text-muted-foreground/40">{description}</p>
      )}
    </div>
  );
}

DetailPane.Header = Header;
DetailPane.Content = Content;
DetailPane.Actions = Actions;
DetailPane.Empty = Empty;
