import {
  FileIcon,
  FileCode,
  FileText,
  FileJson,
  Image,
  Calendar,
  HardDrive,
  FolderOpen,
  Copy,
  ExternalLink,
} from "lucide-react";
import type { FileEntry } from "../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileDetailsProps {
  selectedFile: FileEntry | null;
}

// Format bytes with appropriate unit
const formatBytes = (bytes: number): string => {
  if (!+bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${sizes[i]}`;
};

// Format date nicely
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return `Today at ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  } else if (days === 1) {
    return `Yesterday at ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
};

// Get file type info for display
function getFileDisplayInfo(name: string): {
  type: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
} {
  const ext = name.lastIndexOf(".") > 0 ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";

  const typeMap: Record<
    string,
    { type: string; icon: React.ReactNode; color: string; bgColor: string }
  > = {
    // Code
    ts: {
      type: "TypeScript",
      icon: <FileCode className="size-8" />,
      color: "text-[var(--icon-primary-fg)]",
      bgColor: "bg-[var(--icon-primary-bg)]",
    },
    tsx: {
      type: "TypeScript React",
      icon: <FileCode className="size-8" />,
      color: "text-[var(--icon-primary-fg)]",
      bgColor: "bg-[var(--icon-primary-bg)]",
    },
    js: {
      type: "JavaScript",
      icon: <FileCode className="size-8" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
    },
    jsx: {
      type: "JavaScript React",
      icon: <FileCode className="size-8" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
    },
    py: {
      type: "Python",
      icon: <FileCode className="size-8" />,
      color: "text-[var(--icon-green-fg)]",
      bgColor: "bg-[var(--icon-green-bg)]",
    },
    rs: {
      type: "Rust",
      icon: <FileCode className="size-8" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
    },
    go: {
      type: "Go",
      icon: <FileCode className="size-8" />,
      color: "text-[var(--icon-cyan-fg)]",
      bgColor: "bg-[var(--icon-cyan-bg)]",
    },
    css: {
      type: "Stylesheet",
      icon: <FileCode className="size-8" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
    },
    html: {
      type: "HTML",
      icon: <FileCode className="size-8" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
    },
    // Config
    json: {
      type: "JSON",
      icon: <FileJson className="size-8" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
    },
    yaml: {
      type: "YAML",
      icon: <FileText className="size-8" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
    },
    yml: {
      type: "YAML",
      icon: <FileText className="size-8" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
    },
    toml: {
      type: "TOML",
      icon: <FileText className="size-8" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
    },
    // Docs
    md: {
      type: "Markdown",
      icon: <FileText className="size-8" />,
      color: "text-muted-foreground",
      bgColor: "bg-[var(--icon-neutral-bg)]",
    },
    txt: {
      type: "Plain Text",
      icon: <FileText className="size-8" />,
      color: "text-muted-foreground",
      bgColor: "bg-[var(--icon-neutral-bg)]",
    },
    pdf: {
      type: "PDF Document",
      icon: <FileText className="size-8" />,
      color: "text-[var(--icon-red-fg)]",
      bgColor: "bg-[var(--icon-red-bg)]",
    },
    // Images
    png: {
      type: "PNG Image",
      icon: <Image className="size-8" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
    },
    jpg: {
      type: "JPEG Image",
      icon: <Image className="size-8" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
    },
    jpeg: {
      type: "JPEG Image",
      icon: <Image className="size-8" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
    },
    svg: {
      type: "SVG Image",
      icon: <Image className="size-8" />,
      color: "text-[var(--icon-orange-fg)]",
      bgColor: "bg-[var(--icon-orange-bg)]",
    },
    gif: {
      type: "GIF Image",
      icon: <Image className="size-8" />,
      color: "text-[var(--icon-purple-fg)]",
      bgColor: "bg-[var(--icon-purple-bg)]",
    },
    webp: {
      type: "WebP Image",
      icon: <Image className="size-8" />,
      color: "text-[var(--icon-primary-fg)]",
      bgColor: "bg-[var(--icon-primary-bg)]",
    },
  };

  return (
    typeMap[ext] || {
      type: ext ? `${ext.toUpperCase()} File` : "File",
      icon: <FileIcon className="size-8" />,
      color: "text-muted-foreground",
      bgColor: "bg-[var(--icon-neutral-bg)]",
    }
  );
}

// Get directory from path
const getDirectory = (path: string): string => {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash <= 0) return "/";
  return path.slice(0, lastSlash);
};

export function FileDetails({ selectedFile }: FileDetailsProps) {
  // Empty state - refined
  if (!selectedFile) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <div className="relative">
          <div className="absolute -inset-6 rounded-full bg-gradient-radial blur-2xl" />
          <div
            className="relative flex size-20 items-center justify-center rounded-2xl 
            bg-[var(--launcher-card-bg)]
            border border-[var(--ui-divider)]"
          >
            <FileIcon className="size-8 text-muted-foreground/25" />
          </div>
        </div>
        <div className="mt-5 text-center max-w-[200px]">
          <p className="text-launcher-md font-semibold text-muted-foreground">No file selected</p>
          <p className="mt-1.5 text-launcher-xs text-muted-foreground/50 leading-relaxed">
            Select a file from the list to view its details
          </p>
        </div>
      </div>
    );
  }

  const fileInfo = getFileDisplayInfo(selectedFile.name);
  const directory = getDirectory(selectedFile.path);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto scrollbar-hidden-until-hover">
      {/* Hero section - file preview */}
      <div className="flex flex-col items-center justify-center px-6 pt-8 pb-6">
        {/* Large file icon preview */}
        <div className="relative mb-5">
          {/* Glow effect */}
          <div
            className={cn(
              "absolute -inset-4 rounded-3xl blur-2xl opacity-40",
              `bg-[var(--launcher-card-bg)] ${fileInfo.bgColor}`,
            )}
          />

          {/* Icon container */}
          <div
            className={cn(
              "relative flex size-24 items-center justify-center rounded-2xl",
              `bg-[var(--launcher-card-bg)] ${fileInfo.bgColor}`,
              "border border-[var(--launcher-card-border)]",
              "shadow-lg shadow-black/20",
            )}
          >
            <span className={fileInfo.color}>{fileInfo.icon}</span>
          </div>
        </div>

        {/* File name - prominent */}
        <h2
          className="max-w-full text-center text-launcher-3xl font-bold leading-tight text-foreground 
          break-all tracking-[-0.02em]"
        >
          {selectedFile.name}
        </h2>

        {/* File type badge */}
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              "px-2.5 py-1 rounded-lg text-launcher-xs font-semibold",
              "bg-[var(--command-item-hover-bg)] border border-[var(--ui-divider)]",
              "text-foreground",
            )}
          >
            {fileInfo.type}
          </span>
          <span className="text-launcher-xs text-muted-foreground/50">
            {formatBytes(selectedFile.size)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-[var(--launcher-card-bg)]" />

      {/* Metadata section */}
      <div className="flex-1 p-5 space-y-4">
        {/* Quick stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--command-item-hover-bg)]/50 p-3 border border-[var(--ui-divider)]">
            <div className="flex items-center gap-2 mb-1.5">
              <HardDrive className="size-3.5 text-muted-foreground/50" />
              <span className="text-launcher-2xs font-semibold uppercase tracking-wider text-muted-foreground/50">
                Size
              </span>
            </div>
            <p className="text-launcher-lg font-bold text-foreground">
              {formatBytes(selectedFile.size)}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--command-item-hover-bg)]/50 p-3 border border-[var(--ui-divider)]">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="size-3.5 text-muted-foreground/50" />
              <span className="text-launcher-2xs font-semibold uppercase tracking-wider text-muted-foreground/50">
                Modified
              </span>
            </div>
            <p className="text-launcher-md font-semibold text-foreground">
              {formatDate(selectedFile.modified)}
            </p>
          </div>
        </div>

        {/* Location card */}
        <div className="rounded-xl bg-[var(--command-item-hover-bg)]/50 p-3 border border-[var(--ui-divider)]">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="size-3.5 text-muted-foreground/50" />
            <span className="text-launcher-2xs font-semibold uppercase tracking-wider text-muted-foreground/50">
              Location
            </span>
          </div>
          <p className="text-launcher-sm font-medium text-muted-foreground break-all leading-relaxed">
            {directory}
          </p>
        </div>

        {/* Full path - expandable */}
        <div className="rounded-xl bg-[var(--launcher-card-bg)]/50 p-3 border border-[var(--ui-divider)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-launcher-2xs font-semibold uppercase tracking-wider text-muted-foreground/50">
              Full Path
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded 
              text-launcher-2xs font-medium text-muted-foreground/60 
              hover:bg-[var(--command-item-hover-bg)] hover:text-foreground
              transition-colors"
            >
              <Copy className="size-3" />
              Copy
            </Button>
          </div>
          <code
            className="block text-launcher-xs font-mono text-muted-foreground/70 break-all leading-relaxed
            selection:bg-[var(--ring)]/30"
          >
            {selectedFile.path}
          </code>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 flex items-center justify-center gap-2 
            h-9 rounded-xl border border-[var(--ui-divider)]
            bg-[var(--command-item-hover-bg)]/50
            text-launcher-sm font-medium text-muted-foreground
            hover:bg-[var(--command-item-selected-bg)] hover:text-foreground
            transition-all duration-150 active:scale-[0.98]"
          >
            <ExternalLink className="size-3.5" />
            Reveal in Finder
          </Button>
        </div>
      </div>
    </div>
  );
}
