const BRIDGE_BASE_URL = "http://127.0.0.1:38957";
const SYNC_ALARM_NAME = "beam-bridge-sync";
const SYNC_ALARM_MINUTES = 1 / 12;
const FETCH_TIMEOUT_MS = 2500;
const FOCUS_POLICY_REFRESH_MIN_MS = 500;
const MAX_CAPTURED_TAB_CONTENTS = 8;
const FOCUS_BLOCK_URL = browser.runtime.getURL("block.html");

let syncDebounceTimer = null;
let focusPolicy = null;
let focusPolicyRefreshPromise = null;
let lastFocusPolicyFetchAt = 0;
let focusBlockedTabs = new Map();

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

function isHttpUrl(url) {
  return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
}

function normalizeHostRule(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim().toLowerCase().replace(/^\*\./, "");
  if (!trimmed) {
    return "";
  }
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "");
  }
}

function getUrlHost(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlockedByPolicy(url, policy) {
  if (!policy?.active || policy.paused || !isHttpUrl(url)) {
    return false;
  }

  const host = getUrlHost(url);
  const websites = policy.websites || [];
  if (!host || websites.length === 0) {
    return false;
  }

  const snoozed = new Set(
    (policy.snoozedWebsites || []).map((snooze) => normalizeHostRule(snooze.target)),
  );
  const matched = websites.some((rawRule) => {
    const rule = normalizeHostRule(rawRule);
    return Boolean(rule && !snoozed.has(rule) && (host === rule || host.endsWith(`.${rule}`)));
  });

  if (policy.mode === "allow") {
    return !matched && !snoozed.has(host);
  }

  return matched;
}

function buildBlockUrl(originalUrl, policy) {
  const params = new URLSearchParams({
    url: originalUrl,
    goal: policy?.goal || "Focus Mode",
  });
  if (policy?.endsAt) {
    params.set("endsAt", String(policy.endsAt));
  }
  return `${FOCUS_BLOCK_URL}?${params.toString()}`;
}

function originalUrlFromBlockUrl(url) {
  if (typeof url !== "string" || !url.startsWith(FOCUS_BLOCK_URL)) {
    return null;
  }
  try {
    return new URL(url).searchParams.get("url");
  } catch {
    return null;
  }
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

async function fetchFocusPolicy() {
  try {
    const response = await fetchWithTimeout(`${BRIDGE_BASE_URL}/bridge/focus/state`);
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    return payload?.policy || null;
  } catch {
    return null;
  }
}

async function enforceFocusPolicyForTab(tab, policy) {
  if (!tab || typeof tab.id !== "number" || typeof tab.url !== "string") {
    return;
  }

  const blockedOriginal = originalUrlFromBlockUrl(tab.url);
  if (blockedOriginal) {
    focusBlockedTabs.set(tab.id, blockedOriginal);
    if (!isBlockedByPolicy(blockedOriginal, policy)) {
      focusBlockedTabs.delete(tab.id);
      await browser.tabs.update(tab.id, { url: blockedOriginal });
    }
    return;
  }

  if (!isBlockedByPolicy(tab.url, policy)) {
    return;
  }

  focusBlockedTabs.set(tab.id, tab.url);
  await browser.tabs.update(tab.id, { url: buildBlockUrl(tab.url, policy) });
}

async function restoreFocusBlockedTabs(policy) {
  if (policy?.active) {
    return;
  }

  for (const [tabId, originalUrl] of focusBlockedTabs.entries()) {
    try {
      await browser.tabs.update(tabId, { url: originalUrl });
    } catch {
      // Tab was closed.
    }
    focusBlockedTabs.delete(tabId);
  }

  try {
    const tabs = await browser.tabs.query({});
    await Promise.all(
      tabs.map(async (tab) => {
        const originalUrl = originalUrlFromBlockUrl(tab.url);
        if (typeof tab.id !== "number" || !originalUrl) {
          return;
        }
        focusBlockedTabs.set(tab.id, originalUrl);
        try {
          await browser.tabs.update(tab.id, { url: originalUrl });
        } catch {
          // Tab was closed or is no longer writable.
        } finally {
          focusBlockedTabs.delete(tab.id);
        }
      }),
    );
  } catch {
    // Keep focus sync running even if tab inspection fails.
  }
}

async function refreshFocusPolicy({ force = false } = {}) {
  if (focusPolicyRefreshPromise) {
    return focusPolicyRefreshPromise;
  }

  const now = Date.now();
  if (!force && now - lastFocusPolicyFetchAt < FOCUS_POLICY_REFRESH_MIN_MS) {
    return focusPolicy;
  }

  focusPolicyRefreshPromise = (async () => {
    const policy = await fetchFocusPolicy();
    lastFocusPolicyFetchAt = Date.now();
    focusPolicy = policy || null;
    await restoreFocusBlockedTabs(policy);
    return focusPolicy;
  })();

  try {
    return await focusPolicyRefreshPromise;
  } finally {
    focusPolicyRefreshPromise = null;
  }
}

async function enforceLatestFocusPolicyForTab(tab) {
  const policy = await refreshFocusPolicy({ force: true });
  if (!policy) {
    return;
  }
  await enforceFocusPolicyForTab(tab, policy);
}

async function syncFocusPolicy() {
  const policy = await refreshFocusPolicy({ force: true });
  focusPolicy = policy || null;

  if (!policy) {
    return;
  }

  try {
    const tabs = await browser.tabs.query({});
    await Promise.all(tabs.map((tab) => enforceFocusPolicyForTab(tab, policy)));
  } catch {
    // Keep normal tab sync working even if focus enforcement cannot inspect tabs.
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

function scheduleFocusSync() {
  void syncFocusPolicy();
}

function registerListeners() {
  browser.tabs.onCreated.addListener(scheduleSync);
  browser.tabs.onRemoved.addListener(scheduleSync);
  browser.tabs.onRemoved.addListener((tabId) => focusBlockedTabs.delete(tabId));
  browser.tabs.onActivated.addListener((activeInfo) => {
    scheduleSync();
    void browser.tabs.get(activeInfo.tabId).then(enforceLatestFocusPolicyForTab);
  });
  browser.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
    scheduleSync();
    void enforceLatestFocusPolicyForTab(tab);
  });
  browser.windows.onFocusChanged.addListener(() => {
    scheduleSync();
    scheduleFocusSync();
  });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM_NAME) {
      void syncBridgeSnapshot();
      void syncFocusPolicy();
    }
  });
}

browser.runtime.onInstalled.addListener(() => {
  browser.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_ALARM_MINUTES });
  void syncBridgeSnapshot();
  void syncFocusPolicy();
});

browser.runtime.onStartup.addListener(() => {
  browser.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_ALARM_MINUTES });
  void syncBridgeSnapshot();
  void syncFocusPolicy();
});

registerListeners();
void syncFocusPolicy();
