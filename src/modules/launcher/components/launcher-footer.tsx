import { CommandFooterBar } from "@/components/command/command-footer-bar";

export function LauncherFooter() {
  return (
    <CommandFooterBar
      leftSlot={<span>Beam</span>}
      primaryAction={{
        label: "Open",
        shortcut: ["↩"],
      }}
      secondaryActions={[
        {
          label: "Back",
          shortcut: ["ESC"],
        },
      ]}
      actionsButton={{
        label: "Actions",
        shortcut: ["⌘", "K"],
      }}
    />
  );
}
