const { LocalStorage, showToast } = require("@raycast/api");

module.exports.default = async function storageCheck() {
  const key = "phase0.fixture.storage";

  const before = await LocalStorage.getItem(key);
  const value = `value-${Date.now()}`;

  await LocalStorage.setItem(key, value);
  const afterSet = await LocalStorage.getItem(key);
  await LocalStorage.removeItem(key);
  const afterRemove = await LocalStorage.getItem(key);

  const summary = JSON.stringify({ before, afterSet, afterRemove });

  await showToast({
    title: "Fixture Storage",
    message: summary,
  });

  console.log("[fixture-storage]", summary);
};
