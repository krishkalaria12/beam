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
      color: "text-blue-400",
      bgColor: "from-blue-500/20 to-blue-500/5",
    },
    tsx: {
      type: "TypeScript React",
      icon: <FileCode className="size-8" />,
      color: "text-blue-400",
      bgColor: "from-blue-500/20 to-blue-500/5",
    },
    js: {
      type: "JavaScript",
      icon: <FileCode className="size-8" />,
      color: "text-yellow-400",
      bgColor: "from-yellow-500/20 to-yellow-500/5",
    },
    jsx: {
      type: "JavaScript React",
      icon: <FileCode className="size-8" />,
      color: "text-yellow-400",
      bgColor: "from-yellow-500/20 to-yellow-500/5",
    },
    py: {
      type: "Python",
      icon: <FileCode className="size-8" />,
      color: "text-green-400",
      bgColor: "from-green-500/20 to-green-500/5",
    },
    rs: {
      type: "Rust",
      icon: <FileCode className="size-8" />,
      color: "text-orange-400",
      bgColor: "from-orange-500/20 to-orange-500/5",
    },
    go: {
      type: "Go",
      icon: <FileCode className="size-8" />,
      color: "text-cyan-400",
      bgColor: "from-cyan-500/20 to-cyan-500/5",
    },
    css: {
      type: "Stylesheet",
      icon: <FileCode className="size-8" />,
      color: "text-pink-400",
      bgColor: "from-pink-500/20 to-pink-500/5",
    },
    html: {
      type: "HTML",
      icon: <FileCode className="size-8" />,
      color: "text-orange-400",
      bgColor: "from-orange-500/20 to-orange-500/5",
    },
    // Config
    json: {
      type: "JSON",
      icon: <FileJson className="size-8" />,
      color: "text-yellow-300",
      bgColor: "from-yellow-500/20 to-yellow-500/5",
    },
    yaml: {
      type: "YAML",
      icon: <FileText className="size-8" />,
      color: "text-pink-400",
      bgColor: "from-pink-500/20 to-pink-500/5",
    },
    yml: {
      type: "YAML",
      icon: <FileText className="size-8" />,
      color: "text-pink-400",
      bgColor: "from-pink-500/20 to-pink-500/5",
    },
    toml: {
      type: "TOML",
      icon: <FileText className="size-8" />,
      color: "text-orange-300",
      bgColor: "from-orange-500/20 to-orange-500/5",
    },
    // Docs
    md: {
      type: "Markdown",
      icon: <FileText className="size-8" />,
      color: "text-slate-300",
      bgColor: "from-slate-500/20 to-slate-500/5",
    },
    txt: {
      type: "Plain Text",
      icon: <FileText className="size-8" />,
      color: "text-slate-400",
      bgColor: "from-slate-500/20 to-slate-500/5",
    },
    pdf: {
      type: "PDF Document",
      icon: <FileText className="size-8" />,
      color: "text-red-400",
      bgColor: "from-red-500/20 to-red-500/5",
    },
    // Images
    png: {
      type: "PNG Image",
      icon: <Image className="size-8" />,
      color: "text-purple-400",
      bgColor: "from-purple-500/20 to-purple-500/5",
    },
    jpg: {
      type: "JPEG Image",
      icon: <Image className="size-8" />,
      color: "text-purple-400",
      bgColor: "from-purple-500/20 to-purple-500/5",
    },
    jpeg: {
      type: "JPEG Image",
      icon: <Image className="size-8" />,
      color: "text-purple-400",
      bgColor: "from-purple-500/20 to-purple-500/5",
    },
    svg: {
      type: "SVG Image",
      icon: <Image className="size-8" />,
      color: "text-orange-400",
      bgColor: "from-orange-500/20 to-orange-500/5",
    },
    gif: {
      type: "GIF Image",
      icon: <Image className="size-8" />,
      color: "text-pink-400",
      bgColor: "from-pink-500/20 to-pink-500/5",
    },
    webp: {
      type: "WebP Image",
      icon: <Image className="size-8" />,
      color: "text-blue-400",
      bgColor: "from-blue-500/20 to-blue-500/5",
    },
  };

  return (
    typeMap[ext] || {
      type: ext ? `${ext.toUpperCase()} File` : "File",
      icon: <FileIcon className="size-8" />,
      color: "text-muted-foreground",
      bgColor: "from-slate-500/20 to-slate-500/5",
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
          <div className="absolute -inset-6 rounded-full bg-gradient-radial from-muted/20 to-transparent blur-2xl" />
          <div
            className="relative flex size-20 items-center justify-center rounded-2xl 
            bg-gradient-to-br from-[var(--command-item-hover-bg)] to-[var(--command-item-selected-bg)]
            border border-[var(--ui-divider)]"
          >
            <FileIcon className="size-8 text-muted-foreground/25" />
          </div>
        </div>
        <div className="mt-5 text-center max-w-[200px]">
          <p className="text-[13px] font-semibold text-foreground/70">No file selected</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/50 leading-relaxed">
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
        {/* Large file icon with gradient background */}
        <div className="relative mb-5">
          {/* Glow effect */}
          <div
            className={cn(
              "absolute -inset-4 rounded-3xl blur-2xl opacity-40",
              `bg-gradient-to-br ${fileInfo.bgColor}`,
            )}
          />

          {/* Icon container */}
          <div
            className={cn(
              "relative flex size-24 items-center justify-center rounded-2xl",
              `bg-gradient-to-br ${fileInfo.bgColor}`,
              "border border-white/5",
              "shadow-lg shadow-black/20",
            )}
          >
            <span className={fileInfo.color}>{fileInfo.icon}</span>
          </div>
        </div>

        {/* File name - prominent */}
        <h2
          className="max-w-full text-center text-[18px] font-bold leading-tight text-foreground 
          break-all tracking-[-0.02em]"
        >
          {selectedFile.name}
        </h2>

        {/* File type badge */}
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-semibold",
              "bg-[var(--command-item-hover-bg)] border border-[var(--ui-divider)]",
              fileInfo.color,
            )}
          >
            {fileInfo.type}
          </span>
          <span className="text-[11px] text-muted-foreground/50">
            {formatBytes(selectedFile.size)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[var(--ui-divider)] to-transparent" />

      {/* Metadata section */}
      <div className="flex-1 p-5 space-y-4">
        {/* Quick stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--command-item-hover-bg)]/50 p-3 border border-[var(--ui-divider)]">
            <div className="flex items-center gap-2 mb-1.5">
              <HardDrive className="size-3.5 text-muted-foreground/50" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                Size
              </span>
            </div>
            <p className="text-[14px] font-bold text-foreground/90">
              {formatBytes(selectedFile.size)}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--command-item-hover-bg)]/50 p-3 border border-[var(--ui-divider)]">
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="size-3.5 text-muted-foreground/50" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                Modified
              </span>
            </div>
            <p className="text-[13px] font-semibold text-foreground/90">
              {formatDate(selectedFile.modified)}
            </p>
          </div>
        </div>

        {/* Location card */}
        <div className="rounded-xl bg-[var(--command-item-hover-bg)]/50 p-3 border border-[var(--ui-divider)]">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="size-3.5 text-muted-foreground/50" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Location
            </span>
          </div>
          <p className="text-[12px] font-medium text-foreground/80 break-all leading-relaxed">
            {directory}
          </p>
        </div>

        {/* Full path - expandable */}
        <div className="rounded-xl bg-[var(--solid-bg-base,var(--background))]/50 p-3 border border-[var(--ui-divider)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Full Path
            </span>
            <button
              className="flex items-center gap-1 px-1.5 py-0.5 rounded 
              text-[10px] font-medium text-muted-foreground/60 
              hover:bg-[var(--command-item-hover-bg)] hover:text-foreground
              transition-colors"
            >
              <Copy className="size-3" />
              Copy
            </button>
          </div>
          <code
            className="block text-[11px] font-mono text-muted-foreground/70 break-all leading-relaxed
            selection:bg-[var(--solid-accent,#4ea2ff)]/30"
          >
            {selectedFile.path}
          </code>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <button
            className="flex-1 flex items-center justify-center gap-2 
            h-9 rounded-xl border border-[var(--ui-divider)]
            bg-[var(--command-item-hover-bg)]/50
            text-[12px] font-medium text-muted-foreground
            hover:bg-[var(--command-item-selected-bg)] hover:text-foreground
            transition-all duration-150 active:scale-[0.98]"
          >
            <ExternalLink className="size-3.5" />
            Reveal in Finder
          </button>
        </div>
      </div>
    </div>
  );
}
