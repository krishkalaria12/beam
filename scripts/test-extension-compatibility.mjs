import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { Unpackr } from "msgpackr";
import { inflate } from "pako";

const ROOT_DIR = process.cwd();
const FIXTURES_DIR = path.join(ROOT_DIR, "scripts", "compat-fixtures");
const unpackr = new Unpackr();

const VIEW_READY_TIMEOUT_MS = 8_000;
const NO_VIEW_TIMEOUT_MS = 15_000;
let compatClipboardValue;

function writeSidecarEvent(child, action, payload) {
  child.stdin.write(`${JSON.stringify({ action, payload })}\n`);
}

function getFixtureCommandPath(fixtureDir, commandName) {
  return path.join(fixtureDir, `${commandName}.js`);
}

function toErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function hasFatalStderrOutput(stderrChunks) {
  const stderr = stderrChunks.join(" ").trim();
  if (!stderr) {
    return false;
  }

  const fatalPatterns = [
    /\berror\b/i,
    /\bsyntaxerror\b/i,
    /\breferenceerror\b/i,
    /\btypeerror\b/i,
    /\bunhandled\b/i,
    /\btimeout\b/i,
  ];

  return fatalPatterns.some((pattern) => pattern.test(stderr));
}

function decodeBinaryMessages(stream, onMessage) {
  let pending = Buffer.alloc(0);

  stream.on("data", (chunk) => {
    pending = Buffer.concat([pending, Buffer.from(chunk)]);

    while (pending.length >= 4) {
      const header = pending.readUInt32BE(0);
      const isCompressed = (header & 0x80000000) !== 0;
      const payloadLength = header & 0x7fffffff;
      const totalLength = 4 + payloadLength;
      if (pending.length < totalLength) {
        break;
      }

      const payloadSlice = pending.subarray(4, totalLength);
      pending = pending.subarray(totalLength);

      let decoded = payloadSlice;
      if (isCompressed) {
        decoded = Buffer.from(inflate(payloadSlice));
      }

      const message = unpackr.unpack(decoded);
      onMessage(message);
    }
  });
}

function handleInvokeCommand(command, params) {
  switch (command) {
    case "get_applications":
      return [
        {
          name: "Beam",
          path: "/usr/bin/beam",
          bundleId: "dev.beam.desktop",
          localizedName: "Beam",
        },
      ];
    case "get_default_application":
      return {
        name: "Default Application",
        path: "/usr/bin/xdg-open",
      };
    case "get_frontmost_application":
      return {
        name: "Beam",
        path: process.execPath,
      };
    case "show_in_finder":
      if (typeof params?.path !== "string" || params.path.length === 0) {
        throw new Error("show_in_finder requires a non-empty path");
      }
      return null;
    case "trash":
      return null;
    case "search_files":
      return {
        results: [
          {
            entry: {
              path: "/tmp/beam-fixture-1.txt",
              name: "beam-fixture-1.txt",
              size: 128,
              modified: 1_704_067_200,
            },
          },
          {
            entry: {
              path: "/tmp/beam-fixture-2.md",
              name: "beam-fixture-2.md",
              size: 256,
              modified: 1_704_067_260,
            },
          },
        ],
      };
    case "get_selected_text":
      return "fixture selected text";
    case "get_selected_finder_items":
      return [{ path: "/tmp/fixture-selected-item" }];
    case "list_windows":
      return [
        {
          id: "window-1",
          title: "Beam Fixture Window",
          app_name: "Beam",
          workspace: "1",
          is_focused: true,
        },
        {
          id: "window-2",
          title: "Beam Fixture Secondary Window",
          app_name: "Editor",
          workspace: "2",
          is_focused: false,
        },
      ];
    case "clipboard_copy":
      compatClipboardValue = params?.content?.text ?? "";
      return null;
    case "clipboard_paste":
      compatClipboardValue = params?.content?.text ?? "";
      return null;
    case "clipboard_clear":
      compatClipboardValue = undefined;
      return null;
    case "clipboard_read":
      return { text: compatClipboardValue };
    case "clipboard_read_text":
      return { text: compatClipboardValue };
    default:
      throw new Error(`Unhandled invoke command in compat runner: ${command}`);
  }
}

function handleBrowserExtensionRequest(method, params) {
  const tab = {
    tabId: 7,
    url: "https://beam.example.com",
    title: "Beam Example",
    active: true,
    favicon: "https://beam.example.com/favicon.ico",
  };

  switch (method) {
    case "getTabs":
      return { value: [tab] };
    case "getActiveTab":
      return { value: tab };
    case "getTabById": {
      const tabId = typeof params?.tabId === "number" ? params.tabId : undefined;
      return { value: tabId === tab.tabId ? tab : null };
    }
    case "searchTabs": {
      const query = typeof params?.query === "string" ? params.query.trim().toLowerCase() : "";
      if (!query || tab.url.toLowerCase().includes(query) || tab.title.toLowerCase().includes(query)) {
        return { value: [tab] };
      }
      return { value: [] };
    }
    case "getTab":
    case "getContent":
      return { value: "Beam fixture browser content" };
    default:
      throw new Error(`Unhandled browser extension method in compat runner: ${method}`);
  }
}

function parseFixtureLog(tag, logs) {
  for (const entry of logs) {
    if (!entry.includes(tag)) {
      continue;
    }

    const start = entry.indexOf("{");
    const end = entry.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      continue;
    }

    try {
      return JSON.parse(entry.slice(start, end + 1));
    } catch {
      continue;
    }
  }

  return null;
}

function validateFixtureResult(fixtureName, logs, sawBatchUpdate) {
  if (fixtureName === "fixture-api-surface") {
    const summary = parseFixtureLog("[fixture-api-surface]", logs);
    if (!summary) {
      return "fixture-api-surface did not emit a parseable summary log";
    }

    if (!Array.isArray(summary.missing) || summary.missing.length > 0) {
      return "fixture-api-surface reported missing compatibility exports";
    }

    const checks = Object.values(summary.functionChecks ?? {});
    if (checks.some((ok) => ok !== true)) {
      return "fixture-api-surface reported missing function contracts";
    }

    if (summary.showInFileBrowserCall !== true) {
      return "fixture-api-surface failed to execute showInFileBrowser alias";
    }

    if (summary.storageAliasesRoundTrip !== true) {
      return "fixture-api-surface failed LocalStorage alias round-trip";
    }

    if (summary.menuBarOpenCall !== true) {
      return "fixture-api-surface failed MenuBarExtra.open invocation";
    }

    return null;
  }

  if (fixtureName === "fixture-ai-menubar") {
    const summary = parseFixtureLog("[fixture-ai-menubar]", logs);
    if (!summary) {
      return "fixture-ai-menubar did not emit a parseable summary log";
    }

    if (summary.ai?.askError || summary.ai?.streamError) {
      return "fixture-ai-menubar reported AI ask failures";
    }

    if (
      summary.ai?.finalText !== "Beam compatibility fixture AI response." ||
      summary.ai?.chunkCount < 2 ||
      summary.ai?.endMatches !== true
    ) {
      return "fixture-ai-menubar reported AI stream contract failures";
    }

    if (summary.menuBarExtra?.isSupported !== true || summary.menuBarExtra?.openOk !== true) {
      return "fixture-ai-menubar reported MenuBarExtra compatibility failure";
    }

    return null;
  }

  if (fixtureName === "fixture-ui-actions") {
    if (!sawBatchUpdate) {
      return "fixture-ui-actions did not emit a BATCH_UPDATE render payload";
    }
    return null;
  }

  if (fixtureName === "fixture-storage") {
    const summary = parseFixtureLog("[fixture-storage]", logs);
    if (!summary) {
      return "fixture-storage did not emit a parseable summary log";
    }
    if (summary.afterSet == null || summary.afterRemove != null) {
      return "fixture-storage summary failed expected state transitions";
    }
    return null;
  }

  if (fixtureName === "fixture-arguments") {
    const summary = parseFixtureLog("[fixture-arguments]", logs);
    if (!summary) {
      return "fixture-arguments did not emit a parseable summary log";
    }
    if (!summary.arguments || typeof summary.arguments !== "object") {
      return "fixture-arguments summary did not include arguments object";
    }
    return null;
  }

  if (fixtureName === "fixture-system") {
    const summary = parseFixtureLog("[fixture-system]", logs);
    if (!summary) {
      return "fixture-system did not emit a parseable summary log";
    }
    const checks = [
      summary.getApplications?.ok,
      summary.getDefaultApplication?.ok,
      summary.getFrontmostApplication?.ok,
      summary.showInFinder?.ok,
    ];
    if (checks.some((ok) => ok !== true)) {
      return "fixture-system reported API failures";
    }
    return null;
  }

  if (fixtureName === "fixture-browser-extension") {
    const summary = parseFixtureLog("[fixture-browser]", logs);
    if (!summary) {
      return "fixture-browser-extension did not emit a parseable summary log";
    }
    const checks = [
      summary.getTabs?.ok,
      summary.getActiveTab?.ok,
      summary.searchTabs?.ok,
      summary.getActiveTabContent?.ok,
    ];
    if (checks.some((ok) => ok !== true)) {
      return "fixture-browser-extension reported API failures";
    }
    return null;
  }

  if (fixtureName === "fixture-react-require") {
    const summary = parseFixtureLog("[fixture-react-require]", logs);
    if (!summary) {
      return "fixture-react-require did not emit a parseable summary log";
    }

    if (summary.ok !== true) {
      return "fixture-react-require reported React require compatibility failure";
    }

    return null;
  }

  if (fixtureName === "fixture-relative-require") {
    const summary = parseFixtureLog("[fixture-relative-require]", logs);
    if (!summary) {
      return "fixture-relative-require did not emit a parseable summary log";
    }

    if (summary.ok !== true) {
      return "fixture-relative-require reported local module require compatibility failure";
    }

    return null;
  }

  if (fixtureName === "fixture-oauth") {
    const summary = parseFixtureLog("[fixture-oauth]", logs);
    if (!summary) {
      return "fixture-oauth did not emit a parseable summary log";
    }

    if (
      summary.authorizationCode !== "fixture-oauth-code" ||
      summary.hasAccessToken !== true ||
      summary.removed !== true
    ) {
      return "fixture-oauth reported OAuth authorization/token lifecycle failure";
    }

    return null;
  }

  if (fixtureName === "fixture-runtime-ops") {
    const summary = parseFixtureLog("[fixture-runtime-ops]", logs);
    if (!summary) {
      return "fixture-runtime-ops did not emit a parseable summary log";
    }

    const checks = [
      summary.launchCommand?.ok,
      summary.confirmAlert?.ok,
      summary.clipboard?.ok,
      summary.fileSearch?.ok,
      summary.windowManagement?.ok,
      summary.selection?.ok,
    ];
    if (checks.some((ok) => ok !== true)) {
      return "fixture-runtime-ops reported API failures";
    }

    return null;
  }

  return null;
}

async function runFixture(fixtureDir, fixtureName, commandDef) {
  const mode = commandDef.mode === "view" ? "view" : "no-view";
  const pluginPath = getFixtureCommandPath(fixtureDir, commandDef.name);
  compatClipboardValue = undefined;

  await fs.access(pluginPath);

  const sidecarBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "beam-compat-sidecar-"));
  const dataDir = path.join(sidecarBaseDir, "data");
  const cacheDir = path.join(sidecarBaseDir, "cache");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });

  const child = spawn(
    "bun",
    ["sidecar/src/index.ts", `--data-dir=${dataDir}`, `--cache-dir=${cacheDir}`],
    {
      cwd: ROOT_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  const logs = [];
  const protocolErrors = [];
  const runtimeErrors = [];
  const requestFailures = [];
  const oauthTokenStore = new Map();
  let sawBatchUpdate = false;
  let completed = false;

  const timeoutMs = mode === "view" ? VIEW_READY_TIMEOUT_MS : NO_VIEW_TIMEOUT_MS;

  const done = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout while running ${fixtureName}/${commandDef.name}`));
    }, timeoutMs);

    const finish = () => {
      if (completed) {
        return;
      }
      completed = true;
      clearTimeout(timeout);
      resolve();
    };

    decodeBinaryMessages(child.stdout, (message) => {
      if (!message || typeof message !== "object") {
        return;
      }

      const type = message.type;
      const payload = message.payload;

      if (type === "BATCH_UPDATE") {
        sawBatchUpdate = true;
        if (mode === "view") {
          finish();
        }
        return;
      }

      if (type === "go-back-to-plugin-list") {
        if (mode === "no-view") {
          finish();
        }
        return;
      }

      if (type === "error") {
        runtimeErrors.push(String(payload));
        return;
      }

      if (type === "log") {
        if (typeof payload === "string") {
          logs.push(payload);
        } else if (payload && typeof payload === "object") {
          if (payload.tag === "sidecar-rpc-request-failure") {
            requestFailures.push(JSON.stringify(payload));
          }
          logs.push(JSON.stringify(payload));
        }
        return;
      }

      if (type === "invoke_command") {
        try {
          const result = handleInvokeCommand(payload.command, payload.params ?? {});
          writeSidecarEvent(child, "invoke_command-response", {
            requestId: payload.requestId,
            result,
          });
        } catch (error) {
          writeSidecarEvent(child, "invoke_command-response", {
            requestId: payload.requestId,
            error: toErrorMessage(error),
          });
        }
        return;
      }

      if (type === "browser-extension-request") {
        try {
          const result = handleBrowserExtensionRequest(payload.method, payload.params ?? {});
          writeSidecarEvent(child, "browser-extension-response", {
            requestId: payload.requestId,
            result,
          });
        } catch (error) {
          writeSidecarEvent(child, "browser-extension-response", {
            requestId: payload.requestId,
            error: toErrorMessage(error),
          });
        }
        return;
      }

      if (type === "confirm-alert") {
        writeSidecarEvent(child, "confirm-alert-response", {
          requestId: payload.requestId,
          result: true,
        });
        return;
      }

      if (type === "launch-command") {
        writeSidecarEvent(child, "launch-command-response", {
          requestId: payload.requestId,
          result: true,
        });
        return;
      }

      if (type === "ai-ask") {
        writeSidecarEvent(child, "ai-ask-chunk", {
          streamRequestId: payload.streamRequestId,
          chunk: "Beam compatibility ",
        });
        writeSidecarEvent(child, "ai-ask-chunk", {
          streamRequestId: payload.streamRequestId,
          chunk: "fixture AI response.",
        });
        writeSidecarEvent(child, "ai-ask-end", {
          streamRequestId: payload.streamRequestId,
          fullText: "Beam compatibility fixture AI response.",
        });
        writeSidecarEvent(child, "ai-ask-response", {
          requestId: payload.requestId,
          result: {
            fullText: "Beam compatibility fixture AI response.",
          },
        });
        return;
      }

      if (type === "oauth-authorize") {
        const state = new URL(payload.url).searchParams.get("state");
        writeSidecarEvent(child, "oauth-authorize-response", {
          state,
          code: "fixture-oauth-code",
        });
        return;
      }

      if (type === "oauth-get-tokens") {
        const providerId = typeof payload.providerId === "string" ? payload.providerId : "";
        const tokenSet = providerId ? (oauthTokenStore.get(providerId) ?? null) : null;
        writeSidecarEvent(child, "oauth-get-tokens-response", {
          requestId: payload.requestId,
          result: tokenSet,
        });
      }
      if (type === "oauth-set-tokens") {
        const providerId = typeof payload.providerId === "string" ? payload.providerId : "";
        if (providerId) {
          oauthTokenStore.set(providerId, payload.tokens ?? null);
        }
        writeSidecarEvent(child, "oauth-set-tokens-response", {
          requestId: payload.requestId,
          result: true,
        });
      }
      if (type === "oauth-remove-tokens") {
        const providerId = typeof payload.providerId === "string" ? payload.providerId : "";
        if (providerId) {
          oauthTokenStore.delete(providerId);
        }
        writeSidecarEvent(child, "oauth-remove-tokens-response", {
          requestId: payload.requestId,
          result: true,
        });
      }
    });

    child.stderr.on("data", (chunk) => {
      protocolErrors.push(chunk.toString());
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (!completed && code !== 0 && code !== null) {
        const stderr = protocolErrors.join(" ").trim();
        const recentLogs = logs.slice(-8).join(" | ");
        reject(
          new Error(
            `sidecar exited with code ${code}` +
              (stderr ? `; stderr: ${stderr}` : "") +
              (recentLogs ? `; logs: ${recentLogs}` : ""),
          ),
        );
      }
    });

    writeSidecarEvent(child, "run-plugin", {
      pluginPath,
      mode,
      aiAccessStatus: fixtureName === "fixture-ai-menubar",
      arguments: {
        fixture: fixtureName,
        command: commandDef.name,
      },
      launchContext: {
        source: "compat-runner",
      },
      launchType: "userInitiated",
    });
  });

  try {
    await done;
  } finally {
    child.kill("SIGTERM");
    await fs.rm(sidecarBaseDir, { recursive: true, force: true });
  }

  if (runtimeErrors.length > 0) {
    return {
      ok: false,
      reason: `runtime errors: ${runtimeErrors.join(" | ")}`,
    };
  }

  if (requestFailures.length > 0) {
    return {
      ok: false,
      reason: `request failures: ${requestFailures.join(" | ")}`,
    };
  }

  if (hasFatalStderrOutput(protocolErrors)) {
    return {
      ok: false,
      reason: `stderr: ${protocolErrors.join(" ").trim()}`,
    };
  }

  const fixtureValidationError = validateFixtureResult(fixtureName, logs, sawBatchUpdate);
  if (fixtureValidationError) {
    return {
      ok: false,
      reason: fixtureValidationError,
    };
  }

  return { ok: true };
}

async function loadFixtures() {
  const entries = await fs.readdir(FIXTURES_DIR, { withFileTypes: true });
  const fixtures = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("fixture-")) {
      continue;
    }

    const fixtureDir = path.join(FIXTURES_DIR, entry.name);
    const pkgPath = path.join(fixtureDir, "package.json");
    const pkgText = await fs.readFile(pkgPath, "utf8");
    const pkg = JSON.parse(pkgText);

    if (!Array.isArray(pkg.commands) || pkg.commands.length === 0) {
      throw new Error(`Fixture ${entry.name} has no commands in package.json`);
    }

    fixtures.push({
      name: entry.name,
      dir: fixtureDir,
      commands: pkg.commands,
    });
  }

  fixtures.sort((a, b) => a.name.localeCompare(b.name));
  return fixtures;
}

async function main() {
  const fixtures = await loadFixtures();
  if (fixtures.length === 0) {
    throw new Error("No fixtures found in scripts/compat-fixtures");
  }

  const results = [];

  for (const fixture of fixtures) {
    for (const commandDef of fixture.commands) {
      process.stdout.write(`Running ${fixture.name}/${commandDef.name} ... `);
      try {
        const result = await runFixture(fixture.dir, fixture.name, commandDef);
        if (!result.ok) {
          process.stdout.write("FAIL\n");
          results.push({ fixture: fixture.name, command: commandDef.name, ok: false, reason: result.reason });
          continue;
        }
        process.stdout.write("PASS\n");
        results.push({ fixture: fixture.name, command: commandDef.name, ok: true });
      } catch (error) {
        process.stdout.write("FAIL\n");
        results.push({
          fixture: fixture.name,
          command: commandDef.name,
          ok: false,
          reason: toErrorMessage(error),
        });
      }
    }
  }

  const failed = results.filter((entry) => !entry.ok);
  process.stdout.write("\nCompatibility test summary:\n");
  for (const entry of results) {
    if (entry.ok) {
      process.stdout.write(`- PASS ${entry.fixture}/${entry.command}\n`);
    } else {
      process.stdout.write(`- FAIL ${entry.fixture}/${entry.command}: ${entry.reason}\n`);
    }
  }

  if (failed.length > 0) {
    process.exitCode = 1;
    return;
  }

  process.stdout.write("\nAll extension compatibility fixtures passed.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
