const api = require("@raycast/api");

function isFunction(value) {
  return typeof value === "function";
}

module.exports.default = async function apiSurfaceCheck() {
  const requiredKeys = [
    "showInFileBrowser",
    "showInFinder",
    "closeMainWindow",
    "clearSearchBar",
    "popToRoot",
    "updateCommandMetadata",
    "openExtensionPreferences",
    "openCommandPreferences",
    "randomId",
    "confirmAlert",
    "WindowManagement",
    "FileSearch",
    "BrowserExtension",
    "LocalStorage",
    "MenuBarExtra",
    "allLocalStorageItems",
    "getLocalStorageItem",
    "setLocalStorageItem",
    "removeLocalStorageItem",
    "clearLocalStorage",
  ];

  const missing = requiredKeys.filter((key) => !(key in api));

  const functionChecks = {
    showInFileBrowser: isFunction(api.showInFileBrowser),
    showInFinder: isFunction(api.showInFinder),
    closeMainWindow: isFunction(api.closeMainWindow),
    clearSearchBar: isFunction(api.clearSearchBar),
    popToRoot: isFunction(api.popToRoot),
    updateCommandMetadata: isFunction(api.updateCommandMetadata),
    openExtensionPreferences: isFunction(api.openExtensionPreferences),
    openCommandPreferences: isFunction(api.openCommandPreferences),
    randomId: isFunction(api.randomId),
    confirmAlert: isFunction(api.confirmAlert),
    localStorageGetItem: isFunction(api.LocalStorage && api.LocalStorage.getItem),
    localStorageSetItem: isFunction(api.LocalStorage && api.LocalStorage.setItem),
    menuBarOpen: isFunction(api.MenuBarExtra && api.MenuBarExtra.open),
    allLocalStorageItems: isFunction(api.allLocalStorageItems),
    getLocalStorageItem: isFunction(api.getLocalStorageItem),
    setLocalStorageItem: isFunction(api.setLocalStorageItem),
    removeLocalStorageItem: isFunction(api.removeLocalStorageItem),
    clearLocalStorage: isFunction(api.clearLocalStorage),
  };

  let showInFileBrowserCall = false;
  try {
    await api.showInFileBrowser("/tmp");
    showInFileBrowserCall = true;
  } catch {
    showInFileBrowserCall = false;
  }

  let storageAliasesRoundTrip = false;
  try {
    await api.setLocalStorageItem("fixture.alias.key", "fixture-alias-value");
    const value = await api.getLocalStorageItem("fixture.alias.key");
    await api.removeLocalStorageItem("fixture.alias.key");
    await api.clearLocalStorage();
    storageAliasesRoundTrip = value === "fixture-alias-value";
  } catch {
    storageAliasesRoundTrip = false;
  }

  let menuBarOpenCall = false;
  try {
    await api.MenuBarExtra.open();
    menuBarOpenCall = true;
  } catch {
    menuBarOpenCall = false;
  }

  const summary = {
    missing,
    functionChecks,
    showInFileBrowserCall,
    storageAliasesRoundTrip,
    menuBarOpenCall,
  };

  console.log("[fixture-api-surface]", JSON.stringify(summary));
};
