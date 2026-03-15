const BRIDGE_BASE_URL = "http://127.0.0.1:38957";
const SYNC_ALARM_NAME = "beam-bridge-sync";
const SYNC_ALARM_MINUTES = 1 / 12;
const FETCH_TIMEOUT_MS = 2500;
const MAX_CAPTURED_TAB_CONTENTS = 8;

let syncDebounceTimer = null;

function truncate(input, maxChars) {
  if (typeof input !== "string") {
    return "";
  }
  if (input.length <= maxChars) {
    return input;
  }
  return input.slice(0, maxChars);
}

function shouldCaptureTabUrl(url) {
  if (typeof url !== "string" || url.length === 0) {
    return false;
  }

  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://");
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getClientId() {
  const data = await browser.storage.local.get("beamBridgeClientId");
  if (typeof data.beamBridgeClientId === "string" && data.beamBridgeClientId.length > 0) {
    return data.beamBridgeClientId;
  }

  const nextId = crypto.randomUUID();
  await browser.storage.local.set({ beamBridgeClientId: nextId });
  return nextId;
}

async function setBadge(connected) {
  const text = connected ? "" : "!";
  const color = connected ? "#16a34a" : "#dc2626";
  await browser.browserAction.setBadgeText({ text });
  await browser.browserAction.setBadgeBackgroundColor({ color });
}

async function pingBridge(clientId) {
  try {
    const response = await fetchWithTimeout(`${BRIDGE_BASE_URL}/bridge/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        browser: "firefox",
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

function serializeTabs(tabs) {
  return tabs
    .filter((tab) => typeof tab.id === "number" && shouldCaptureTabUrl(tab.url))
    .map((tab) => ({
      tabId: tab.id,
      url: tab.url,
      title: tab.title || "",
      favicon: tab.favIconUrl || null,
      active: Boolean(tab.active),
    }));
}

async function captureTabContent(tabId) {
  if (typeof tabId !== "number") {
    return null;
  }

  try {
    const results = await browser.tabs.executeScript(tabId, {
      code: `(() => {
        const text = document?.body?.innerText || "";
        const html = document?.documentElement?.outerHTML || "";
        return {
          text,
          html,
          markdown: text
        };
      })();`,
    });

    const payload = results?.[0];
    if (!payload || typeof payload !== "object") {
      return null;
    }

    return {
      tabId,
      text: truncate(payload.text || "", 200000),
      html: truncate(payload.html || "", 200000),
      markdown: truncate(payload.markdown || "", 200000),
    };
  } catch {
    return null;
  }
}

function buildContentCaptureTabIds(serializedTabs, activeTabId) {
  const ids = [];

  if (typeof activeTabId === "number") {
    ids.push(activeTabId);
  }

  for (const tab of serializedTabs) {
    if (ids.length >= MAX_CAPTURED_TAB_CONTENTS) {
      break;
    }

    if (!ids.includes(tab.tabId)) {
      ids.push(tab.tabId);
    }
  }

  return ids;
}

async function captureContentsForTabs(tabIds) {
  const captured = await Promise.all(tabIds.map((tabId) => captureTabContent(tabId)));
  return captured.filter((content) => content && typeof content.tabId === "number");
}

async function syncBridgeSnapshot() {
  const clientId = await getClientId();
  const connected = await pingBridge(clientId);

  if (!connected) {
    await setBadge(false);
    return;
  }

  try {
    const tabs = await browser.tabs.query({});
    const serializedTabs = serializeTabs(tabs);
    const activeTab = serializedTabs.find((tab) => tab.active) || null;
    const tabIdsToCapture = buildContentCaptureTabIds(serializedTabs, activeTab?.tabId);
    const contents = await captureContentsForTabs(tabIdsToCapture);
    const activeContent = activeTab
      ? contents.find((content) => content.tabId === activeTab.tabId) || null
      : null;

    const response = await fetchWithTimeout(`${BRIDGE_BASE_URL}/bridge/tabs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        browser: "firefox",
        tabs: serializedTabs,
        contents,
        activeContent,
      }),
    });

    await setBadge(response.ok);
  } catch {
    await setBadge(false);
  }
}

function scheduleSync() {
  if (syncDebounceTimer !== null) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    void syncBridgeSnapshot();
  }, 250);
}

function registerListeners() {
  browser.tabs.onCreated.addListener(scheduleSync);
  browser.tabs.onRemoved.addListener(scheduleSync);
  browser.tabs.onActivated.addListener(scheduleSync);
  browser.tabs.onUpdated.addListener(() => scheduleSync());
  browser.windows.onFocusChanged.addListener(scheduleSync);
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM_NAME) {
      void syncBridgeSnapshot();
    }
  });
}

browser.runtime.onInstalled.addListener(() => {
  browser.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_ALARM_MINUTES });
  void syncBridgeSnapshot();
});

browser.runtime.onStartup.addListener(() => {
  browser.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_ALARM_MINUTES });
  void syncBridgeSnapshot();
});

registerListeners();
