const { BrowserExtension, showToast } = require("@raycast/api");

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

module.exports.default = async function browserCheck() {
  const report = {};

  try {
    const tabs = await BrowserExtension.getTabs();
    report.getTabs = { ok: true, count: tabs.length };
  } catch (error) {
    report.getTabs = { ok: false, error: normalizeError(error) };
  }

  try {
    const active = await BrowserExtension.getActiveTab();
    report.getActiveTab = { ok: true, hasActiveTab: Boolean(active) };
  } catch (error) {
    report.getActiveTab = { ok: false, error: normalizeError(error) };
  }

  try {
    const matches = await BrowserExtension.searchTabs("beam");
    report.searchTabs = { ok: true, count: matches.length };
  } catch (error) {
    report.searchTabs = { ok: false, error: normalizeError(error) };
  }

  try {
    const content = await BrowserExtension.getActiveTabContent({ format: "text" });
    report.getActiveTabContent = { ok: true, length: content.length };
  } catch (error) {
    report.getActiveTabContent = { ok: false, error: normalizeError(error) };
  }

  const summary = JSON.stringify(report);

  await showToast({
    title: "Fixture Browser",
    message: summary,
  });

  console.log("[fixture-browser]", summary);
};
