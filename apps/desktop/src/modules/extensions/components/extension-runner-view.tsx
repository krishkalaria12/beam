import { ExtensionRuntimeShell } from "@/modules/extensions/components/extension-runtime-shell";
import { useExtensionRunnerState } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { extensionManagerService } from "@/modules/extensions/extension-manager-service";
import { useExtensionRuntimeStore } from "@/modules/extensions/runtime/store";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface ExtensionRunnerViewProps {
  onBack: () => void;
  onOpenExtensions?: () => void;
}

interface ExtensionRunnerSelectionSyncProps {
  rootNodeId?: number;
  selectedItemId: string | null;
  selectedNodeId?: number;
  shouldDispatchSelectionChange: boolean;
}

function ExtensionRunnerSelectionSync({
  rootNodeId,
  selectedItemId,
  selectedNodeId,
  shouldDispatchSelectionChange,
}: ExtensionRunnerSelectionSyncProps) {
  const setSelectedNodeId = useExtensionRuntimeStore((state) => state.setSelectedNodeId);

  useMountEffect(() => {
    setSelectedNodeId(selectedNodeId);

    if (shouldDispatchSelectionChange && rootNodeId !== undefined) {
      extensionManagerService.dispatchEvent(rootNodeId, "onSelectionChange", [selectedItemId]);
    }
  });

  return null;
}

export function ExtensionRunnerView({ onBack, onOpenExtensions }: ExtensionRunnerViewProps) {
  const state = useExtensionRunnerState({ onBack });
  useLauncherPanelBackHandler("extension-runner", state.handleBack);

  return (
    <>
      <ExtensionRunnerSelectionSync
        key={state.selectionSync.key}
        rootNodeId={state.selectionSync.rootNodeId}
        selectedItemId={state.selectionSync.selectedItemId}
        selectedNodeId={state.selectionSync.selectedNodeId}
        shouldDispatchSelectionChange={state.selectionSync.shouldDispatchSelectionChange}
      />
      <ExtensionRuntimeShell state={state} onOpenExtensions={onOpenExtensions} />
    </>
  );
}
