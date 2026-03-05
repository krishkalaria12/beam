const React = require("react");
const { showToast } = require("@raycast/api");

module.exports.default = async function reactRequireCheck() {
  const summary = {
    ok: typeof React.createElement === "function",
  };

  await showToast({
    title: "Fixture React Require",
    message: JSON.stringify(summary),
  });

  console.log("[fixture-react-require]", JSON.stringify(summary));
};
