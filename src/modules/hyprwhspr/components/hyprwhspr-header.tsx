import {
  CommandPanelBackButton,
  CommandPanelHeader,
  CommandPanelTitleBlock,
} from "@/components/command/command-panel-header";
import { CommandStatusChip } from "@/components/command/command-status-chip";

interface HyprWhsprHeaderProps {
  statusTone: "neutral" | "warning" | "success";
  statusLabel: string;
  isRecording: boolean;
  onBack: () => void | Promise<void>;
}

export function HyprWhsprHeader({
  statusTone,
  statusLabel,
  isRecording,
  onBack,
}: HyprWhsprHeaderProps) {
  return (
    <CommandPanelHeader>
      <CommandPanelBackButton onClick={() => { void onBack(); }} aria-label="Back" />
      <CommandPanelTitleBlock
        title="HyprWhspr"
        subtitle="Push-to-talk dictation mode"
        className="flex-1"
      />
      <CommandStatusChip
        tone={statusTone}
        pulse={isRecording}
        label={statusLabel}
      />
    </CommandPanelHeader>
  );
}
