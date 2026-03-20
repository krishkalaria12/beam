import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormViewProps {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  maxWidthClassName?: string;
  maxWidthStyle?: CSSProperties;
}

export function FormView({
  children,
  footer,
  className,
  style,
  contentClassName,
  contentStyle,
  maxWidthClassName,
  maxWidthStyle,
}: FormViewProps) {
  return (
    <div
      className={cn("module-form-view min-h-0 flex flex-1 flex-col overflow-hidden", className)}
      style={style}
    >
      <div
        className={cn(
          "module-form-view-content",
          "custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5",
          contentClassName,
        )}
        style={contentStyle}
      >
        <div
          className={cn(
            "module-form-view-width mx-auto w-full max-w-2xl space-y-4",
            maxWidthClassName,
          )}
          style={maxWidthStyle}
        >
          {children}
        </div>
      </div>
      {footer}
    </div>
  );
}
