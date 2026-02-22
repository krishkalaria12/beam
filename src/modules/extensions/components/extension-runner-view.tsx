import { ArrowLeft, Loader2, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RootNodeRenderer } from "@/modules/extensions/components/runner/nodes/root-node-renderer";
import { useExtensionRunnerState } from "@/modules/extensions/components/runner/use-extension-runner-state";

interface ExtensionRunnerViewProps {
  onBack: () => void;
  onOpenExtensions?: () => void;
}

export function ExtensionRunnerView({ onBack, onOpenExtensions }: ExtensionRunnerViewProps) {
  const state = useExtensionRunnerState({ onBack });

  return (
    <div
      className="flex h-full w-full flex-col bg-background"
      onKeyDownCapture={state.handleRootKeyDownCapture}
      onKeyDown={state.handleRootKeyDown}
    >
      <div className="flex items-center gap-3 border-b border-border/50 p-3">
        <Button variant="ghost" size="icon" onClick={state.handleBack} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{state.runningSession?.title || "Extension"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {state.runningSession?.subtitle ||
              state.runningSession?.pluginPath ||
              "Raycast-compatible command"}
          </p>
        </div>
        {onOpenExtensions ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenExtensions}
            className="ml-auto h-8 gap-1.5"
          >
            <Settings2 className="size-3.5" />
            Setup
          </Button>
        ) : null}
      </div>
      {!state.rootNode ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Waiting for extension UI...
        </div>
      ) : (
        <RootNodeRenderer state={state} />
      )}
    </div>
  );
}
