const { showToast } = require("@raycast/api");
const { getMessage } = require("./helper");

module.exports.default = async function relativeRequireCheck() {
  const summary = {
    ok: getMessage() === "fixture-relative-require-ok",
  };

  await showToast({
    title: "Fixture Relative Require",
    message: JSON.stringify(summary),
  });

  console.log("[fixture-relative-require]", JSON.stringify(summary));
};
