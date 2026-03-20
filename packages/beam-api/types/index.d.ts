/// <reference path="./jsx.d.ts" />

import type * as React from "react";

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
  sources: Record<string, string>;
  capabilities: Record<string, boolean>;
};

export type DynamicColor = {
  light: string;
  dark: string;
  adjustContrast?: boolean;
};

export type ColorLike = string | DynamicColor;

export declare const Color: {
  readonly Blue: "raycast-blue";
  readonly Green: "raycast-green";
  readonly Magenta: "raycast-magenta";
  readonly Orange: "raycast-orange";
  readonly Purple: "raycast-purple";
  readonly Red: "raycast-red";
  readonly Yellow: "raycast-yellow";
  readonly PrimaryText: "raycast-primary-text";
  readonly SecondaryText: "raycast-secondary-text";
};

export type Color = (typeof Color)[keyof typeof Color];
export type ImageSource = string | DynamicColor;
export type ImageLike =
  | ImageSource
  | {
      source: ImageSource;
      fallback?: ImageSource;
      mask?: "circle" | "roundedRectangle";
      tintColor?: ColorLike;
    };

export declare const Image: {
  readonly Mask: {
    readonly Circle: "circle";
    readonly RoundedRectangle: "roundedRectangle";
  };
};

export declare namespace Image {
  type Mask = (typeof Image.Mask)[keyof typeof Image.Mask];
  type Asset = string;
  type Fallback = ImageSource;
  type ImageLike = import("./index").ImageLike;
}

export declare enum LaunchType {
  UserInitiated = "userInitiated",
  Background = "background",
}

export declare enum PopToRootType {
  Default = "default",
  Immediate = "immediate",
  Suspended = "suspended",
}

export declare const Toast: {
  readonly Style: {
    readonly Success: "SUCCESS";
    readonly Failure: "FAILURE";
    readonly Animated: "ANIMATED";
  };
};

export declare namespace Toast {
  type Style = (typeof Toast.Style)[keyof typeof Toast.Style];

  type Shortcut = {
    modifiers: KeyModifier[];
    key: KeyEquivalent;
  };

  interface Instance {
    style: Style;
    title: string;
    message?: string;
    primaryAction?: ActionOptions;
    secondaryAction?: ActionOptions;
    show(): Promise<void>;
    hide(): Promise<void>;
  }

  interface ActionOptions {
    title: string;
    onAction?: (toast: Instance) => void | Promise<void>;
    shortcut?: Shortcut;
  }

  interface Options {
    style?: Style;
    title: string;
    message?: string;
    primaryAction?: ActionOptions;
    secondaryAction?: ActionOptions;
  }
}

export declare const Alert: {
  readonly ActionStyle: {
    readonly Default: "default";
    readonly Cancel: "cancel";
    readonly Destructive: "destructive";
  };
};

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
export type LaunchProps<TArguments extends Arguments = Arguments> = {
  arguments?: TArguments;
  launchContext?: LaunchContext;
};

export type KeyEquivalent = string;
export type KeyModifier = "cmd" | "ctrl" | "alt" | "shift" | "opt";

export declare const Keyboard: {
  readonly KeyEquivalent: Record<string, KeyEquivalent>;
  readonly Shortcut: {
    readonly Common: Record<string, unknown>;
  };
};

export declare const Icon: Record<string, string>;

export declare const environment: Environment;
export declare const preferences: Record<string, unknown>;
export interface CacheOptions {
  capacity?: number;
  namespace?: string;
  directory?: string;
}
export declare class Cache {
  constructor(options?: CacheOptions);
  readonly isEmpty: boolean;
  get(key: string): string | undefined;
  has(key: string): boolean;
  set(key: string, data: string): void;
  remove(key: string): boolean;
  clear(options?: { notifySubscribers?: boolean }): void;
  subscribe(subscriber: (key: string | undefined, data: string | undefined) => void): () => void;
}
export declare const Clipboard: {
  copy(content: unknown, options?: unknown): Promise<void>;
  paste(content: unknown): Promise<void>;
  clear(): Promise<void>;
  read(): Promise<Record<string, unknown>>;
  readText(): Promise<string | undefined>;
};
export declare const LocalStorage: {
  getItem<T = string>(key: string): Promise<T | undefined>;
  setItem(key: string, value: unknown): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  allItems(): Promise<Record<string, unknown>>;
};
export declare namespace OAuth {
  enum RedirectMethod {
    Web = "web",
    App = "app",
    AppURI = "app-uri",
  }

  interface PKCEClientOptions {
    redirectMethod: RedirectMethod;
    providerName: string;
    providerIcon?: ImageLike;
    description?: string;
    providerId?: string;
  }

  interface AuthorizationRequestOptions {
    endpoint: string;
    clientId: string;
    scope: string;
    extraParameters?: { [key: string]: string };
  }

  interface AuthorizationRequest {
    url: string;
    codeVerifier: string;
    codeChallenge: string;
    redirectURI: string;
    state: string;
    toURL(): string;
  }

  interface AuthorizationOptions {
    url: string;
  }

  interface AuthorizationResponse {
    authorizationCode: string;
  }

  interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string | string[];
    id_token?: string;
  }

  interface TokenSetOptions {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    scope?: string;
    idToken?: string;
  }

  interface TokenSet {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    scope?: string;
    idToken?: string;
    updatedAt: Date;
    isExpired(): boolean;
  }

  class PKCEClient {
    providerName: string;
    providerIcon?: ImageLike;
    description?: string;
    providerId?: string;
    constructor(options: PKCEClientOptions);
    authorizationRequest(options: AuthorizationRequestOptions): Promise<AuthorizationRequest>;
    authorize(authRequest: AuthorizationRequest | AuthorizationOptions): Promise<AuthorizationResponse>;
    getTokens(): Promise<TokenSet | undefined>;
    setTokens(tokens: TokenSetOptions | TokenResponse): Promise<void>;
    removeTokens(): Promise<void>;
  }
}

export declare namespace AI {
  type Creativity = "none" | "low" | "medium" | "high" | "maximum" | number;

  enum Model {
    "OpenAI_GPT4.1" = "OpenAI_GPT4.1",
    "OpenAI_GPT4.1-mini" = "OpenAI_GPT4.1-mini",
    "OpenAI_GPT4.1-nano" = "OpenAI_GPT4.1-nano",
    OpenAI_GPT4 = "OpenAI_GPT4",
    "OpenAI_GPT4-turbo" = "OpenAI_GPT4-turbo",
    OpenAI_GPT4o = "OpenAI_GPT4o",
    "OpenAI_GPT4o-mini" = "OpenAI_GPT4o-mini",
    OpenAI_o3 = "OpenAI_o3",
    "OpenAI_o4-mini" = "OpenAI_o4-mini",
    OpenAI_o1 = "OpenAI_o1",
    "OpenAI_o3-mini" = "OpenAI_o3-mini",
    Anthropic_Claude_Haiku = "Anthropic_Claude_Haiku",
    Anthropic_Claude_Sonnet = "Anthropic_Claude_Sonnet",
    "Anthropic_Claude_Sonnet_3.7" = "Anthropic_Claude_Sonnet_3.7",
    Anthropic_Claude_Opus = "Anthropic_Claude_Opus",
    Anthropic_Claude_4_Sonnet = "Anthropic_Claude_4_Sonnet",
    Anthropic_Claude_4_Opus = "Anthropic_Claude_4_Opus",
    Perplexity_Sonar = "Perplexity_Sonar",
    Perplexity_Sonar_Pro = "Perplexity_Sonar_Pro",
    Perplexity_Sonar_Reasoning = "Perplexity_Sonar_Reasoning",
    Perplexity_Sonar_Reasoning_Pro = "Perplexity_Sonar_Reasoning_Pro",
    Llama4_Scout = "Llama4_Scout",
    "Llama3.3_70B" = "Llama3.3_70B",
    "Llama3.1_8B" = "Llama3.1_8B",
    "Llama3.1_405B" = "Llama3.1_405B",
    Mistral_Nemo = "Mistral_Nemo",
    Mistral_Large = "Mistral_Large",
    Mistral_Medium = "Mistral_Medium",
    Mistral_Small = "Mistral_Small",
    Mistral_Codestral = "Mistral_Codestral",
    "DeepSeek_R1_Distill_Llama_3.3_70B" = "DeepSeek_R1_Distill_Llama_3.3_70B",
    DeepSeek_R1 = "DeepSeek_R1",
    DeepSeek_V3 = "DeepSeek_V3",
    "Google_Gemini_2.5_Pro" = "Google_Gemini_2.5_Pro",
    "Google_Gemini_2.5_Flash" = "Google_Gemini_2.5_Flash",
    "Google_Gemini_2.0_Flash" = "Google_Gemini_2.0_Flash",
    xAI_Grok_3 = "xAI_Grok_3",
    xAI_Grok_3_Mini = "xAI_Grok_3_Mini",
    xAI_Grok_2 = "xAI_Grok_2",
  }

  interface AskOptions {
    creativity?: Creativity;
    model?: string;
    provider?: "openrouter" | "openai" | "anthropic" | "gemini";
    modelMappings?: Record<string, string>;
    signal?: AbortSignal;
  }

  interface AskResult extends Promise<string> {
    on(event: "data", listener: (chunk: string) => void): this;
    on(event: "end", listener: (fullText: string) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    off(event: "data", listener: (chunk: string) => void): this;
    off(event: "end", listener: (fullText: string) => void): this;
    off(event: "error", listener: (error: Error) => void): this;
  }

  const name: "AI";
  function ask(prompt: string, options?: AskOptions): AskResult;
  const Creativity: {
    none: "none";
    low: "low";
    medium: "medium";
    high: "high";
    maximum: "maximum";
  };
}
export declare const BrowserExtension: Record<string, unknown>;

export declare function randomId(): string;
export declare function getPreferenceValues<T = Record<string, any>>(): T;
export declare function showToast(
  optionsOrStyle: Toast.Options | Toast.Style,
  title?: string,
  message?: string,
): Promise<Toast.Instance>;
export declare function showHUD(
  title: string,
  options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType },
): Promise<void>;
export declare function closeMainWindow(options?: {
  clearRootSearch?: boolean;
  popToRootType?: PopToRootType;
}): Promise<void>;
export declare function clearSearchBar(): Promise<void>;
export declare function popToRoot(options?: { clearSearchBar?: boolean }): Promise<void>;
export declare function confirmAlert(options?: {
  title?: string;
  message?: string;
  primaryAction?: { title?: string };
}): Promise<boolean>;
export declare function launchCommand(options: {
  name: string;
  type?: string;
  context?: Record<string, unknown>;
  arguments?: Record<string, unknown>;
}): Promise<void>;
export declare function updateCommandMetadata(metadata: {
  subtitle?: string | null;
}): Promise<void>;
export declare function openExtensionPreferences(): Promise<void>;
export declare function openCommandPreferences(): Promise<void>;
export declare function open(target: string, application?: Application | string): Promise<void>;
export declare function showInFinder(path: string): Promise<void>;
export declare function showInFileBrowser(path: string): Promise<void>;
export declare function trash(path: string | string[]): Promise<void>;
export declare function getDesktopContext(): Promise<DesktopContext>;
export declare function getSelectedFinderItems(): Promise<FileSystemItem[]>;
export declare function getSelectedText(): Promise<string>;
export declare function getApplications(target?: string): Promise<Application[]>;
export declare function getDefaultApplication(path: string): Promise<Application>;
export declare function getFrontmostApplication(): Promise<Application>;
export declare function captureException(exception: unknown): void;
export declare function allLocalStorageItems(): Promise<Record<string, unknown>>;
export declare function getLocalStorageItem<T = string>(key: string): Promise<T | undefined>;
export declare function setLocalStorageItem(key: string, value: unknown): Promise<void>;
export declare function removeLocalStorageItem(key: string): Promise<void>;
export declare function clearLocalStorage(): Promise<void>;
export declare function useNavigation(): {
  push: (element: React.ReactElement) => void;
  pop: () => void;
};
export declare function usePersistentState<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>, boolean];

type FormValue = string | number | boolean | string[] | number[] | Date | null;

type FormItemProps<T extends FormValue> = {
  id: string;
  title?: string;
  info?: string;
  error?: string;
  storeValue?: boolean;
  autoFocus?: boolean;
  value?: T;
  defaultValue?: T;
  onChange?: (newValue: T) => void;
  onBlur?: (event: { target: { value: T } }) => void;
  ref?: React.Ref<Form.ItemReference>;
};

type MetadataLabelText = string | { color?: ColorLike; value: string };

type AccessoryTag =
  | string
  | Date
  | undefined
  | null
  | {
      color?: ColorLike;
      value: string | Date | undefined | null;
    };

type AccessoryText =
  | string
  | Date
  | undefined
  | null
  | {
      color?: ColorLike;
      value: string | Date | undefined | null;
    };

export declare namespace Action {
  type Props = {
    title: string;
    icon?: ImageLike;
    shortcut?: unknown;
    autoFocus?: boolean;
    style?: "regular" | "destructive";
    onAction: () => void;
  };

  namespace CopyToClipboard {
    type Props = {
      title?: string;
      icon?: ImageLike;
      shortcut?: unknown;
      autoFocus?: boolean;
      content: string;
      concealed?: boolean;
      onCopy?: (content: string | number | unknown) => void;
    };
  }

  namespace Open {
    type Props = {
      title: string;
      icon?: ImageLike;
      shortcut?: unknown;
      target: string;
      app?: Application | string;
    };
  }

  namespace Push {
    type Props = {
      title: string;
      icon?: ImageLike;
      shortcut?: unknown;
      target: React.ReactNode;
    };
  }

  namespace SubmitForm {
    type Props = {
      title?: string;
      icon?: ImageLike;
      shortcut?: unknown;
      onSubmit: (values: Form.Values) => boolean | void | Promise<boolean | void>;
    };
  }
}

export declare namespace ActionPanel {
  type Props = {
    title?: string;
    children?: React.ReactNode;
  };

  namespace Section {
    type Props = {
      title?: string;
      children?: React.ReactNode;
    };
  }

  namespace Submenu {
    type Props = {
      title: string;
      icon?: ImageLike;
      shortcut?: unknown;
      onOpen?: () => void;
      children?: React.ReactNode;
    };
  }
}

export declare namespace Detail {
  type Props = {
    navigationTitle?: string;
    metadata?: React.ReactNode;
    markdown: string;
    actions?: React.ReactNode;
  };

  namespace Metadata {
    type Props = {
      children?: React.ReactNode;
    };

    namespace Label {
      type Props = {
        title: string;
        text: MetadataLabelText;
        icon?: ImageLike;
      };
    }

    namespace Link {
      type Props = {
        title: string;
        target: string;
        text: string;
      };
    }

    namespace TagList {
      type Props = {
        title: string;
        children?: React.ReactNode;
      };

      namespace Item {
        type Props = {
          text: string;
          color?: ColorLike;
        };
      }
    }

    namespace Separator {
      type Props = Record<string, never>;
    }
  }
}

export declare namespace Form {
  type Props = {
    actions?: React.ReactNode;
    children?: React.ReactNode;
    enableDrafts?: boolean;
    isLoading?: boolean;
    navigationTitle?: string;
    searchBarAccessory?: React.ReactNode;
  };

  type Values = Record<string, FormValue>;
  type ItemReference = {
    focus(): void;
    reset(): void;
  };
  type ItemProps<T extends FormValue = FormValue> = FormItemProps<T>;

  namespace TextField {
    type Props = FormItemProps<string>;
  }

  namespace PasswordField {
    type Props = FormItemProps<string>;
  }

  namespace TextArea {
    type Props = FormItemProps<string>;
  }

  namespace Checkbox {
    type Props = FormItemProps<boolean> & {
      label?: string;
    };
  }

  namespace DatePicker {
    type Props = FormItemProps<Date | null> & {
      min?: Date;
      max?: Date;
      type?: "dateTime" | "date";
    };
  }

  namespace Dropdown {
    type Props = FormItemProps<string> & {
      tooltip?: string;
      children?: React.ReactNode;
      filtering?: boolean;
      isLoading?: boolean;
      placeholder?: string;
      throttle?: boolean;
      onSearchTextChange?: (text: string) => void;
    };

    namespace Item {
      type Props = {
        title: string;
        value: string;
        icon?: ImageLike;
      };
    }

    namespace Section {
      type Props = {
        title: string;
        children?: React.ReactNode;
      };
    }
  }

  namespace TagPicker {
    type Props = FormItemProps<string[]> & {
      children?: React.ReactNode;
    };

    namespace Item {
      type Props = {
        title: string;
        value: string;
        icon?: ImageLike;
      };
    }

    namespace Section {
      type Props = {
        title: string;
        children?: React.ReactNode;
      };
    }
  }

  namespace FilePicker {
    type Props = FormItemProps<string[]> & {
      allowMultipleSelection?: boolean;
      canChooseDirectories?: boolean;
      canChooseFiles?: boolean;
      showHiddenFiles?: boolean;
    };
  }

  namespace Description {
    type Props = {
      title?: string;
      text: string;
    };
  }

  namespace LinkAccessory {
    type Props = {
      target: string;
      text: string;
    };
  }
}

export declare namespace List {
  type Props = {
    actions?: React.ReactNode;
    children?: React.ReactNode;
    filtering?: boolean;
    enableFiltering?: boolean;
    isLoading?: boolean;
    isShowingDetail?: boolean;
    searchText?: string;
    searchBarPlaceholder?: string;
    navigationTitle?: string;
    searchBarAccessory?: React.ReactNode;
    throttle?: boolean;
    onSearchTextChange?: (text: string) => void;
    onSelectionChange?: (id: string) => void;
  };

  namespace Section {
    type Props = {
      title?: string;
      subtitle?: string;
      children?: React.ReactNode;
    };
  }

  namespace EmptyView {
    type Props = {
      title?: string;
      description?: string;
      icon?: ImageLike;
      actions?: React.ReactNode;
    };
  }

  namespace Dropdown {
    namespace Item {
      type Props = {
        title: string;
        value: string;
        icon?: ImageLike;
      };
    }

    namespace Section {
      type Props = {
        title: string;
        children?: React.ReactNode;
      };
    }
  }

  namespace Item {
    type Accessory = ({ tag?: AccessoryTag } | { text?: AccessoryText }) & {
      icon?: ImageLike;
      tooltip?: string | null;
    };

    type Props = {
      title: string;
      keywords?: string[];
      icon?:
        | ImageLike
        | {
            value: ImageLike | undefined | null;
            tooltip: string;
          };
      id?: string;
      subtitle?: string;
      actions?: React.ReactNode;
      accessories?: Accessory[];
      detail?: React.ReactNode;
    };

    namespace Detail {
      type Props = {
        isLoading?: boolean;
        markdown?: string;
        metadata?: React.ReactNode;
      };

      namespace Metadata {
        type Props = {
          children?: React.ReactNode;
        };

        namespace Label {
          type Props = {
            title: string;
            text: MetadataLabelText;
            icon?: ImageLike;
          };
        }

        namespace Link {
          type Props = {
            title: string;
            target: string;
            text: string;
          };
        }

        namespace TagList {
          type Props = {
            title: string;
            children?: React.ReactNode;
          };

          namespace Item {
            type Props = {
              text: string;
              color?: ColorLike;
            };
          }
        }

        namespace Separator {
          type Props = Record<string, never>;
        }
      }
    }
  }
}

export interface ActionComponent extends React.FC<Action.Props> {
  Open: React.FC<Action.Open.Props>;
  ShowInFinder: React.FC<Record<string, unknown>>;
  RunInTerminal: React.FC<Record<string, unknown>>;
  CreateQuicklink: React.FC<Record<string, unknown>>;
  Paste: React.FC<Record<string, unknown>>;
  CopyToClipboard: React.FC<Action.CopyToClipboard.Props>;
  OpenInBrowser: React.FC<Record<string, unknown>>;
  Push: React.FC<Action.Push.Props>;
  SubmitForm: React.FC<Action.SubmitForm.Props>;
  Style: {
    Regular: "regular";
    Destructive: "destructive";
  };
}

export interface ActionPanelComponent extends React.FC<ActionPanel.Props> {
  Section: React.FC<ActionPanel.Section.Props>;
  Submenu: React.FC<ActionPanel.Submenu.Props>;
  Item: ActionComponent;
}

export interface DetailMetadataTagListComponent extends React.FC<Detail.Metadata.TagList.Props> {
  Item: React.FC<Detail.Metadata.TagList.Item.Props>;
}

export interface DetailMetadataComponent extends React.FC<Detail.Metadata.Props> {
  Label: React.FC<Detail.Metadata.Label.Props>;
  Link: React.FC<Detail.Metadata.Link.Props>;
  TagList: DetailMetadataTagListComponent;
  Separator: React.FC<Detail.Metadata.Separator.Props>;
}

export interface DetailComponent extends React.FC<Detail.Props> {
  Metadata: DetailMetadataComponent;
}

export interface FormDatePickerComponent extends React.FC<Form.DatePicker.Props> {
  Type: {
    DateTime: "dateTime";
    Date: "date";
  };
}

export interface FormDropdownComponent extends React.FC<Form.Dropdown.Props> {
  Item: React.FC<Form.Dropdown.Item.Props>;
  Section: React.FC<Form.Dropdown.Section.Props>;
}

export interface FormTagPickerComponent extends React.FC<Form.TagPicker.Props> {
  Item: React.FC<Form.TagPicker.Item.Props>;
  Section: React.FC<Form.TagPicker.Section.Props>;
}

export interface FormComponent extends React.FC<Form.Props> {
  TextField: React.FC<Form.TextField.Props>;
  PasswordField: React.FC<Form.PasswordField.Props>;
  TextArea: React.FC<Form.TextArea.Props>;
  Checkbox: React.FC<Form.Checkbox.Props>;
  DatePicker: FormDatePickerComponent;
  Dropdown: FormDropdownComponent;
  TagPicker: FormTagPickerComponent;
  FilePicker: React.FC<Form.FilePicker.Props>;
  Description: React.FC<Form.Description.Props>;
  LinkAccessory: React.FC<Form.LinkAccessory.Props>;
  Separator: React.FC<Record<string, never>>;
}

export interface ListItemDetailMetadataTagListComponent
  extends React.FC<List.Item.Detail.Metadata.TagList.Props> {
  Item: React.FC<List.Item.Detail.Metadata.TagList.Item.Props>;
}

export interface ListItemDetailMetadataComponent
  extends React.FC<List.Item.Detail.Metadata.Props> {
  Label: React.FC<List.Item.Detail.Metadata.Label.Props>;
  Link: React.FC<List.Item.Detail.Metadata.Link.Props>;
  TagList: ListItemDetailMetadataTagListComponent;
  Separator: React.FC<List.Item.Detail.Metadata.Separator.Props>;
}

export interface ListItemDetailComponent extends React.FC<List.Item.Detail.Props> {
  Metadata: ListItemDetailMetadataComponent;
}

export interface ListDropdownComponent extends React.FC<Record<string, unknown>> {
  Item: React.FC<List.Dropdown.Item.Props>;
  Section: React.FC<List.Dropdown.Section.Props>;
}

export interface ListItemComponent extends React.FC<List.Item.Props> {
  Detail: ListItemDetailComponent;
}

export interface ListComponent extends React.FC<List.Props> {
  Item: ListItemComponent;
  Section: React.FC<List.Section.Props>;
  Dropdown: ListDropdownComponent;
  EmptyView: React.FC<List.EmptyView.Props>;
}

export interface GridComponent extends React.FC<Record<string, unknown>> {
  Item: React.FC<Record<string, unknown>>;
  Section: React.FC<Record<string, unknown>>;
  Dropdown: React.FC<Record<string, unknown>>;
  EmptyView: React.FC<Record<string, unknown>>;
  Inset: Record<string, string>;
  Fit: Record<string, string>;
}

export interface MenuBarExtraComponent extends React.FC<Record<string, unknown>> {
  Item: React.FC<Record<string, unknown>>;
  Section: React.FC<Record<string, unknown>>;
  Submenu: React.FC<Record<string, unknown>>;
  Separator: React.FC<Record<string, never>>;
  isSupported: boolean;
  open: () => Promise<void>;
}

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

export interface WindowManagementNamespace {
  getActiveWindow(): Promise<WindowManagementWindow>;
  getWindows(options?: Record<string, unknown>): Promise<WindowManagementWindow[]>;
  getScreens(): Promise<WindowManagementScreen[]>;
  getActiveWorkspace(): Promise<WindowManagementWorkspace>;
  getWorkspaces(): Promise<WindowManagementWorkspace[]>;
  getWindowsOnActiveWorkspace(): Promise<WindowManagementWindow[]>;
  setWindowBounds(payload: Record<string, unknown>): Promise<void>;
  focusWindow(window: WindowManagementWindow): Promise<boolean>;
}

export declare const Action: ActionComponent;
export declare const ActionPanel: ActionPanelComponent;
export declare const Detail: DetailComponent;
export declare const Form: FormComponent;
export declare const List: ListComponent;
export declare const Grid: GridComponent;
export declare const MenuBarExtra: MenuBarExtraComponent;
export declare const WindowManagement: WindowManagementNamespace;
