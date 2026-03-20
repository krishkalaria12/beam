import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { SplitView } from "./split-view";

interface GenericListViewProps {
  list: ReactNode;
  detail?: ReactNode;
  detailVisible?: boolean;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
  listPaneClassName?: string;
  listPaneStyle?: CSSProperties;
  detailPaneClassName?: string;
  detailPaneStyle?: CSSProperties;
  detailRatio?: string;
  templateColumns?: string;
}

export function GenericListView({
  list,
  detail,
  detailVisible = false,
  footer,
  className,
  style,
  bodyClassName,
  bodyStyle,
  listPaneClassName,
  listPaneStyle,
  detailPaneClassName,
  detailPaneStyle,
  detailRatio = "53%",
  templateColumns,
}: GenericListViewProps) {
  return (
    <div
      className={cn(
        "module-generic-list-view min-h-0 flex flex-1 flex-col overflow-hidden",
        className,
      )}
      style={style}
    >
      <SplitView
        detailVisible={detailVisible}
        detail={detail}
        detailRatio={detailRatio}
        templateColumns={templateColumns}
        className={cn("module-generic-list-body min-h-0 flex-1", bodyClassName)}
        style={bodyStyle}
        primaryClassName={cn(
          "custom-scrollbar min-h-0 h-full overflow-y-auto overscroll-contain p-2",
          "module-generic-list-pane",
          listPaneClassName,
        )}
        primaryStyle={listPaneStyle}
        detailClassName={cn(
          "custom-scrollbar min-h-0 h-full overflow-y-auto overscroll-contain bg-[var(--launcher-card-bg)]",
          "module-generic-detail-pane",
          detailPaneClassName,
        )}
        detailStyle={detailPaneStyle}
        primary={list}
      />
      {footer}
    </div>
  );
}
