import { ArrowLeft, Search } from "lucide-react";
import type { CSSProperties, KeyboardEventHandler, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SearchInput } from "./search-input";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  title?: string;
  subtitle?: string;
  interactive?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  rightSlot?: ReactNode;
  className?: string;
  style?: CSSProperties;
  inputContainerClassName?: string;
  inputClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  backButtonClassName?: string;
  rightSlotClassName?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

export function SearchBar({
  value = "",
  onChange,
  placeholder = "Search...",
  title,
  subtitle,
  interactive = true,
  showBackButton = true,
  onBack,
  rightSlot,
  className,
  style,
  inputContainerClassName,
  inputClassName,
  titleClassName,
  subtitleClassName,
  backButtonClassName,
  rightSlotClassName,
  onKeyDown,
}: SearchBarProps) {
  return (
    <div
      className={cn(
        "module-search-bar",
        "flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-4",
        className,
      )}
      style={style}
    >
      {showBackButton && onBack ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Back"
          className={cn(
            "module-search-bar-back",
            "size-9 rounded-lg",
            "bg-[var(--launcher-card-bg)] text-muted-foreground",
            "hover:bg-[var(--launcher-chip-bg)] hover:text-foreground",
            "transition-all duration-200",
            backButtonClassName,
          )}
        >
          <ArrowLeft className="size-4" />
        </Button>
      ) : null}

      <div className="module-search-bar-main min-w-0 flex-1">
        {interactive ? (
          <SearchInput
            value={value}
            onChange={onChange ?? (() => {})}
            placeholder={placeholder}
            leftIcon={<Search />}
            className={cn("text-[13px]", inputClassName)}
            containerClassName={cn("h-10 rounded-xl", inputContainerClassName)}
            onKeyDown={onKeyDown}
          />
        ) : (
          <div
            className={cn(
              "module-search-bar-static",
              "flex h-10 min-w-0 items-center rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] px-3.5",
              inputContainerClassName,
            )}
          >
            <div className="module-search-bar-copy min-w-0">
              <div className={cn("module-search-bar-title truncate text-[14px] font-semibold text-foreground", titleClassName, inputClassName)}>
                {title}
              </div>
              {subtitle ? (
                <div className={cn("module-search-bar-subtitle truncate text-[12px] text-muted-foreground", subtitleClassName)}>
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {rightSlot ? <div className={cn("module-search-bar-right flex shrink-0 items-center gap-2", rightSlotClassName)}>{rightSlot}</div> : null}
    </div>
  );
}
