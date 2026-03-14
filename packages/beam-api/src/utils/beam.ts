import { spawnSync } from "node:child_process";

export type BeamClientOptions = {
  binaryPath: string;
};

export class BeamClient {
  constructor(private readonly options: BeamClientOptions = { binaryPath: "beam" }) {}

  ping() {
    return this.invoke("/ping");
  }

  refreshDevSession(extensionId: string) {
    return this.invoke(`/api/extensions/develop/refresh?id=${extensionId}`);
  }

  startDevSession(extensionId: string) {
    return this.invoke(`/api/extensions/develop/start?id=${extensionId}`);
  }

  stopDevSession(extensionId: string) {
    return this.invoke(`/api/extensions/develop/stop?id=${extensionId}`);
  }

  private invoke(endpoint: string): Error | null {
    if (endpoint.startsWith("/")) {
      endpoint = endpoint.slice(1);
    }

    const url = `beam://${endpoint}`;
    const result = spawnSync(this.options.binaryPath, [url]);

    if (result.error) return result.error;

    return result.status === 0 ? null : new Error(result.stderr.toString());
  }
}
