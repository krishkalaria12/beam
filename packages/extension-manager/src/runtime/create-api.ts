import React from "react";

type LocalStorageApi = {
  allItems: () => Promise<Record<string, unknown>>;
  getItem: (key: string) => Promise<unknown>;
  setItem: (key: string, value: any) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

export type BeamRuntimeApiDependencies = {
  raycastUtils: Record<string, unknown>;
  LocalStorage: LocalStorageApi;
  randomId: () => string;
  Alert: Record<string, unknown>;
  MenuBarExtra: object;
  menuBarExtraOpen: () => Promise<void>;
  Color: unknown;
  Cache: unknown;
  Icon: unknown;
  Image: unknown;
  LaunchType: unknown;
  PopToRootType: { Suspended?: string } & Record<string, unknown>;
  Toast: unknown;
  OAuth: Record<string, unknown>;
  AI: Record<string, unknown>;
  AIConstant?: Record<string, unknown>;
  Action: unknown;
  ActionPanel: unknown;
  Detail: unknown;
  Form: unknown;
  Grid: unknown;
  List: unknown;
  Clipboard: unknown;
  environment: Record<string, unknown>;
  getDesktopContext: () => Promise<unknown>;
  getApplications: (target?: string) => Promise<unknown>;
  getDefaultApplication: (path: string) => Promise<unknown>;
  getFrontmostApplication: () => Promise<unknown>;
  getPreferenceValues: () => Record<string, unknown>;
  preferences: Record<string, unknown>;
  getSelectedFinderItems: () => Promise<unknown>;
  getSelectedText: () => Promise<unknown>;
  clearSearchBar: () => Promise<void>;
  popToRootView: () => void;
  goBackToPluginList: () => void;
  open: (target: string, application?: any) => Promise<void>;
  showInFinder: (path: string) => Promise<void>;
  showToast: (...args: any[]) => Promise<any>;
  showHUD: (
    title: string,
    options?: { clearRootSearch?: boolean; popToRootType?: string },
  ) => Promise<void>;
  captureException: (exception: unknown) => void;
  trash: (path: string | string[]) => Promise<void>;
  confirmAlert: (options?: {
    title?: string;
    message?: string;
    primaryAction?: { title?: string };
  }) => Promise<boolean>;
  launchCommand: (options: {
    name: string;
    type?: string;
    context?: Record<string, unknown>;
    arguments?: Record<string, unknown>;
  }) => Promise<void>;
  updateCommandMetadata: (metadata: { subtitle?: string | null }) => Promise<void>;
  openExtensionPreferences: () => Promise<void>;
  openCommandPreferences: () => Promise<void>;
  useNavigation: () => {
    push: (element: React.ReactElement) => void;
    pop: () => void;
  };
  BrowserExtension: unknown;
  WindowManagement: unknown;
  FileSearch: unknown;
  Keyboard: unknown;
};

export const createRaycastRuntimeApi = (deps: BeamRuntimeApiDependencies) => {
  const menuBarExtra = Object.assign(deps.MenuBarExtra, {
    isSupported: true,
    open: deps.menuBarExtraOpen,
  });

  const popToRoot = async (options?: { clearSearchBar?: boolean; popToRootType?: string }) => {
    if (options?.popToRootType === deps.PopToRootType.Suspended) {
      return;
    }

    deps.popToRootView();
    if (options?.clearSearchBar) {
      await deps.clearSearchBar();
    }
  };

  const closeMainWindow = async (options?: {
    clearRootSearch?: boolean;
    popToRootType?: string;
  }) => {
    if (options?.popToRootType === deps.PopToRootType.Suspended) {
      if (options?.clearRootSearch) {
        await deps.clearSearchBar();
      }
    } else {
      await popToRoot({
        clearSearchBar: options?.clearRootSearch,
        popToRootType: options?.popToRootType,
      });
    }

    deps.goBackToPluginList();
  };

  const usePersistentState = <T>(
    key: string,
    initialValue: T,
  ): [T, React.Dispatch<React.SetStateAction<T>>, boolean] => {
    const [state, setState] = React.useState(initialValue);
    const [isLoading, setIsLoading] = React.useState(true);
    const storageKey = React.useMemo(() => `usePersistentState:${key}`, [key]);

    React.useEffect(() => {
      let isDisposed = false;

      void deps.LocalStorage.getItem(storageKey)
        .then((stored) => {
          if (isDisposed || stored === undefined) {
            return;
          }

          if (typeof stored === "string") {
            try {
              setState(JSON.parse(stored) as T);
              return;
            } catch {
              setState(stored as T);
              return;
            }
          }

          setState(stored as T);
        })
        .finally(() => {
          if (!isDisposed) {
            setIsLoading(false);
          }
        });

      return () => {
        isDisposed = true;
      };
    }, [storageKey]);

    const persistentSetState = React.useCallback<React.Dispatch<React.SetStateAction<T>>>(
      (nextValue) => {
        setState((previous) => {
          const resolved =
            typeof nextValue === "function" ? (nextValue as (value: T) => T)(previous) : nextValue;
          void deps.LocalStorage.setItem(storageKey, JSON.stringify(resolved));
          return resolved;
        });
      },
      [storageKey],
    );

    return [state, persistentSetState, isLoading];
  };

  return {
    ...deps.raycastUtils,
    LocalStorage: deps.LocalStorage,
    allLocalStorageItems: deps.LocalStorage.allItems,
    getLocalStorageItem: deps.LocalStorage.getItem,
    setLocalStorageItem: deps.LocalStorage.setItem,
    removeLocalStorageItem: deps.LocalStorage.removeItem,
    clearLocalStorage: deps.LocalStorage.clear,
    randomId: deps.randomId,
    Alert: deps.Alert,
    MenuBarExtra: menuBarExtra,
    Color: deps.Color,
    Cache: deps.Cache,
    Icon: deps.Icon,
    Image: deps.Image,
    LaunchType: deps.LaunchType,
    PopToRootType: deps.PopToRootType,
    Toast: deps.Toast,
    OAuth: deps.OAuth,
    AI: {
      ...deps.AI,
      ...(deps.AIConstant ?? {}),
    },
    Action: deps.Action,
    ActionPanel: deps.ActionPanel,
    Detail: deps.Detail,
    Form: deps.Form,
    Grid: deps.Grid,
    List: deps.List,
    Clipboard: deps.Clipboard,
    environment: deps.environment,
    getDesktopContext: deps.getDesktopContext,
    getApplications: deps.getApplications,
    getDefaultApplication: deps.getDefaultApplication,
    getFrontmostApplication: deps.getFrontmostApplication,
    getPreferenceValues: deps.getPreferenceValues,
    preferences: deps.preferences,
    getSelectedFinderItems: deps.getSelectedFinderItems,
    getSelectedText: deps.getSelectedText,
    closeMainWindow,
    popToRoot,
    open: deps.open,
    showInFinder: deps.showInFinder,
    showInFileBrowser: deps.showInFinder,
    showToast: deps.showToast,
    showHUD: deps.showHUD,
    captureException: deps.captureException,
    trash: deps.trash,
    confirmAlert: deps.confirmAlert,
    launchCommand: deps.launchCommand,
    updateCommandMetadata: deps.updateCommandMetadata,
    openExtensionPreferences: deps.openExtensionPreferences,
    openCommandPreferences: deps.openCommandPreferences,
    clearSearchBar: deps.clearSearchBar,
    useNavigation: deps.useNavigation,
    usePersistentState,
    WindowManagement: deps.WindowManagement,
    FileSearch: deps.FileSearch,
    Keyboard: deps.Keyboard,
  };
};

export const createBeamRuntimeApi = (deps: BeamRuntimeApiDependencies) => ({
  ...createRaycastRuntimeApi(deps),
  BrowserExtension: deps.BrowserExtension,
});
