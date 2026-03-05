const {
  Clipboard,
  FileSearch,
  WindowManagement,
  launchCommand,
  confirmAlert,
  getSelectedText,
  getSelectedFinderItems,
  showToast,
} = require("@raycast/api");

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

module.exports.default = async function runtimeOpsCheck() {
  const report = {};

  try {
    await launchCommand({
      name: "runtime-ops-target",
      type: "userInitiated",
      arguments: { q: "fixture" },
      context: { source: "fixture-runtime-ops" },
    });
    report.launchCommand = { ok: true };
  } catch (error) {
    report.launchCommand = { ok: false, error: normalizeError(error) };
  }

  try {
    const accepted = await confirmAlert({
      title: "Fixture Confirm",
      message: "Confirm API contract",
      primaryAction: { title: "Continue" },
    });
    report.confirmAlert = { ok: accepted === true };
  } catch (error) {
    report.confirmAlert = { ok: false, error: normalizeError(error) };
  }

  try {
    await Clipboard.copy("fixture-clipboard-text");
    const readText = await Clipboard.readText();
    const read = await Clipboard.read();
    await Clipboard.clear();
    const afterClear = await Clipboard.readText();

    report.clipboard = {
      ok: readText === "fixture-clipboard-text" && read?.text === "fixture-clipboard-text" && !afterClear,
    };
  } catch (error) {
    report.clipboard = { ok: false, error: normalizeError(error) };
  }

  try {
    const results = await FileSearch.search("beam", { page: 1, perPage: 2 });
    report.fileSearch = {
      ok:
        Array.isArray(results) &&
        results.length === 2 &&
        typeof results[0].path === "string" &&
        results[0].path.length > 0,
    };
  } catch (error) {
    report.fileSearch = { ok: false, error: normalizeError(error) };
  }

  try {
    const activeWindow = await WindowManagement.getActiveWindow();
    const desktops = await WindowManagement.getDesktops();
    const windows = await WindowManagement.getWindowsOnActiveDesktop();

    report.windowManagement = {
      ok:
        Boolean(activeWindow && activeWindow.id) &&
        Array.isArray(desktops) &&
        desktops.length > 0 &&
        Array.isArray(windows) &&
        windows.length > 0,
    };
  } catch (error) {
    report.windowManagement = { ok: false, error: normalizeError(error) };
  }

  try {
    const selectedText = await getSelectedText();
    const selectedItems = await getSelectedFinderItems();
    report.selection = {
      ok:
        selectedText === "fixture selected text" &&
        Array.isArray(selectedItems) &&
        selectedItems.length > 0 &&
        selectedItems[0].path === "/tmp/fixture-selected-item",
    };
  } catch (error) {
    report.selection = { ok: false, error: normalizeError(error) };
  }

  await showToast({
    title: "Fixture Runtime Ops",
    message: JSON.stringify(report),
  });

  console.log("[fixture-runtime-ops]", JSON.stringify(report));
};
