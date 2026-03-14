export const EXTENSIONS_PROVIDER_SCOPE: ReadonlyArray<"normal" | "compressed"> = [
  "normal",
  "compressed",
];

export const EXTENSIONS_PROVIDER_CACHE_TTL_MS = 15_000;

export const EXTENSIONS_SEARCH_DEBOUNCE_MS = 220;
export const EXTENSIONS_STORE_SEARCH_MIN_LENGTH = 2;
export const EXTENSIONS_STORE_SEARCH_STALE_TIME_MS = 20_000;

export const EXTENSIONS_STORE_SEARCH_DEFAULT_LIMIT = 8;
export const EXTENSIONS_STORE_SEARCH_MAX_LIMIT = 50;
export const EXTENSIONS_STORE_VIEW_SEARCH_LIMIT = 12;

export const EXTENSIONS_STORE_PROVIDER_QUERY_PREFIX = "ext ";
export const EXTENSIONS_STORE_PROVIDER_SEARCH_LIMIT = 8;

export const EXTENSIONS_PREFERENCE_REQUEST_TIMEOUT_MS = 7_500;

export const EXTENSIONS_QUERY_KEY_INSTALLED = ["extensions", "installed"] as const;
export const EXTENSIONS_QUERY_KEY_STORE = ["extensions", "store"] as const;
export const EXTENSIONS_QUERY_KEY_STORE_UPDATES = ["extensions", "store-updates"] as const;
export const EXTENSIONS_QUERY_KEY_PREFERENCES = ["extensions", "preferences"] as const;

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
  "Form.DatePicker",
  "Form.TagPicker",
  "Form.FilePicker",
] as const;
export const EXTENSIONS_RUNNER_FORM_FIELD_TYPE_SET = new Set<string>(
  EXTENSIONS_RUNNER_FORM_FIELD_TYPES,
);
