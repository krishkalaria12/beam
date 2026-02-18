import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, Check, Clock, Copy, FileText, ImageIcon, Info, Link } from "lucide-react";
import { ClipboardContentType, type ClipboardHistoryEntry } from "../types";

interface ClipboardDetailsProps {
  entry: ClipboardHistoryEntry | null;
  isCopied: boolean;
  copyError: string | null;
  onCopy: () => void;
}

const getEntryIcon = (type: ClipboardContentType) => {
  switch (type) {
    case ClipboardContentType.Image:
      return <ImageIcon className="size-3.5" />;
    case ClipboardContentType.Link:
      return <Link className="size-3.5" />;
    default:
      return <FileText className="size-3.5" />;
  }
};

export function ClipboardDetails({ entry, isCopied, copyError, onCopy }: ClipboardDetailsProps) {
  if (!entry) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
        <div className="size-16 rounded-3xl bg-muted/10 flex items-center justify-center border border-border/20">
          <Info className="size-8 opacity-20" />
        </div>
        <p className="text-sm font-medium tracking-tight">Select an entry to view details</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background/20 flex flex-col min-w-0 h-full">
      {/* Content Preview - This part is scrollable */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col min-h-0">
        {entry.content_type === ClipboardContentType.Image ? (
          <div className="w-full flex justify-center">
            <div className="relative max-w-full rounded-xl overflow-hidden border border-border/40 shadow-2xl bg-grid-pattern/5">
              <img
                src={entry.value}
                alt="Preview"
                className="max-w-full object-contain block h-auto"
              />
            </div>
          </div>
        ) : (
          <div className="w-full text-[15px] font-normal text-foreground/80 leading-relaxed whitespace-pre-wrap wrap-break-word">
            {entry.value}
          </div>
        )}
      </div>

      {/* Info Section - Fixed at the bottom */}
      <div className="border-t border-border/30 bg-muted/5 p-6 space-y-5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
            <Info className="size-3" />
            <span>Information</span>
          </div>
          <button
            onClick={onCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-xs font-bold uppercase tracking-wider group"
          >
            {isCopied ? (
              <>
                <Check className="size-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 transition-transform group-hover:scale-110" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        {copyError ? (
          <p className="text-[11px] font-medium text-destructive/90">{copyError}</p>
        ) : isCopied ? (
          <p className="text-[11px] font-medium text-emerald-500/90">Entry copied to clipboard</p>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground/60">Copied</span>
            <span className="font-medium flex items-center gap-1.5 text-foreground/90">
              <Clock className="size-3.5 text-muted-foreground/40" />
              {formatDistanceToNow(new Date(entry.copied_at), { addSuffix: true })}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground/60">Content type</span>
            <span className="font-medium capitalize flex items-center gap-2 text-foreground/90">
              <div className="p-1 rounded bg-muted/20 text-muted-foreground/80">
                {getEntryIcon(entry.content_type)}
              </div>
              {entry.content_type}
            </span>
          </div>

          {entry.content_type !== ClipboardContentType.Image && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground/60">Characters</span>
                <span className="font-mono text-foreground/90">{entry.character_count}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground/60">Words</span>
                <span className="font-mono text-foreground/90">{entry.word_count}</span>
              </div>
            </>
          )}

          {entry.content_type === ClipboardContentType.Link && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border/10">
              <span className="text-muted-foreground/60">Action</span>
              <a
                href={entry.value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 font-medium"
              >
                Open Link <ArrowUpRight className="size-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
