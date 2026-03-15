import { ExtensionRuntimeShell } from "@/modules/extensions/components/extension-runtime-shell";
import { useExtensionRunnerState } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";

interface ExtensionRunnerViewProps {
  onBack: () => void;
  onOpenExtensions?: () => void;
}

export function ExtensionRunnerView({ onBack, onOpenExtensions }: ExtensionRunnerViewProps) {
  const state = useExtensionRunnerState({ onBack });
  useLauncherPanelBackHandler("extension-runner", state.handleBack);

  return <ExtensionRuntimeShell state={state} onOpenExtensions={onOpenExtensions} />;
}
