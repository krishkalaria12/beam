import { CommandIcon } from "@/components/icons/command-icon";

interface ClipboardFooterProps {
  copiedEntryIndex: number | null;
  selectedIndex: number;
  copyError: string | null;
}

export function ClipboardFooter({
  copiedEntryIndex,
  selectedIndex,
  copyError,
}: ClipboardFooterProps) {
  const isCopied = copiedEntryIndex === selectedIndex;
  const copyLabel = copyError
    ? "Copy Failed"
    : isCopied
      ? "Copied to Clipboard"
      : "Copy to Clipboard";

  return (
    <div className="flex h-12 items-center justify-between border-t border-border/40 px-5 bg-background/50 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-3">
        <CommandIcon icon="clipboard" className="size-5 rounded-sm object-cover opacity-70" />
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
          Clipboard History
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
            {copyLabel}
          </span>
          <div className="flex items-center gap-1.5">
            <kbd className="rounded-lg border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-foreground/80 shadow-sm min-w-8 text-center">
              ENTER
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Back
          </span>
          <kbd className="rounded-lg border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-foreground/80 shadow-sm min-w-8 text-center">
            ESC
          </kbd>
        </div>
      </div>
    </div>
  );
}
