import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";
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
    <CommandFooterBar
      className="h-12 shrink-0 px-5 text-[11px] font-bold tracking-[0.15em]"
      leftSlot={(
        <>
          <CommandIcon icon="clipboard" className="size-5 rounded-sm object-cover opacity-70" />
          <span className="text-muted-foreground/60">Clipboard History</span>
        </>
      )}
      rightSlot={(
        <div className="flex items-center gap-6">
          <CommandKeyHint
            keyLabel="ENTER"
            label={copyLabel}
            order="label-first"
            className="gap-3"
            keyClassName="rounded-lg bg-muted/40 px-1.5 text-[10px] text-foreground/80 shadow-sm min-w-8 text-center"
            labelClassName="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50"
          />
          <CommandKeyHint
            keyLabel="ESC"
            label="Back"
            order="label-first"
            className="gap-3"
            keyClassName="rounded-lg bg-muted/40 px-1.5 text-[10px] text-foreground/80 shadow-sm min-w-8 text-center"
            labelClassName="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50"
          />
        </div>
      )}
    />
  );
}
