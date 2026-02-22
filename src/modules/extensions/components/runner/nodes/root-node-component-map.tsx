import type { ComponentType } from "react";

import type { UseExtensionRunnerStateResult } from "@/modules/extensions/components/runner/use-extension-runner-state";
import { DetailRootNode } from "@/modules/extensions/components/runner/nodes/detail/detail-root-node";
import { FormRootNode } from "@/modules/extensions/components/runner/nodes/form/form-root-node";
import { GridRootNode } from "@/modules/extensions/components/runner/nodes/grid/grid-root-node";
import { ListRootNode } from "@/modules/extensions/components/runner/nodes/list/list-root-node";

export interface RootNodeComponentProps {
  state: UseExtensionRunnerStateResult;
}

function renderRoot(
  state: UseExtensionRunnerStateResult,
  type: "List" | "Grid" | "Detail" | "Form",
) {
  if (!state.rootNode || state.rootNode.type !== type) {
    return null;
  }

  if (type === "List") {
    return <ListRootNode nodeId={state.rootNode.id} state={state} />;
  }
  if (type === "Grid") {
    return <GridRootNode nodeId={state.rootNode.id} state={state} />;
  }
  if (type === "Detail") {
    return <DetailRootNode nodeId={state.rootNode.id} state={state} />;
  }
  return <FormRootNode nodeId={state.rootNode.id} state={state} />;
}

export const rootNodeComponentMap = new Map<string, ComponentType<RootNodeComponentProps>>([
  [
    "List",
    function ListRootComponent({ state }: RootNodeComponentProps) {
      return renderRoot(state, "List");
    },
  ],
  [
    "Grid",
    function GridRootComponent({ state }: RootNodeComponentProps) {
      return renderRoot(state, "Grid");
    },
  ],
  [
    "Detail",
    function DetailRootComponent({ state }: RootNodeComponentProps) {
      return renderRoot(state, "Detail");
    },
  ],
  [
    "Form",
    function FormRootComponent({ state }: RootNodeComponentProps) {
      return renderRoot(state, "Form");
    },
  ],
]);
