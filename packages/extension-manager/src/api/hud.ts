import { PopToRootType } from "@beam/extension-protocol";
import { writeRuntimeOutput } from "../protocol/runtime-output";

const MAX_HUD_TEXT_LENGTH = 120;

function sanitizeHudText(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= MAX_HUD_TEXT_LENGTH) {
    return compact;
  }

  return `${compact.slice(0, MAX_HUD_TEXT_LENGTH - 1).trimEnd()}…`;
}

export async function showHUD(title: string): Promise<void> {
  writeRuntimeOutput({
    showHud: {
      text: sanitizeHudText(title),
      clearRootSearch: false,
      popToRoot: PopToRootType.POP_TO_ROOT_TYPE_UNSPECIFIED,
    },
  });
}
