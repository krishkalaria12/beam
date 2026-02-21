import { isTauri } from "@tauri-apps/api/core";
import { appCacheDir, appLocalDataDir } from "@tauri-apps/api/path";
import { Command, type Child } from "@tauri-apps/plugin-shell";

type ExtensionMode = "view" | "no-view";

interface RunPluginPayload {
  pluginPath: string;
  mode: ExtensionMode;
  aiAccessStatus: boolean;
}

interface SidecarEvent {
  action: string;
  payload: Record<string, unknown> | RunPluginPayload;
}

class ExtensionSidecarService {
  private child: Child | null = null;
  private startPromise: Promise<void> | null = null;

  async start(): Promise<void> {
    if (!isTauri()) {
      throw new Error("desktop runtime is required");
    }
    if (this.child) {
      return;
    }
    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = (async () => {
      const args = [
        `--data-dir=${await appLocalDataDir()}`,
        `--cache-dir=${await appCacheDir()}`,
      ];

      const command = Command.sidecar("binaries/app", args, {
        encoding: "raw",
      });

      command.stdout.on("data", () => {
        // Beam currently runs no-view commands only; sidecar UI payloads are intentionally ignored.
      });
      command.stderr.on("data", (line: unknown) => {
        console.error("[extensions-sidecar] stderr:", line);
      });

      this.child = await command.spawn();
    })();

    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  stop(): void {
    if (!this.child) {
      return;
    }

    this.child.kill();
    this.child = null;
  }

  private writeEvent(event: SidecarEvent): void {
    if (!this.child) {
      throw new Error("extensions sidecar is not running");
    }

    this.child.write(`${JSON.stringify(event)}\n`);
  }

  async runPlugin(payload: RunPluginPayload): Promise<void> {
    await this.start();
    this.writeEvent({
      action: "run-plugin",
      payload,
    });
  }
}

export const extensionSidecarService = new ExtensionSidecarService();
