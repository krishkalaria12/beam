const BRIDGE_BASE_URL = "http://127.0.0.1:38957";
const params = new URLSearchParams(window.location.search);
const originalUrl = params.get("url") || "";
const goal = params.get("goal") || "Focus Mode";

document.getElementById("goal").textContent = `${goal} is active. This site is blocked for now.`;
document.getElementById("url").textContent = originalUrl;

document.getElementById("snooze").addEventListener("click", async () => {
  try {
    await fetch(`${BRIDGE_BASE_URL}/bridge/focus/snooze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: originalUrl, durationSeconds: 5 * 60 }),
    });
  } finally {
    if (originalUrl) {
      window.location.replace(originalUrl);
    }
  }
});

document.getElementById("close").addEventListener("click", () => {
  window.close();
});
