const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const utils = require("@raycast/utils");

function isFunction(value) {
  return typeof value === "function";
}

module.exports.default = async function utilsSurfaceCheck() {
  const requiredKeys = [
    "createDeeplink",
    "DeeplinkType",
    "executeSQL",
    "FormValidation",
    "getAvatarIcon",
    "getFavicon",
    "getProgressIcon",
    "runAppleScript",
    "showFailureToast",
    "useAI",
    "useCachedPromise",
    "useCachedState",
    "useExec",
    "useFetch",
    "useForm",
    "useFrecencySorting",
    "useLocalStorage",
    "usePromise",
    "useSQL",
    "useStreamJSON",
    "withCache",
  ];

  const missing = requiredKeys.filter((key) => !(key in utils));

  const favicon = utils.getFavicon("https://beam.example.com/path");
  const avatar = utils.getAvatarIcon("Beam Fixture");
  const progress = utils.getProgressIcon(0.42);
  const deeplink = utils.createDeeplink({
    command: "utils-surface-check",
    launchType: "userInitiated",
    arguments: { fixture: "true" },
  });

  const cachedFn = utils.withCache("fixture-utils-surface", async (value) => ({
    echoed: value,
  }));
  const cacheResult = await cachedFn("beam");

  const sqlDbPath = path.join(os.tmpdir(), `beam-utils-surface-${process.pid}.sqlite`);
  let sqlRows = [];
  let sqlError;
  try {
    sqlRows = await utils.executeSQL(sqlDbPath, "select ? as value", ["beam-sql"]);
  } catch (error) {
    sqlError = error instanceof Error ? error.message : String(error);
  } finally {
    fs.rmSync(sqlDbPath, { force: true });
  }

  const summary = {
    missing,
    functionChecks: Object.fromEntries(
      requiredKeys.map((key) => [key, typeof utils[key] === "function" || key === "DeeplinkType" || key === "FormValidation"]),
    ),
    helperChecks: {
      faviconOk: typeof favicon === "string" && favicon.includes("google.com/s2/favicons"),
      avatarOk: typeof avatar === "string" && avatar.startsWith("data:image/svg+xml;base64,"),
      progressOk: typeof progress === "string" && progress.startsWith("data:image/svg+xml;base64,"),
      deeplinkOk: typeof deeplink === "string" && deeplink.startsWith("raycast://extensions/"),
      cacheOk: cacheResult && cacheResult.echoed === "beam",
      sqlOk: Array.isArray(sqlRows) && sqlRows[0] && sqlRows[0].value === "beam-sql",
      sqlError,
      runAppleScriptIsFunction: isFunction(utils.runAppleScript),
      showFailureToastIsFunction: isFunction(utils.showFailureToast),
    },
  };

  console.log("[fixture-utils-surface]", JSON.stringify(summary));
};
