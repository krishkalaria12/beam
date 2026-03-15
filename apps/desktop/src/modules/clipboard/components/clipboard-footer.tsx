import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandIcon } from "@/components/icons/command-icon";

interface ClipboardFooterProps {
  copiedEntryIndex: number | null;
  selectedIndex: number;
  copyError: string | null;
  canCopy: boolean;
  onBack: () => void;
  onCopySelected: () => void;
  onToggleActions: () => void;
}

export function ClipboardFooter({
  copiedEntryIndex,
  selectedIndex,
  copyError,
  canCopy,
  onBack,
  onCopySelected,
  onToggleActions,
}: ClipboardFooterProps) {
  const isCopied = copiedEntryIndex === selectedIndex;

  return (
    <CommandFooterBar
      className="clipboard-footer h-10 border-t border-[var(--footer-border)] px-5"
      leftSlot={
        <>
          <CommandIcon icon="clipboard" className="size-3.5 opacity-50" />
          <span className="font-medium tracking-[-0.01em]">Clipboard History</span>
        </>
      }
      primaryAction={{
        label: copyError ? "Failed" : isCopied ? "Copied" : "Copy",
        shortcut: ["↩"],
        disabled: !canCopy,
        onClick: onCopySelected,
      }}
      secondaryActions={[
        {
          label: "Back",
          shortcut: ["ESC"],
          onClick: onBack,
        },
      ]}
      actionsButton={{
        label: "Actions",
        shortcut: ["⌘ + K"],
        onClick: onToggleActions,
      }}
    />
  );
}
