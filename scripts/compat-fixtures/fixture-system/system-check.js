const {
  getApplications,
  getDefaultApplication,
  getFrontmostApplication,
  showInFinder,
  showToast,
} = require("@raycast/api");

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

module.exports.default = async function systemCheck() {
  const report = {};

  try {
    const apps = await getApplications();
    report.getApplications = { ok: true, count: apps.length };
  } catch (error) {
    report.getApplications = { ok: false, error: normalizeError(error) };
  }

  try {
    const app = await getDefaultApplication("/tmp");
    report.getDefaultApplication = { ok: true, name: app?.name ?? null };
  } catch (error) {
    report.getDefaultApplication = { ok: false, error: normalizeError(error) };
  }

  try {
    const app = await getFrontmostApplication();
    report.getFrontmostApplication = { ok: true, name: app?.name ?? null };
  } catch (error) {
    report.getFrontmostApplication = { ok: false, error: normalizeError(error) };
  }

  try {
    await showInFinder("/tmp");
    report.showInFinder = { ok: true };
  } catch (error) {
    report.showInFinder = { ok: false, error: normalizeError(error) };
  }

  const summary = JSON.stringify(report);

  await showToast({
    title: "Fixture System",
    message: summary,
  });

  console.log("[fixture-system]", summary);
};
