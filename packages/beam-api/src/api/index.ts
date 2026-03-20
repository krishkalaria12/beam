import crypto from "node:crypto";
import React from "react";
import { Icon } from "./icon.js";
export type { KeyEquivalent, KeyModifier } from "./keyboard.js";
export { Keyboard } from "./keyboard.js";

export type LaunchContext = Record<string, any>;
export type Arguments = Record<string, any>;

export type Application = {
  name: string;
  path: string;
  bundleId?: string;
  localizedName?: string;
};

export type FileSystemItem = {
  path: string;
};

export type DesktopContextState = "supported" | "unavailable" | "unsupported";

export type DesktopContextValue<T> = {
  state: DesktopContextState;
  value?: T;
  reason?: string;
};

export type DesktopContext = {
  selectedText: DesktopContextValue<string>;
  selectedFiles: DesktopContextValue<FileSystemItem[]>;
  focusedWindow: DesktopContextValue<{
    id: string;
    title: string;
    appName: string;
    className: string;
    appId?: string;
    pid?: number;
    workspace: string;
    isFocused: boolean;
  }>;
  frontmostApplication: DesktopContextValue<Application>;
  sources: {
    selectedTextBackend: string;
    selectedFilesBackend: string;
    windowBackend: string;
    applicationBackend: string;
  };
  capabilities: {
    selectedText: boolean;
    selectedFiles: boolean;
    focusedWindow: boolean;
    frontmostApplication: boolean;
  };
};

export type DynamicColor = {
  light: string;
  dark: string;
  adjustContrast?: boolean;
};

export type ColorLike = string | DynamicColor;

export const Color = {
  Blue: "raycast-blue",
  Green: "raycast-green",
  Magenta: "raycast-magenta",
  Orange: "raycast-orange",
  Purple: "raycast-purple",
  Red: "raycast-red",
  Yellow: "raycast-yellow",
  PrimaryText: "raycast-primary-text",
  SecondaryText: "raycast-secondary-text",
} as const;

export type ImageLike =
  | string
  | {
      source: string;
      fallback?: string;
      mask?: "circle" | "roundedRectangle";
      tintColor?: ColorLike;
    };

export const Image = {
  Mask: {
    Circle: "circle",
    RoundedRectangle: "roundedRectangle",
  },
} as const;

export enum LaunchType {
  UserInitiated = "userInitiated",
  Background = "background",
}

export enum PopToRootType {
  Default = "default",
  Immediate = "immediate",
  Suspended = "suspended",
}

export const Toast = {
  Style: {
    Success: "SUCCESS",
    Failure: "FAILURE",
    Animated: "ANIMATED",
  },
} as const;

export const Alert = {
  ActionStyle: {
    Default: "default",
    Cancel: "cancel",
    Destructive: "destructive",
  },
} as const;

export type Environment = {
  raycastVersion: string;
  ownerOrAuthorName: string;
  extensionName: string;
  commandName: string;
  commandMode: "no-view" | "view" | "menu-bar";
  assetsPath: string;
  supportPath: string;
  isDevelopment: boolean;
  appearance: "light" | "dark";
  theme: "light" | "dark";
  textSize: "medium" | "large";
  launchType: LaunchType;
  canAccess(api: unknown): boolean;
  launchContext?: LaunchContext;
  beamVersion: {
    tag: string;
    commit: string;
  };
  isRaycast: boolean;
};

export type FormValues = Record<string, any>;

export type LaunchProps<
  T extends {
    arguments?: Arguments;
    draftValues?: FormValues;
    launchContext?: LaunchContext;
  } = {
    arguments: Arguments;
    draftValues: FormValues;
    launchContext?: LaunchContext;
  },
> = {
  launchType: LaunchType;
  arguments: T["arguments"];
  draftValues?: T["draftValues"];
  launchContext?: T["launchContext"];
  fallbackText?: string;
};

type BeamRuntimeApi = Record<string, any>;
type BeamGlobal = typeof globalThis & {
  beam?: {
    api?: BeamRuntimeApi;
    environ?: Environment;
    preferences?: Record<string, unknown>;
  };
};

type ToastOptions = {
  style?: string;
  title: string;
  message?: string;
  primaryAction?: {
    title: string;
    onAction?: () => void;
    shortcut?: unknown;
  };
  secondaryAction?: {
    title: string;
    onAction?: () => void;
    shortcut?: unknown;
  };
};

type LocalStorageValue = string | number | boolean;
type LocalStorageValues = Record<string, LocalStorageValue>;

const fallbackLocalStorage = new Map<string, LocalStorageValue>();

function unavailable(path: string): Error {
  return new Error(`@beam-launcher/api runtime is unavailable. Missing Beam runtime binding for "${path}".`);
}

function pathGet(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, value);
}

function tryGetBeamApi(): BeamRuntimeApi | undefined {
  return (globalThis as BeamGlobal).beam?.api;
}

function getBeamApi(): BeamRuntimeApi {
  const api = tryGetBeamApi();
  if (!api) {
    throw unavailable("beam.api");
  }
  return api;
}

function runtimeMethod<T extends (...args: any[]) => any>(path: string, fallback?: T): T {
  return ((...args: Parameters<T>) => {
    const fn = pathGet(getBeamApi(), path);
    if (typeof fn !== "function") {
      if (fallback) {
        return fallback(...args);
      }
      throw unavailable(path);
    }
    return fn(...args);
  }) as T;
}

function createRuntimeNamespace<T extends object>(path: string, fallback: T): T {
  return new Proxy(fallback, {
    get(target, prop, receiver) {
      const runtimeValue = pathGet(tryGetBeamApi(), path);
      if (runtimeValue && typeof runtimeValue === "object") {
        const entry = (runtimeValue as Record<string, unknown>)[prop as string];
        if (entry !== undefined) {
          return typeof entry === "function" ? entry.bind(runtimeValue) : entry;
        }
      }

      const localValue = Reflect.get(target, prop, receiver);
      return typeof localValue === "function" ? localValue.bind(target) : localValue;
    },
  });
}

function createRuntimeBackedComponent(
  fallbackName: string,
  runtimePath = fallbackName,
): React.FC<any> {
  const Component = (props: Record<string, unknown>) => {
    const normalizedProps =
      "children" in props
        ? {
            ...props,
            children: React.Children.toArray(props.children as React.ReactNode),
          }
        : props;
    const runtimeComponent = pathGet(tryGetBeamApi(), runtimePath);
    if (runtimeComponent) {
      return React.createElement(runtimeComponent as React.ElementType, normalizedProps);
    }
    return React.createElement(fallbackName as React.ElementType, normalizedProps);
  };
  Component.displayName = fallbackName;
  return Component;
}

function createSlottedComponent(
  fallbackName: string,
  accessoryPropNames: string[],
  runtimePath = fallbackName,
): React.FC<any> {
  const Primitive = createRuntimeBackedComponent(fallbackName, runtimePath);
  const AccessorySlot = createRuntimeBackedComponent("_AccessorySlot");
  const Component = (props: Record<string, unknown>) => {
    const runtimeComponent = pathGet(tryGetBeamApi(), runtimePath);
    if (runtimeComponent) {
      return React.createElement(runtimeComponent as React.ElementType, props);
    }

    const { children, ...rest } = props as Record<string, any>;
    const accessoryElements = accessoryPropNames
      .map((name) => {
        if (!rest[name]) {
          return null;
        }
        const element = React.createElement(AccessorySlot, {
          key: name,
          name,
          children: rest[name],
        });
        delete rest[name];
        return element;
      })
      .filter(Boolean);

    const normalizedChildren = React.Children.toArray(children);

    return React.createElement(Primitive, {
      ...rest,
      children: [...normalizedChildren, ...accessoryElements],
    });
  };
  Component.displayName = fallbackName;
  return Component;
}

const environmentSource = (): Environment =>
  ((globalThis as BeamGlobal).beam?.environ ??
    pathGet(tryGetBeamApi(), "environment") ??
    {}) as Environment;

export const environment = new Proxy({} as Environment, {
  get(_target, prop) {
    return environmentSource()?.[prop as keyof Environment];
  },
  set(_target, prop, value) {
    const current = environmentSource() as Record<string, unknown>;
    current[prop as string] = value;
    return true;
  },
  has(_target, prop) {
    return prop in environmentSource();
  },
  ownKeys() {
    return Reflect.ownKeys(environmentSource());
  },
  getOwnPropertyDescriptor() {
    return { configurable: true, enumerable: true };
  },
});

export const preferences = new Proxy({} as Record<string, unknown>, {
  get(_target, prop) {
    const fromGlobal = (globalThis as BeamGlobal).beam?.preferences;
    if (fromGlobal && typeof fromGlobal === "object") {
      return fromGlobal[prop as string];
    }
    const getter = pathGet(tryGetBeamApi(), "getPreferenceValues");
    if (typeof getter === "function") {
      return getter()?.[prop as string];
    }
    return undefined;
  },
});

class LocalToast {
  style: string;
  title: string;
  message?: string;

  constructor(options: ToastOptions) {
    this.style = options.style ?? Toast.Style.Success;
    this.title = options.title;
    this.message = options.message;
  }

  async hide(): Promise<void> {}
  async show(): Promise<void> {}
}

const fallbackLocalStorageApi = {
  async getItem<T extends LocalStorageValue>(key: string): Promise<T | undefined> {
    return fallbackLocalStorage.get(key) as T | undefined;
  },
  async setItem(key: string, value: LocalStorageValue): Promise<void> {
    fallbackLocalStorage.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    fallbackLocalStorage.delete(key);
  },
  async clear(): Promise<void> {
    fallbackLocalStorage.clear();
  },
  async allItems(): Promise<LocalStorageValues> {
    return Object.fromEntries(fallbackLocalStorage.entries());
  },
};

export const Clipboard = createRuntimeNamespace("Clipboard", {
  async copy(_content: unknown, _options?: unknown): Promise<void> {
    throw unavailable("Clipboard.copy");
  },
  async paste(_content: unknown): Promise<void> {
    throw unavailable("Clipboard.paste");
  },
  async clear(): Promise<void> {
    throw unavailable("Clipboard.clear");
  },
  async read(): Promise<Record<string, unknown>> {
    throw unavailable("Clipboard.read");
  },
  async readText(): Promise<string | undefined> {
    throw unavailable("Clipboard.readText");
  },
});

export const LocalStorage = createRuntimeNamespace("LocalStorage", fallbackLocalStorageApi);

export const Cache = createRuntimeNamespace("Cache", {} as Record<string, unknown>);
export const FileSearch = createRuntimeNamespace("FileSearch", {
  async search(): Promise<unknown[]> {
    throw unavailable("FileSearch.search");
  },
});

export type WindowManagementWindow = {
  id: string;
  title: string;
  active: boolean;
  bounds: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
  workspaceId?: string;
  application?: Application;
  focus(): Promise<boolean>;
};

export type WindowManagementWorkspace = {
  id: string;
  name: string;
  monitorId: string;
  active: boolean;
};

export type WindowManagementScreen = {
  name: string;
  make: string;
  model: string;
  serial?: string;
  bounds: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
};

export const WindowManagement = createRuntimeNamespace("WindowManagement", {
  async getActiveWindow(): Promise<WindowManagementWindow> {
    throw unavailable("WindowManagement.getActiveWindow");
  },
  async getWindows(): Promise<WindowManagementWindow[]> {
    throw unavailable("WindowManagement.getWindows");
  },
  async getScreens(): Promise<WindowManagementScreen[]> {
    throw unavailable("WindowManagement.getScreens");
  },
  async getActiveWorkspace(): Promise<WindowManagementWorkspace> {
    throw unavailable("WindowManagement.getActiveWorkspace");
  },
  async getWorkspaces(): Promise<WindowManagementWorkspace[]> {
    throw unavailable("WindowManagement.getWorkspaces");
  },
  async getWindowsOnActiveWorkspace(): Promise<WindowManagementWindow[]> {
    throw unavailable("WindowManagement.getWindowsOnActiveWorkspace");
  },
  async setWindowBounds(_payload: Record<string, unknown>): Promise<void> {
    throw unavailable("WindowManagement.setWindowBounds");
  },
  async focusWindow(_window: WindowManagementWindow): Promise<boolean> {
    throw unavailable("WindowManagement.focusWindow");
  },
}) as {
  getActiveWindow(): Promise<WindowManagementWindow>;
  getWindows(options?: Record<string, unknown>): Promise<WindowManagementWindow[]>;
  getScreens(): Promise<WindowManagementScreen[]>;
  getActiveWorkspace(): Promise<WindowManagementWorkspace>;
  getWorkspaces(): Promise<WindowManagementWorkspace[]>;
  getWindowsOnActiveWorkspace(): Promise<WindowManagementWindow[]>;
  setWindowBounds(payload: Record<string, unknown>): Promise<void>;
  focusWindow(window: WindowManagementWindow): Promise<boolean>;
};
export const OAuth = createRuntimeNamespace("OAuth", {} as Record<string, unknown>);
export const AI = createRuntimeNamespace("AI", {
  name: "AI",
  async ask(): Promise<string> {
    throw unavailable("AI.ask");
  },
});
export const BrowserExtension = createRuntimeNamespace("BrowserExtension", {
  name: "BrowserExtension",
});

export const randomId = (): string => {
  const runtimeId = pathGet(tryGetBeamApi(), "randomId");
  if (typeof runtimeId === "function") {
    return runtimeId();
  }
  return crypto.randomUUID();
};

export const getPreferenceValues = <T = Record<string, any>>(): T => {
  const runtimeGetter = pathGet(tryGetBeamApi(), "getPreferenceValues");
  if (typeof runtimeGetter === "function") {
    return runtimeGetter() as T;
  }
  return ((globalThis as BeamGlobal).beam?.preferences ?? {}) as T;
};

export const showToast = async (
  optionsOrStyle: ToastOptions | string,
  title?: string,
  message?: string,
): Promise<any> => {
  const runtimeShowToast = pathGet(tryGetBeamApi(), "showToast");
  if (typeof runtimeShowToast === "function") {
    return runtimeShowToast(optionsOrStyle as never, title, message);
  }

  if (typeof optionsOrStyle === "object" && optionsOrStyle !== null) {
    return new LocalToast(optionsOrStyle);
  }

  return new LocalToast({
    style: optionsOrStyle,
    title: title ?? "",
    message,
  });
};

export const showHUD =
  runtimeMethod<
    (
      title: string,
      options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType },
    ) => Promise<void>
  >("showHUD");

export const closeMainWindow =
  runtimeMethod<
    (options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType }) => Promise<void>
  >("closeMainWindow");

export const clearSearchBar = runtimeMethod<() => Promise<void>>("clearSearchBar");
export const popToRoot =
  runtimeMethod<(options?: { clearSearchBar?: boolean }) => Promise<void>>("popToRoot");
export const confirmAlert =
  runtimeMethod<
    (options?: {
      title?: string;
      message?: string;
      primaryAction?: { title?: string };
    }) => Promise<boolean>
  >("confirmAlert");
export const launchCommand =
  runtimeMethod<
    (options: {
      name: string;
      type?: string;
      context?: Record<string, unknown>;
      arguments?: Record<string, unknown>;
    }) => Promise<void>
  >("launchCommand");
export const updateCommandMetadata =
  runtimeMethod<(metadata: { subtitle?: string | null }) => Promise<void>>("updateCommandMetadata");
export const openExtensionPreferences = runtimeMethod<() => Promise<void>>(
  "openExtensionPreferences",
);
export const openCommandPreferences = runtimeMethod<() => Promise<void>>("openCommandPreferences");
export const open =
  runtimeMethod<(target: string, application?: Application | string) => Promise<void>>("open");
export const showInFinder = runtimeMethod<(path: string) => Promise<void>>("showInFinder");
export const showInFileBrowser =
  runtimeMethod<(path: string) => Promise<void>>("showInFileBrowser");
export const trash = runtimeMethod<(path: string | string[]) => Promise<void>>("trash");
export const getDesktopContext = runtimeMethod<() => Promise<DesktopContext>>("getDesktopContext");
export const getSelectedFinderItems =
  runtimeMethod<() => Promise<FileSystemItem[]>>("getSelectedFinderItems");
export const getSelectedText = runtimeMethod<() => Promise<string>>("getSelectedText");
export const getApplications =
  runtimeMethod<(target?: string) => Promise<Application[]>>("getApplications");
export const getDefaultApplication =
  runtimeMethod<(path: string) => Promise<Application>>("getDefaultApplication");
export const getFrontmostApplication =
  runtimeMethod<() => Promise<Application>>("getFrontmostApplication");
export const captureException = runtimeMethod<(exception: unknown) => void>("captureException", ((
  exception: unknown,
) => {
  if (exception instanceof Error) {
    console.error(exception);
    return;
  }
  console.error(String(exception));
}) as (exception: unknown) => void);

export const allLocalStorageItems = (): Promise<LocalStorageValues> => LocalStorage.allItems();
export const getLocalStorageItem = <T extends LocalStorageValue>(
  key: string,
): Promise<T | undefined> => LocalStorage.getItem(key);
export const setLocalStorageItem = (key: string, value: LocalStorageValue): Promise<void> =>
  LocalStorage.setItem(key, value);
export const removeLocalStorageItem = (key: string): Promise<void> => LocalStorage.removeItem(key);
export const clearLocalStorage = (): Promise<void> => LocalStorage.clear();

export const useNavigation = (): {
  push: (element: React.ReactElement) => void;
  pop: () => void;
} => {
  const runtimeHook = pathGet(tryGetBeamApi(), "useNavigation");
  if (typeof runtimeHook === "function") {
    return runtimeHook();
  }

  return {
    push: () => {
      throw unavailable("useNavigation.push");
    },
    pop: () => {
      throw unavailable("useNavigation.pop");
    },
  };
};

export const usePersistentState = <T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] => {
  const runtimeHook = pathGet(tryGetBeamApi(), "usePersistentState");
  if (typeof runtimeHook === "function") {
    return runtimeHook(key, initialValue);
  }

  const [state, setState] = React.useState<T>(initialValue);
  const [isLoading, setIsLoading] = React.useState(true);
  const storageKey = React.useMemo(() => `usePersistentState:${key}`, [key]);

  React.useEffect(() => {
    let disposed = false;

    void LocalStorage.getItem<string>(storageKey)
      .then((stored) => {
        if (disposed || stored === undefined) {
          return;
        }

        try {
          setState(JSON.parse(stored) as T);
        } catch {
          setState(stored as T);
        }
      })
      .finally(() => {
        if (!disposed) {
          setIsLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [storageKey]);

  React.useEffect(() => {
    if (isLoading) {
      return;
    }

    const value = typeof state === "string" ? state : JSON.stringify(state ?? null);
    void LocalStorage.setItem(storageKey, value);
  }, [isLoading, state, storageKey]);

  return [state, setState, isLoading];
};

function Action(props: Record<string, unknown>) {
  const RuntimeAction = pathGet(tryGetBeamApi(), "Action");
  const normalizedProps =
    "children" in props
      ? {
          ...props,
          children: React.Children.toArray(props.children as React.ReactNode),
        }
      : props;
  if (RuntimeAction) {
    return React.createElement(RuntimeAction as React.ElementType, normalizedProps);
  }
  return React.createElement("Action" as React.ElementType, normalizedProps);
}

function ActionPanel(props: Record<string, unknown>) {
  const RuntimeActionPanel = pathGet(tryGetBeamApi(), "ActionPanel");
  const normalizedProps =
    "children" in props
      ? {
          ...props,
          children: React.Children.toArray(props.children as React.ReactNode),
        }
      : props;
  if (RuntimeActionPanel) {
    return React.createElement(RuntimeActionPanel as React.ElementType, normalizedProps);
  }
  return React.createElement("ActionPanel" as React.ElementType, normalizedProps);
}

function Detail(props: Record<string, unknown>) {
  return React.createElement(DetailRoot, props);
}

function Form(props: Record<string, unknown>) {
  return React.createElement(FormRoot, props);
}

function Grid(props: Record<string, unknown>) {
  return React.createElement(GridRoot, props);
}

function List(props: Record<string, unknown>) {
  return React.createElement(ListRoot, props);
}

function MenuBarExtra(props: Record<string, unknown>) {
  const RuntimeMenuBar = pathGet(tryGetBeamApi(), "MenuBarExtra");
  if (RuntimeMenuBar) {
    return React.createElement(RuntimeMenuBar as React.ElementType, props);
  }
  return React.createElement("MenuBarExtra" as React.ElementType, props);
}

export namespace Form {
  export type Values = FormValues;
  export type ItemReference = {
    focus(): void;
    reset(): void;
  };
}

const DetailRoot = createSlottedComponent("Detail", ["metadata", "actions"]);
const DetailMetadata = createRuntimeBackedComponent("Detail.Metadata");
const DetailMetadataLabel = createRuntimeBackedComponent("Detail.Metadata.Label");
const DetailMetadataLink = createRuntimeBackedComponent("Detail.Metadata.Link");
const DetailMetadataTagList = createRuntimeBackedComponent("Detail.Metadata.TagList");
const DetailMetadataTagListItem = createRuntimeBackedComponent("Detail.Metadata.TagList.Item");
const DetailMetadataSeparator = createRuntimeBackedComponent("Detail.Metadata.Separator");

const FormRoot = createSlottedComponent("Form", ["searchBarAccessory", "actions"]);
const FormTextField = createRuntimeBackedComponent("Form.TextField");
const FormPasswordField = createRuntimeBackedComponent("Form.PasswordField");
const FormTextArea = createRuntimeBackedComponent("Form.TextArea");
const FormCheckbox = createRuntimeBackedComponent("Form.Checkbox");
const FormDatePicker = createRuntimeBackedComponent("Form.DatePicker");
const FormDropdown = createRuntimeBackedComponent("Form.Dropdown");
const FormDropdownItem = createRuntimeBackedComponent("Form.Dropdown.Item");
const FormDropdownSection = createRuntimeBackedComponent("Form.Dropdown.Section");
const FormTagPicker = createRuntimeBackedComponent("Form.TagPicker");
const FormTagPickerItem = createRuntimeBackedComponent("Form.TagPicker.Item");
const FormTagPickerSection = createRuntimeBackedComponent("Form.TagPicker.Section");
const FormFilePicker = createRuntimeBackedComponent("Form.FilePicker");
const FormDescription = createRuntimeBackedComponent("Form.Description");
const FormLinkAccessory = createRuntimeBackedComponent("Form.LinkAccessory");
const FormSeparator = createRuntimeBackedComponent("Form.Separator");

const GridRoot = createSlottedComponent("Grid", ["searchBarAccessory"]);
const GridItem = createSlottedComponent("Grid.Item", ["detail", "actions"]);
const GridSection = createRuntimeBackedComponent("Grid.Section");
const GridDropdown = createRuntimeBackedComponent("Grid.Dropdown");
const GridDropdownItem = createRuntimeBackedComponent("Grid.Dropdown.Item");
const GridDropdownSection = createRuntimeBackedComponent("Grid.Dropdown.Section");
const GridEmptyView = createSlottedComponent("Grid.EmptyView", ["actions"]);
const GridItemDetail = createRuntimeBackedComponent("Grid.Item.Detail");
const GridItemDetailMetadata = createRuntimeBackedComponent("Grid.Item.Detail.Metadata");
const GridItemDetailMetadataLabel = createRuntimeBackedComponent("Grid.Item.Detail.Metadata.Label");
const GridItemDetailMetadataLink = createRuntimeBackedComponent("Grid.Item.Detail.Metadata.Link");
const GridItemDetailMetadataTagList = createRuntimeBackedComponent(
  "Grid.Item.Detail.Metadata.TagList",
);
const GridItemDetailMetadataTagListItem = createRuntimeBackedComponent(
  "Grid.Item.Detail.Metadata.TagList.Item",
);
const GridItemDetailMetadataSeparator = createRuntimeBackedComponent(
  "Grid.Item.Detail.Metadata.Separator",
);

const ListRoot = createSlottedComponent("List", ["searchBarAccessory"]);
const ListItem = createSlottedComponent("List.Item", ["detail", "actions"]);
const ListSection = createRuntimeBackedComponent("List.Section");
const ListEmptyView = createRuntimeBackedComponent("List.EmptyView");
const ListDropdown = createRuntimeBackedComponent("List.Dropdown");
const ListDropdownItem = createRuntimeBackedComponent("List.Dropdown.Item");
const ListDropdownSection = createRuntimeBackedComponent("List.Dropdown.Section");
const ListItemDetail = createRuntimeBackedComponent("List.Item.Detail");
const ListItemDetailMetadata = createRuntimeBackedComponent("List.Item.Detail.Metadata");
const ListItemDetailMetadataLabel = createRuntimeBackedComponent("List.Item.Detail.Metadata.Label");
const ListItemDetailMetadataLink = createRuntimeBackedComponent("List.Item.Detail.Metadata.Link");
const ListItemDetailMetadataTagList = createRuntimeBackedComponent(
  "List.Item.Detail.Metadata.TagList",
);
const ListItemDetailMetadataTagListItem = createRuntimeBackedComponent(
  "List.Item.Detail.Metadata.TagList.Item",
);
const ListItemDetailMetadataSeparator = createRuntimeBackedComponent(
  "List.Item.Detail.Metadata.Separator",
);

const ActionPanelSection = createRuntimeBackedComponent("ActionPanel.Section");
const ActionPanelSubmenu = createRuntimeBackedComponent("ActionPanel.Submenu");
const ActionOpen = createRuntimeBackedComponent("Action.Open");
const ActionShowInFinder = createRuntimeBackedComponent("Action.ShowInFinder");
const ActionRunInTerminal = createRuntimeBackedComponent("Action.RunInTerminal");
const ActionCreateQuicklink = createRuntimeBackedComponent("Action.CreateQuicklink");
const ActionPaste = createRuntimeBackedComponent("Action.Paste");
const ActionCopyToClipboard = createRuntimeBackedComponent("Action.CopyToClipboard");
const ActionOpenInBrowser = createRuntimeBackedComponent("Action.OpenInBrowser");
const ActionPush = createRuntimeBackedComponent("Action.Push");
const ActionSubmitForm = createRuntimeBackedComponent("Action.SubmitForm");
const MenuBarExtraItem = createRuntimeBackedComponent("MenuBarExtra.Item");
const MenuBarExtraSection = createRuntimeBackedComponent("MenuBarExtra.Section");
const MenuBarExtraSubmenu = createRuntimeBackedComponent("MenuBarExtra.Submenu");
const MenuBarExtraSeparator = createRuntimeBackedComponent("MenuBarExtra.Separator");

Object.assign(Action, {
  Open: ActionOpen,
  ShowInFinder: ActionShowInFinder,
  RunInTerminal: ActionRunInTerminal,
  CreateQuicklink: ActionCreateQuicklink,
  Paste: ActionPaste,
  CopyToClipboard: ActionCopyToClipboard,
  OpenInBrowser: ActionOpenInBrowser,
  Push: ActionPush,
  SubmitForm: ActionSubmitForm,
  Style: {
    Regular: "regular",
    Destructive: "destructive",
  },
});

Object.assign(ActionPanel, {
  Section: ActionPanelSection,
  Submenu: ActionPanelSubmenu,
  Item: Action,
});

Object.assign(Detail, {
  Metadata: DetailMetadata,
});
Object.assign(DetailMetadata, {
  Label: DetailMetadataLabel,
  Link: DetailMetadataLink,
  TagList: DetailMetadataTagList,
  Separator: DetailMetadataSeparator,
});
Object.assign(DetailMetadataTagList, {
  Item: DetailMetadataTagListItem,
});

Object.assign(Form, {
  Dropdown: FormDropdown,
  TagPicker: FormTagPicker,
  TextField: FormTextField,
  PasswordField: FormPasswordField,
  TextArea: FormTextArea,
  Checkbox: FormCheckbox,
  DatePicker: FormDatePicker,
  FilePicker: FormFilePicker,
  Description: FormDescription,
  LinkAccessory: FormLinkAccessory,
  Separator: FormSeparator,
});
Object.assign(FormDatePicker, {
  Type: {
    DateTime: "dateTime",
    Date: "date",
  },
});
Object.assign(FormDropdown, {
  Item: FormDropdownItem,
  Section: FormDropdownSection,
});
Object.assign(FormTagPicker, {
  Item: FormTagPickerItem,
  Section: FormTagPickerSection,
});

Object.assign(Grid, {
  Section: GridSection,
  Item: GridItem,
  Dropdown: GridDropdown,
  EmptyView: GridEmptyView,
  Inset: {
    Small: "small",
    Medium: "medium",
    Large: "large",
  },
  Fit: {
    Contain: "contain",
    Fill: "fill",
  },
});
Object.assign(GridDropdown, {
  Item: GridDropdownItem,
  Section: GridDropdownSection,
});
Object.assign(GridItem, {
  Detail: GridItemDetail,
});
Object.assign(GridItemDetail, {
  Metadata: GridItemDetailMetadata,
});
Object.assign(GridItemDetailMetadata, {
  Label: GridItemDetailMetadataLabel,
  Link: GridItemDetailMetadataLink,
  TagList: GridItemDetailMetadataTagList,
  Separator: GridItemDetailMetadataSeparator,
});
Object.assign(GridItemDetailMetadataTagList, {
  Item: GridItemDetailMetadataTagListItem,
});

Object.assign(List, {
  Item: ListItem,
  Section: ListSection,
  Dropdown: ListDropdown,
  EmptyView: ListEmptyView,
});
Object.assign(ListDropdown, {
  Item: ListDropdownItem,
  Section: ListDropdownSection,
});
Object.assign(ListItem, {
  Detail: ListItemDetail,
});
Object.assign(ListItemDetail, {
  Metadata: ListItemDetailMetadata,
});
Object.assign(ListItemDetailMetadata, {
  Label: ListItemDetailMetadataLabel,
  Link: ListItemDetailMetadataLink,
  TagList: ListItemDetailMetadataTagList,
  Separator: ListItemDetailMetadataSeparator,
});
Object.assign(ListItemDetailMetadataTagList, {
  Item: ListItemDetailMetadataTagListItem,
});

Object.assign(MenuBarExtra, {
  Item: MenuBarExtraItem,
  Section: MenuBarExtraSection,
  Submenu: MenuBarExtraSubmenu,
  Separator: MenuBarExtraSeparator,
  isSupported: true,
  open: async () => {
    const runtimeOpen = pathGet(tryGetBeamApi(), "MenuBarExtra.open");
    if (typeof runtimeOpen === "function") {
      await runtimeOpen();
    }
  },
});

export {
  Action,
  ActionPanel,
  Detail,
  Form,
  Grid,
  List,
  MenuBarExtra,
  Icon,
};
