const { AI, MenuBarExtra, showToast } = require("@raycast/api");

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

module.exports.default = async function aiMenubarCheck() {
  const chunks = [];
  let endText;
  let streamError;

  const askResult = AI.ask("Explain Beam compatibility fixture in one sentence.", {
    creativity: "low",
  });

  askResult.on("data", (chunk) => {
    chunks.push(chunk);
  });

  askResult.on("end", (fullText) => {
    endText = fullText;
  });

  askResult.on("error", (error) => {
    streamError = normalizeError(error);
  });

  let finalText = "";
  let askError;
  try {
    finalText = await askResult;
  } catch (error) {
    askError = normalizeError(error);
  }

  let menuOpenOk = true;
  let menuOpenError;
  try {
    await MenuBarExtra.open();
  } catch (error) {
    menuOpenOk = false;
    menuOpenError = normalizeError(error);
  }

  const summary = {
    ai: {
      askError,
      streamError,
      finalText,
      chunkCount: chunks.length,
      endMatches: endText === finalText,
    },
    menuBarExtra: {
      isSupported: MenuBarExtra.isSupported === true,
      openOk: menuOpenOk,
      openError: menuOpenError,
    },
  };

  await showToast({
    title: "Fixture AI/MenuBar",
    message: JSON.stringify(summary),
  });

  console.log("[fixture-ai-menubar]", JSON.stringify(summary));
};
