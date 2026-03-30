import { BookOpen, Download, Globe, RefreshCw, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { create } from "zustand";

import { openExternalUrl } from "@/lib/open-external-url";
import type { LauncherActionItem } from "@/modules/launcher/types";

export interface ExtensionInstalledActionContext {
  id: string;
  slug: string;
  title: string;
}

export interface ExtensionInstalledUpdateActionContext {
  id: string;
  latestVersion: string;
  latestRelease: { channelName?: string };
}

export interface ExtensionStoreActionContext {
  id: string;
  slug: string;
  title: string;
  latestRelease: { version: string; channelName?: string };
  readmeUrl?: string;
  sourceUrl?: string;
  homepageUrl?: string;
  sourceLabel: string;
}

interface ExtensionActionsState {
  selectedInstalled: ExtensionInstalledActionContext | null;
  selectedInstalledUpdate: ExtensionInstalledUpdateActionContext | null;
  selectedStoreDetail: ExtensionStoreActionContext | null;
  selectedStoreInstalled: boolean;
  onInstall?: (input: {
    packageId: string;
    slug: string;
    title: string;
    releaseVersion?: string;
    channel?: string;
  }) => Promise<void> | void;
  onUninstall?: () => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
}

interface ExtensionInstallInput {
  packageId: string;
  slug: string;
  title: string;
  releaseVersion?: string;
  channel?: string;
}

const initialState: ExtensionActionsState = {
  selectedInstalled: null,
  selectedInstalledUpdate: null,
  selectedStoreDetail: null,
  selectedStoreInstalled: false,
};

const useExtensionActionsStore = create<ExtensionActionsState>(() => initialState);

export function syncExtensionActionsState(nextState: ExtensionActionsState) {
  const currentState = useExtensionActionsStore.getState();
  if (
    currentState.selectedInstalled === nextState.selectedInstalled &&
    currentState.selectedInstalledUpdate === nextState.selectedInstalledUpdate &&
    currentState.selectedStoreDetail === nextState.selectedStoreDetail &&
    currentState.selectedStoreInstalled === nextState.selectedStoreInstalled &&
    currentState.onInstall === nextState.onInstall &&
    currentState.onUninstall === nextState.onUninstall &&
    currentState.onRefresh === nextState.onRefresh
  ) {
    return;
  }

  useExtensionActionsStore.setState(nextState);
}

export function clearExtensionActionsState() {
  useExtensionActionsStore.setState(initialState);
}

function toInstallInput(
  input:
    | ExtensionStoreActionContext
    | {
        id: string;
        slug: string;
        title: string;
        latestVersion: string;
        latestRelease: { channelName?: string };
      },
): ExtensionInstallInput {
  if ("latestVersion" in input) {
    return {
      packageId: input.id,
      slug: input.slug,
      title: input.title,
      releaseVersion: input.latestVersion,
      channel: input.latestRelease.channelName || undefined,
    };
  }

  return {
    packageId: input.id,
    slug: input.slug,
    title: input.title,
    releaseVersion: input.latestRelease.version,
    channel: input.latestRelease.channelName || undefined,
  };
}

function createLinkAction(
  id: string,
  label: string,
  description: string,
  url: string | undefined,
): LauncherActionItem | null {
  if (!url) {
    return null;
  }

  return {
    id,
    label,
    description,
    icon: <Globe className="size-4" />,
    onSelect: () => {
      void openExternalUrl(url);
    },
  };
}

export function useExtensionActionItems(): LauncherActionItem[] {
  const state = useExtensionActionsStore();

  return useMemo(() => {
    const installed = state.selectedInstalled;
    const installedUpdate = state.selectedInstalledUpdate;
    const storeDetail = state.selectedStoreDetail;

    const items: LauncherActionItem[] = [];

    if (installed && installedUpdate) {
      items.push({
        id: "extensions-update",
        label: "Update",
        description: `Install ${installedUpdate.latestVersion} for ${installed.title}`,
        icon: <RefreshCw className="size-4" />,
        onSelect: () => {
          void state.onInstall?.(
            toInstallInput({
              id: installedUpdate.id,
              slug: installed.slug,
              title: installed.title,
              latestVersion: installedUpdate.latestVersion,
              latestRelease: installedUpdate.latestRelease,
            }),
          );
        },
      });
    }

    if (installed) {
      items.push({
        id: "extensions-uninstall",
        label: "Uninstall",
        description: `Remove ${installed.title} from Beam`,
        icon: <Trash2 className="size-4" />,
        onSelect: () => {
          void state.onUninstall?.();
        },
      });
    }

    if (storeDetail) {
      items.push({
        id: "extensions-install",
        label: state.selectedStoreInstalled ? "Reinstall" : "Install",
        description: `${state.selectedStoreInstalled ? "Reinstall" : "Install"} ${storeDetail.title}`,
        icon: <Download className="size-4" />,
        onSelect: () => {
          void state.onInstall?.(toInstallInput(storeDetail));
        },
      });

      if (storeDetail.readmeUrl) {
        items.push({
          id: "extensions-open-readme",
          label: "Open README",
          description: `Open ${storeDetail.title} documentation`,
          icon: <BookOpen className="size-4" />,
          onSelect: () => {
            if (!storeDetail.readmeUrl) {
              return;
            }

            void openExternalUrl(storeDetail.readmeUrl);
          },
        });
      }

      const sourceAction = createLinkAction(
        "extensions-open-source",
        "Open Source",
        `Open ${storeDetail.title} source repository`,
        storeDetail.sourceUrl,
      );
      if (sourceAction) {
        items.push(sourceAction);
      }

      const homepageAction = createLinkAction(
        "extensions-open-homepage",
        "Open Homepage",
        `Open ${storeDetail.sourceLabel} homepage`,
        storeDetail.homepageUrl,
      );
      if (homepageAction) {
        items.push(homepageAction);
      }
    }

    items.push({
      id: "extensions-refresh",
      label: "Refresh",
      description: "Reload installed extensions and available updates",
      icon: <RefreshCw className="size-4" />,
      onSelect: () => {
        void state.onRefresh?.();
      },
    });

    return items;
  }, [state]);
}
