import { sendRuntimeRpcRequest } from "./rpc";

type Tab = {
  active: boolean;
  id: number;
  url: string;
  favicon?: string;
  title?: string;
};

type ContentOptions = {
  cssSelector?: string;
  tabId?: number;
  format?: "html" | "text" | "markdown";
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function browserError(method: string, message: string): Error {
  return new Error(`[BrowserExtension.${method}] ${message}`);
}

async function sendBrowserRequest<T>(method: string, params: unknown): Promise<T> {
  try {
    return await sendRuntimeRpcRequest<T>(
      {
        browserExtension: {
          requestId: "",
          method,
          params,
        },
      },
      "browser-extension-request",
    );
  } catch (error) {
    throw browserError(method, toErrorMessage(error));
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, unknown>;
}

function extractValue<T>(method: string, response: unknown): T {
  const payload = toRecord(response);
  if (!Object.prototype.hasOwnProperty.call(payload, "value")) {
    throw browserError(method, "invalid response payload: missing \"value\" field");
  }
  return payload.value as T;
}

function normalizeTab(method: string, raw: unknown): Tab {
  const entry = toRecord(raw);
  const id = typeof entry.tabId === "number" && Number.isFinite(entry.tabId) ? entry.tabId : undefined;
  const url = typeof entry.url === "string" ? entry.url.trim() : "";

  if (id === undefined || url.length === 0) {
    throw browserError(method, "invalid tab payload returned by browser bridge");
  }

  return {
    id,
    url,
    active: typeof entry.active === "boolean" ? entry.active : false,
    title: typeof entry.title === "string" ? entry.title : undefined,
    favicon: typeof entry.favicon === "string" ? entry.favicon : undefined,
  };
}

function normalizeTabs(method: string, raw: unknown): Tab[] {
  if (!Array.isArray(raw)) {
    throw browserError(method, "invalid response payload: expected an array of tabs");
  }
  return raw.map((entry) => normalizeTab(method, entry));
}

function buildContentParams(options?: ContentOptions): {
  field: string;
  selector?: string;
  tabId?: number;
} {
  const format = options?.format ?? "markdown";
  if (options?.cssSelector && format === "markdown") {
    throw browserError(
      "getContent",
      "when using a CSS selector, the `format` option cannot be `markdown`",
    );
  }

  const params: { field: string; selector?: string; tabId?: number } = {
    field: format,
  };

  if (options?.cssSelector) {
    params.selector = options.cssSelector;
  }

  if (typeof options?.tabId === "number") {
    params.tabId = options.tabId;
  }

  return params;
}

async function getTabs(): Promise<Tab[]> {
  const response = await sendBrowserRequest<unknown>("getTabs", {});
  const value = extractValue<unknown>("getTabs", response);
  return normalizeTabs("getTabs", value);
}

async function getContent(options?: ContentOptions): Promise<string> {
  const params = buildContentParams(options);
  const response = await sendBrowserRequest<unknown>("getContent", params);
  const value = extractValue<unknown>("getContent", response);

  if (typeof value !== "string") {
    throw browserError("getContent", "invalid response payload: expected string content");
  }

  return value;
}

async function getActiveTab(): Promise<Tab | null> {
  const response = await sendBrowserRequest<unknown>("getActiveTab", {});
  const value = extractValue<unknown>("getActiveTab", response);
  if (value == null) {
    return null;
  }
  return normalizeTab("getActiveTab", value);
}

async function getTabById(tabId: number): Promise<Tab | null> {
  const response = await sendBrowserRequest<unknown>("getTabById", { tabId });
  const value = extractValue<unknown>("getTabById", response);
  if (value == null) {
    return null;
  }
  return normalizeTab("getTabById", value);
}

async function searchTabs(query: string): Promise<Tab[]> {
  const response = await sendBrowserRequest<unknown>("searchTabs", { query });
  const value = extractValue<unknown>("searchTabs", response);
  return normalizeTabs("searchTabs", value);
}

async function getActiveTabContent(options?: Omit<ContentOptions, "tabId">): Promise<string> {
  const activeTab = await getActiveTab();
  if (!activeTab) {
    return "";
  }

  return getContent({ ...options, tabId: activeTab.id });
}

async function getTabContent(tabId: number, options?: Omit<ContentOptions, "tabId">): Promise<string> {
  return getContent({ ...options, tabId });
}

export const BrowserExtensionAPI = {
  getTabs,
  getContent,
  getActiveTab,
  getTabById,
  searchTabs,
  getActiveTabContent,
  getTabContent,
};
