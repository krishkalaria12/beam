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
      leftSlot={(
        <>
          <CommandIcon icon="clipboard" className="size-4 rounded-sm object-cover opacity-70" />
          <span>{copyError ? "Clipboard copy failed" : "Clipboard History"}</span>
        </>
      )}
      rightSlot={(
        <>
          <CommandKeyHint
            keyLabel="ENTER"
            label={copyLabel}
          />
          <CommandKeyHint
            keyLabel="ESC"
            label="Back"
          />
        </>
      )}
    />
  );
}
