import {
  Clipboard,
  LaunchProps,
  Toast,
  clearSearchBar,
  closeMainWindow,
  getDesktopContext,
  showHUD,
  showToast,
} from "@beam-launcher/api";
import { showFailureToast } from "@beam-launcher/utils";
import { loadPackageCards } from "./lab";

type SnapshotArguments = {
  audience?: string;
  packageName?: string;
  query?: string;
  workflowName?: string;
};

function truncate(value: string | undefined, length: number): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

export default async function CaptureBeamSnapshot(
  props: LaunchProps<SnapshotArguments>,
) {
  try {
    const query =
      props.arguments?.query?.trim() ||
      props.arguments?.packageName?.trim() ||
      "beam";
    const packageCards = await loadPackageCards(query);
    const desktopContext = await getDesktopContext().catch(() => null);
    const selectedText =
      desktopContext?.selectedText.state === "supported"
        ? desktopContext.selectedText.value?.trim()
        : undefined;

    const summary = [
      "Beam Utils Snapshot",
      `Query: ${query}`,
      props.arguments?.workflowName
        ? `Workflow: ${props.arguments.workflowName}`
        : undefined,
      props.arguments?.audience ? `Audience: ${props.arguments.audience}` : undefined,
      `Packages: ${packageCards.map((entry) => `${entry.name}@${entry.version}`).join(", ")}`,
      `Selected text: ${truncate(selectedText, 160) ?? "unavailable"}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");

    await Clipboard.copy(summary);
    await clearSearchBar();
    await closeMainWindow({ clearRootSearch: true });
    await showHUD(`Copied ${packageCards.length} Beam signal${packageCards.length === 1 ? "" : "s"}`, {
      clearRootSearch: true,
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Beam snapshot copied",
      message: `Captured ${packageCards.length} package entries for "${query}".`,
    });
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to capture Beam snapshot",
      message: "The snapshot command could not assemble the current Beam signal set.",
    });
  }
}
