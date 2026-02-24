import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandKeyHint } from "@/components/command/command-key-hint";

export function HyprWhsprFooter() {
  return (
    <CommandFooterBar
      leftSlot={(
        <CommandKeyHint
          keyLabel="Space"
          label="hold to talk"
        />
      )}
      rightSlot={(
        <>
          <CommandKeyHint keyLabel="Enter" label="toggle" />
          <CommandKeyHint keyLabel="R" label="refresh" />
          <CommandKeyHint keyLabel="Esc" label="back" />
        </>
      )}
    />
  );
}
