import { PopToRootType } from "@beam/extension-protocol";
import { writeRuntimeOutput } from "../protocol/runtime-output";

export async function showHUD(title: string): Promise<void> {
  writeRuntimeOutput({
    showHud: {
      text: title,
      clearRootSearch: false,
      popToRoot: PopToRootType.POP_TO_ROOT_TYPE_UNSPECIFIED,
    },
  });
}
