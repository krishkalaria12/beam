import { CommandIcon } from "@/components/icons/command-icon";
import { Kbd } from "@/components/module";

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

  return (
    <div className="clipboard-footer flex h-10 shrink-0 items-center justify-between border-t border-[var(--launcher-card-border)] px-5">
      {/* Left: Module indicator */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <CommandIcon icon="clipboard" className="size-3.5 opacity-50" />
        <span className="font-medium tracking-[-0.01em]">Clipboard History</span>
      </div>

      {/* Right: Keyboard hints */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Kbd className="flex h-5 min-w-[28px] items-center justify-center rounded px-1.5 text-[10px] text-muted-foreground">
            Enter
          </Kbd>
          <span className={isCopied ? "text-[var(--icon-green-fg)]" : ""}>
            {copyError ? "Failed" : isCopied ? "Copied" : "Copy"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Kbd className="flex h-5 min-w-[20px] items-center justify-center rounded px-1.5 text-[10px] text-muted-foreground">
            Esc
          </Kbd>
          <span>Back</span>
        </div>
      </div>
    </div>
  );
}
