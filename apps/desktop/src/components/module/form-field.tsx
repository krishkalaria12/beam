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
    <div className={cn("module-form-field space-y-1.5", className)}>
      {label ? (
        <div
          className={cn(
            "module-form-field-label text-launcher-sm font-medium text-muted-foreground",
            labelClassName,
          )}
        >
          {label}
        </div>
      ) : null}
      <div className={cn("module-form-field-body", bodyClassName)}>{children}</div>
      {description || error ? (
        <div className={cn("module-form-field-meta space-y-1", metaClassName)}>
          {error ? (
            <p className="module-form-field-error text-launcher-xs text-[var(--icon-red-fg)]">
              {error}
            </p>
          ) : null}
          {description ? (
            <p className="module-form-field-description text-launcher-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface FormSeparatorProps {
  className?: string;
}

function Separator({ className }: FormSeparatorProps) {
  return (
    <div className={cn("module-form-separator h-px w-full bg-[var(--ui-divider)]", className)} />
  );
}

FormField.Separator = Separator;
