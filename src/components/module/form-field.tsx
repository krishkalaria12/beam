import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormFieldProps {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  className?: string;
  labelClassName?: string;
  bodyClassName?: string;
  metaClassName?: string;
  children: ReactNode;
}

export function FormField({
  label,
  description,
  error,
  className,
  labelClassName,
  bodyClassName,
  metaClassName,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <div className={cn("text-[12px] font-medium text-muted-foreground", labelClassName)}>
          {label}
        </div>
      ) : null}
      <div className={cn(bodyClassName)}>{children}</div>
      {description || error ? (
        <div className={cn("space-y-1", metaClassName)}>
          {error ? <p className="text-[11px] text-[var(--icon-red-fg)]">{error}</p> : null}
          {description ? <p className="text-[11px] text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

interface FormSeparatorProps {
  className?: string;
}

function Separator({ className }: FormSeparatorProps) {
  return <div className={cn("h-px w-full bg-[var(--ui-divider)]", className)} />;
}

FormField.Separator = Separator;
