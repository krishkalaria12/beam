import { sendRequest } from "./rpc";

type Tab = {
  active: boolean;
  id: number;
  url: string;
  favicon?: string;
  title?: string;
};

type RawTab = {
  tabId: number;
  url: string;
  title?: string;
  favicon?: string;
  active: boolean;
};

const sendBrowserRequest = <T>(method: string, params: unknown) => {
  return sendRequest<T>("browser-extension-request", { method, params });
};

type ContentOptions = {
  cssSelector?: string;
  tabId?: number;
  format?: "html" | "text" | "markdown";
};

function buildContentParams(options?: ContentOptions): {
  field: string;
  selector?: string;
  tabId?: number;
} {
  const format = options?.format ?? "markdown";
  if (options?.cssSelector && format === "markdown") {
    throw new Error("When using a CSS selector, the `format` option can not be `markdown`.");
  }

  const params: { field: string; selector?: string; tabId?: number } = {
    field: format,
  };

  if (options?.cssSelector) {
    params.selector = options.cssSelector;
  }

  if (options?.tabId) {
    params.tabId = options.tabId;
  }

  return params;
}

export const BrowserExtensionAPI = {
  async getTabs(): Promise<Tab[]> {
    const result = await sendBrowserRequest<{ value: RawTab[] }>("getTabs", {});
    return result.value.map((tab) => ({
      id: tab.tabId,
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      active: tab.active,
    }));
  },
  async getContent(options?: ContentOptions): Promise<string> {
    const params = buildContentParams(options);
    const result = await sendBrowserRequest<{ value: string }>("getTab", params);
    return result.value;
  },
  async getActiveTab(): Promise<Tab | null> {
    try {
      const result = await sendBrowserRequest<{ value: RawTab | null }>("getActiveTab", {});
      const tab = result.value;
      if (!tab) {
        return null;
      }
      return {
        id: tab.tabId,
        url: tab.url,
        title: tab.title,
        favicon: tab.favicon,
        active: tab.active,
      };
    } catch {
      const tabs = await this.getTabs();
      return tabs.find((tab) => tab.active) ?? tabs[0] ?? null;
    }
  },
  async getTabById(tabId: number): Promise<Tab | null> {
    try {
      const result = await sendBrowserRequest<{ value: RawTab | null }>("getTabById", { tabId });
      const tab = result.value;
      if (!tab) {
        return null;
      }
      return {
        id: tab.tabId,
        url: tab.url,
        title: tab.title,
        favicon: tab.favicon,
        active: tab.active,
      };
    } catch {
      const tabs = await this.getTabs();
      return tabs.find((tab) => tab.id === tabId) ?? null;
    }
  },
  async searchTabs(query: string): Promise<Tab[]> {
    try {
      const result = await sendBrowserRequest<{ value: RawTab[] }>("searchTabs", { query });
      return result.value.map((tab) => ({
        id: tab.tabId,
        url: tab.url,
        title: tab.title,
        favicon: tab.favicon,
        active: tab.active,
      }));
    } catch {
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) {
        return this.getTabs();
      }

      const tabs = await this.getTabs();
      return tabs.filter(
        (tab) =>
          tab.url.toLowerCase().includes(normalizedQuery) ||
          (tab.title ?? "").toLowerCase().includes(normalizedQuery),
      );
    }
  },
  async getActiveTabContent(options?: Omit<ContentOptions, "tabId">): Promise<string> {
    const activeTab = await this.getActiveTab();
    if (!activeTab) {
      return "";
    }

    return this.getContent({ ...options, tabId: activeTab.id });
  },
  async getTabContent(tabId: number, options?: Omit<ContentOptions, "tabId">): Promise<string> {
    return this.getContent({ ...options, tabId });
  },
};
