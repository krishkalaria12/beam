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

  return (
    <div className="clipboard-footer flex h-10 shrink-0 items-center justify-between border-t border-white/[0.04] px-5">
      {/* Left: Module indicator */}
      <div className="flex items-center gap-2 text-[11px] text-white/30">
        <CommandIcon icon="clipboard" className="size-3.5 opacity-50" />
        <span className="font-medium tracking-[-0.01em]">Clipboard History</span>
      </div>

      {/* Right: Keyboard hints */}
      <div className="flex items-center gap-4 text-[11px] text-white/25">
        <div className="flex items-center gap-1.5">
          <kbd className="flex h-5 min-w-[28px] items-center justify-center rounded bg-white/[0.06] px-1.5 font-mono text-[10px] text-white/40">
            Enter
          </kbd>
          <span className={isCopied ? "text-emerald-400/60" : ""}>
            {copyError ? "Failed" : isCopied ? "Copied" : "Copy"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="flex h-5 min-w-[20px] items-center justify-center rounded bg-white/[0.06] px-1.5 font-mono text-[10px] text-white/40">
            Esc
          </kbd>
          <span>Back</span>
        </div>
      </div>
    </div>
  );
}
