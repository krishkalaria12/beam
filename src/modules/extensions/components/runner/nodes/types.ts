import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";

export interface RunnerNodeRenderContext {
  selected?: boolean;
  onSelect?: () => void;
  onActivate?: () => void;
  sectionTitle?: string;
}

export interface RunnerNodeComponentProps {
  nodeId: number;
  state: UseExtensionRunnerStateResult;
  renderContext?: RunnerNodeRenderContext;
}
