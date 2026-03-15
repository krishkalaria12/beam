import { File, FileText, FileCode, FileJson, Image, Search, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/module";
import type { SearchResult } from "../types";

interface FileListProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isLoading: boolean;
  query?: string;
  onOpen: (path: string) => void;
}

// File type categorization
type FileCategory = "code" | "config" | "doc" | "image" | "data" | "other";

interface FileTypeInfo {
  category: FileCategory;
  icon: ReactNode;
  color: string;
  bgColor: string;
  label: string;
}

function getFileTypeInfo(name: string): FileTypeInfo {
  const ext = name.lastIndexOf(".") > 0 ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";

  const typeMap: Record<string, FileTypeInfo> = {
    // TypeScript/JavaScript
    ts: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-primary-fg)]",
      bgColor: "bg-[var(--icon-primary-bg)]",
      label: "TS",
    },
    tsx: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-primary-fg)]",
      bgColor: "bg-[var(--icon-primary-bg)]",
      label: "TSX",
    },
    js: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
      label: "JS",
    },
    jsx: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
      label: "JSX",
    },
    // Other languages
    py: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-green-fg)]",
      bgColor: "bg-[var(--icon-green-bg)]",
      label: "PY",
    },
    rs: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
      label: "RS",
    },
    go: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-cyan-fg)]",
      bgColor: "bg-[var(--icon-cyan-bg)]",
      label: "GO",
    },
    java: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-red-fg)]",
      bgColor: "bg-[var(--icon-red-bg)]",
      label: "JAVA",
    },
    cpp: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
      label: "C++",
    },
    c: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-muted-foreground",
      bgColor: "bg-[var(--icon-neutral-bg)]",
      label: "C",
    },
    css: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
      label: "CSS",
    },
    html: {
      category: "code",
      icon: <FileCode className="size-4" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
      label: "HTML",
    },
    // Config
    json: {
      category: "config",
      icon: <FileJson className="size-4" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
      label: "JSON",
    },
    yaml: {
      category: "config",
      icon: <FileText className="size-4" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
      label: "YAML",
    },
    yml: {
      category: "config",
      icon: <FileText className="size-4" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
      label: "YML",
    },
    toml: {
      category: "config",
      icon: <FileText className="size-4" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
      label: "TOML",
    },
    xml: {
      category: "config",
      icon: <FileText className="size-4" />,
      color: "text-[var(--icon-green-fg)]",
      bgColor: "bg-[var(--icon-green-bg)]",
      label: "XML",
    },
    env: {
      category: "config",
      icon: <FileText className="size-4" />,
      color: "text-[var(--icon-green-fg)]",
      bgColor: "bg-[var(--icon-green-bg)]",
      label: "ENV",
    },
    // Docs
    md: {
      category: "doc",
      icon: <FileText className="size-4" />,
      color: "text-muted-foreground",
      bgColor: "bg-[var(--icon-neutral-bg)]",
      label: "MD",
    },
    txt: {
      category: "doc",
      icon: <FileText className="size-4" />,
      color: "text-muted-foreground",
      bgColor: "bg-[var(--icon-neutral-bg)]",
      label: "TXT",
    },
    pdf: {
      category: "doc",
      icon: <FileText className="size-4" />,
      color: "text-[var(--icon-red-fg)]",
      bgColor: "bg-[var(--icon-red-bg)]",
      label: "PDF",
    },
    // Images
    png: {
      category: "image",
      icon: <Image className="size-4" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
      label: "PNG",
    },
    jpg: {
      category: "image",
      icon: <Image className="size-4" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
      label: "JPG",
    },
    jpeg: {
      category: "image",
      icon: <Image className="size-4" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
      label: "JPEG",
    },
    svg: {
      category: "image",
      icon: <Image className="size-4" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
      label: "SVG",
    },
    gif: {
      category: "image",
      icon: <Image className="size-4" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
      label: "GIF",
    },
    webp: {
      category: "image",
      icon: <Image className="size-4" />,
      color: "text-[var(--icon-primary-fg)]",
      bgColor: "bg-[var(--icon-primary-bg)]",
      label: "WEBP",
    },
  };

  return (
    typeMap[ext] || {
      category: "other",
      icon: <File className="size-4" />,
      color: "text-muted-foreground",
      bgColor: "bg-muted/30",
      label: ext ? ext.toUpperCase() : "",
    }
  );
}

// Get parent folder name
function getParentFolder(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return "/";
  return parts[parts.length - 2] || "";
}

export function FileList({
  results,
  selectedIndex,
  onSelect,
  isLoading,
  query = "",
  onOpen,
}: FileListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll active item into view with proper boundary detection
  useEffect(() => {
    const activeItem = itemRefs.current[selectedIndex];
    const container = listRef.current;

    if (activeItem && container) {
      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();

      // Check if item is outside visible area
      if (itemRect.top < containerRect.top + 40) {
        activeItem.scrollIntoView({ block: "start", behavior: "smooth" });
      } else if (itemRect.bottom > containerRect.bottom - 8) {
        activeItem.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  // Reset refs when results change
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, results.length);
  }, [results.length]);

  // Loading state - with character
  if (isLoading && results.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="relative">
          <div className="absolute inset-0 animate-ping opacity-20">
            <div className="size-14 rounded-2xl bg-[var(--ring)]" />
          </div>
          <div
            className="relative flex size-14 items-center justify-center rounded-2xl 
            bg-[var(--launcher-card-bg)]
            border border-[var(--ring)]/20"
          >
            <Loader2 className="size-6 animate-spin text-[var(--ring)]" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-muted-foreground">Searching...</p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">Scanning local files</p>
        </div>
      </div>
    );
  }

  // Empty state - no query (initial)
  if (!query.trim()) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-[var(--launcher-card-bg)] blur-xl" />
          <div
            className="relative flex size-16 items-center justify-center rounded-2xl 
            bg-[var(--launcher-card-bg)]
            border border-[var(--ui-divider)]"
          >
            <Search className="size-6 text-muted-foreground/40" />
          </div>
        </div>
        <div className="text-center max-w-[180px]">
          <p className="text-[13px] font-semibold text-muted-foreground">Search your files</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/60 leading-relaxed">
            Type a filename or path to get started
          </p>
        </div>
      </div>
    );
  }

  // Empty state - no results
  if (results.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="relative">
          <div
            className="flex size-16 items-center justify-center rounded-2xl 
            bg-[var(--launcher-card-bg)]
            border border-[var(--ui-divider)]"
          >
            <File className="size-6 text-muted-foreground/30" />
          </div>
        </div>
        <div className="text-center max-w-[200px]">
          <p className="text-[13px] font-semibold text-muted-foreground">No matches found</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/60 leading-relaxed">
            Try different keywords or check the spelling
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden-until-hover" ref={listRef}>
      {/* Section header - refined */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-3 py-2.5
        bg-[var(--launcher-card-bg)]/95 backdrop-blur-sm
        border-b border-[var(--ui-divider)]"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-3 text-[var(--ring)]/60" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Results
          </span>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground/40 tabular-nums">
          {results.length}
        </span>
      </div>

      {/* File list - refined rows */}
      <div className="p-1.5 space-y-0.5">
        {results.map((result, index) => {
          const isSelected = index === selectedIndex;
          const typeInfo = getFileTypeInfo(result.entry.name);
          const parentFolder = getParentFolder(result.entry.path);

          return (
            <div
              key={result.entry.path}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              data-selected={isSelected}
              data-index={index}
              className={cn(
                "file-list-item group relative flex cursor-pointer items-center gap-3",
                "rounded-xl px-3 py-2.5",
                "transition-all duration-150 ease-out",
                isSelected
                  ? "bg-[var(--command-item-selected-bg)]"
                  : "hover:bg-[var(--command-item-hover-bg)]",
              )}
              onClick={() => onSelect(index)}
              onDoubleClick={() => onOpen(result.entry.path)}
            >
              {/* Selection indicator bar */}
              <div
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full",
                  "bg-[var(--ring)]",
                  "transition-all duration-200",
                  isSelected ? "h-8 opacity-100" : "h-0 opacity-0",
                )}
              />

              {/* File icon - distinctive styling */}
              <div
                className={cn(
                  "relative flex size-10 flex-shrink-0 items-center justify-center rounded-xl",
                  "transition-all duration-150",
                  typeInfo.bgColor,
                  isSelected && "ring-1 ring-[var(--launcher-card-border)]",
                )}
              >
                <span className={cn(typeInfo.color, "transition-colors")}>{typeInfo.icon}</span>

                {/* Type badge on icon */}
                {typeInfo.label && (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 px-1 py-px rounded text-[7px] font-bold",
                      "bg-[var(--launcher-card-bg)] border border-[var(--ui-divider)]",
                      typeInfo.color,
                      "uppercase tracking-wide",
                    )}
                  >
                    {typeInfo.label}
                  </span>
                )}
              </div>

              {/* File info - refined typography */}
              <div className="flex min-w-0 flex-1 flex-col">
                {/* File name - prominent */}
                <span
                  className={cn(
                    "truncate text-[13px] font-semibold leading-tight tracking-[-0.01em]",
                    isSelected ? "text-secondary-foreground" : "text-foreground",
                  )}
                >
                  {result.entry.name}
                </span>

                {/* Location - subtle with folder icon */}
                <span
                  className={cn(
                    "truncate text-[11px] leading-tight mt-0.5",
                    "flex items-center gap-1",
                    isSelected ? "text-secondary-foreground/80" : "text-muted-foreground/50",
                  )}
                >
                  <span
                    className={
                      isSelected ? "text-secondary-foreground/60" : "text-muted-foreground/40"
                    }
                  >
                    in
                  </span>
                  <span className="font-medium">{parentFolder || "/"}</span>
                </span>
              </div>

              {/* Right side - keyboard hint on selected */}
              {isSelected && (
                <div className="flex items-center gap-1 opacity-60">
                  <Kbd
                    className="flex size-5 items-center justify-center rounded
                    text-[10px] font-medium text-secondary-foreground/70"
                  >
                    ↵
                  </Kbd>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom padding for scroll */}
      <div className="h-2" />
    </div>
  );
}
