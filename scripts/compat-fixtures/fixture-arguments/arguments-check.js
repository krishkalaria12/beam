const { LocalStorage, showToast } = require("@raycast/api");

module.exports.default = async function argumentsCheck(launchProps) {
  const payload = {
    arguments: launchProps?.arguments ?? {},
    launchType: launchProps?.launchType ?? "unknown",
    observedAt: new Date().toISOString(),
  };

  const serialized = JSON.stringify(payload);
  await LocalStorage.setItem("phase0.fixture.arguments.last", serialized);

  await showToast({
    title: "Fixture Arguments",
    message: serialized,
  });

  console.log("[fixture-arguments]", serialized);
};
