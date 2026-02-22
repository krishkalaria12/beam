export const EXTENSIONS_PROVIDER_SCOPE: ReadonlyArray<"normal" | "compressed"> = [
  "normal",
  "compressed",
];

export const EXTENSIONS_PROVIDER_CACHE_TTL_MS = 15_000;

export const EXTENSIONS_SEARCH_DEBOUNCE_MS = 220;
export const EXTENSIONS_STORE_SEARCH_MIN_LENGTH = 2;
export const EXTENSIONS_STORE_SEARCH_STALE_TIME_MS = 20_000;

export const EXTENSIONS_STORE_SEARCH_URL =
  "https://backend.raycast.com/api/v1/store_listings/search";
export const EXTENSIONS_STORE_SEARCH_DEFAULT_LIMIT = 8;
export const EXTENSIONS_STORE_SEARCH_MAX_LIMIT = 50;
export const EXTENSIONS_STORE_VIEW_SEARCH_LIMIT = 12;

export const EXTENSIONS_STORE_PROVIDER_QUERY_PREFIX = "ext ";
export const EXTENSIONS_STORE_PROVIDER_SEARCH_LIMIT = 8;

export const EXTENSIONS_PREFERENCE_REQUEST_TIMEOUT_MS = 7_500;

export const EXTENSIONS_QUERY_KEY_INSTALLED = ["extensions", "installed"] as const;
export const EXTENSIONS_QUERY_KEY_STORE = ["extensions", "store"] as const;
export const EXTENSIONS_QUERY_KEY_PREFERENCES = ["extensions", "preferences"] as const;

export const EXTENSIONS_PROTOCOL_COMMAND_TYPES = [
  "CREATE_INSTANCE",
  "CREATE_TEXT_INSTANCE",
  "APPEND_CHILD",
  "INSERT_BEFORE",
  "REMOVE_CHILD",
  "UPDATE_PROPS",
  "UPDATE_TEXT",
  "REPLACE_CHILDREN",
  "CLEAR_CONTAINER",
  "SHOW_TOAST",
  "UPDATE_TOAST",
  "HIDE_TOAST",
  "DEFINE_PROPS_TEMPLATE",
  "APPLY_PROPS_TEMPLATE",
] as const;
export const EXTENSIONS_PROTOCOL_COMMAND_TYPE_SET = new Set<string>(
  EXTENSIONS_PROTOCOL_COMMAND_TYPES,
);

export const EXTENSIONS_RUNNER_ACTION_CONTAINER_TYPES = [
  "ActionPanel",
  "ActionPanel.Section",
  "ActionPanel.Submenu",
] as const;
export const EXTENSIONS_RUNNER_ACTION_CONTAINER_TYPE_SET = new Set<string>(
  EXTENSIONS_RUNNER_ACTION_CONTAINER_TYPES,
);

export const EXTENSIONS_RUNNER_FORM_FIELD_TYPES = [
  "Form.TextField",
  "Form.PasswordField",
  "Form.TextArea",
  "Form.Dropdown",
  "Form.Checkbox",
] as const;
export const EXTENSIONS_RUNNER_FORM_FIELD_TYPE_SET = new Set<string>(
  EXTENSIONS_RUNNER_FORM_FIELD_TYPES,
);
