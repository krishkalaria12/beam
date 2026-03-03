import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  FileText,
  ImageIcon,
  Link,
  Clipboard,
} from "lucide-react";
import { ClipboardContentType, type ClipboardHistoryEntry } from "../types";
import { cn } from "@/lib/utils";

interface ClipboardDetailsProps {
  entry: ClipboardHistoryEntry | null;
  isCopied: boolean;
  copyError: string | null;
  onCopy: () => void;
}

const getEntryIconConfig = (type: ClipboardContentType) => {
  switch (type) {
    case ClipboardContentType.Image:
      return {
        icon: <ImageIcon className="size-4" />,
        gradient: "from-amber-500/25 to-orange-500/25",
        label: "Image",
      };
    case ClipboardContentType.Link:
      return {
        icon: <Link className="size-4" />,
        gradient: "from-emerald-500/25 to-teal-500/25",
        label: "Link",
      };
    default:
      return {
        icon: <FileText className="size-4" />,
        gradient: "from-blue-500/25 to-cyan-500/25",
        label: "Text",
      };
  }
};

export function ClipboardDetails({ entry, isCopied, copyError, onCopy }: ClipboardDetailsProps) {
  if (!entry) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] ring-1 ring-[var(--launcher-card-border)]">
          <Clipboard className="size-7 text-foreground/15" />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-medium tracking-[-0.01em] text-foreground/40">
            Select an entry
          </p>
          <p className="mt-1 text-[11px] text-foreground/20">View details and copy to clipboard</p>
        </div>
      </div>
    );
  }

  const iconConfig = getEntryIconConfig(entry.content_type);

  return (
    <div className="clipboard-details-panel flex flex-1 flex-col min-w-0 h-full">
      {/* Content Preview - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {entry.content_type === ClipboardContentType.Image ? (
          <div className="flex w-full justify-center">
            <div className="relative max-w-full overflow-hidden rounded-xl ring-1 ring-[var(--launcher-card-border)] shadow-2xl">
              <img
                src={entry.value}
                alt="Preview"
                className="max-w-full object-contain block h-auto"
              />
            </div>
          </div>
        ) : (
          <div className="w-full text-[14px] font-normal leading-relaxed tracking-[-0.01em] text-foreground/75 whitespace-pre-wrap break-words">
            {entry.value}
          </div>
        )}
      </div>

      {/* Info Section - Fixed at bottom */}
      <div className="shrink-0 border-t border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] p-5">
        {/* Copy Button & Status */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg bg-gradient-to-br text-foreground/70",
                iconConfig.gradient,
              )}
            >
              {iconConfig.icon}
            </div>
            <div>
              <p className="text-[12px] font-semibold text-foreground/80 capitalize">
                {entry.content_type}
              </p>
              <p className="text-[11px] text-foreground/35">
                {formatDistanceToNow(new Date(entry.copied_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          <button
            onClick={onCopy}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-200",
              isCopied
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                : "bg-[var(--ring)]/15 text-[var(--ring)] ring-1 ring-[var(--ring)]/20 hover:bg-[var(--ring)]/25",
            )}
          >
            {isCopied ? (
              <>
                <Check className="size-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Status Messages */}
        {copyError && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] font-medium text-red-400 ring-1 ring-red-500/20">
            {copyError}
          </div>
        )}

        {/* Metadata Grid */}
        <div className="space-y-3">
          {/* Divider with label */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/30">
              Details
            </span>
            <div className="h-px flex-1 bg-[var(--launcher-card-hover-bg)]" />
          </div>

          {/* Metadata rows */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-foreground/40">Copied</span>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-foreground/70">
                <Clock className="size-3 text-foreground/30" />
                {formatDistanceToNow(new Date(entry.copied_at), { addSuffix: true })}
              </span>
            </div>

            {entry.content_type !== ClipboardContentType.Image && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-foreground/40">Characters</span>
                  <span className="text-[12px] font-mono font-medium text-foreground/70">
                    {entry.character_count.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-foreground/40">Words</span>
                  <span className="text-[12px] font-mono font-medium text-foreground/70">
                    {entry.word_count.toLocaleString()}
                  </span>
                </div>
              </>
            )}

            {entry.content_type === ClipboardContentType.Link && (
              <div className="flex items-center justify-between pt-2 border-t border-[var(--launcher-card-border)]">
                <span className="text-[12px] text-foreground/40">Action</span>
                <a
                  href={entry.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--ring)] hover:underline transition-colors"
                >
                  Open Link
                  <ArrowUpRight className="size-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
