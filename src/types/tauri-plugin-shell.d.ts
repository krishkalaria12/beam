declare module "@tauri-apps/plugin-shell" {
  export interface Child {
    readonly pid: number;
    write(data: string): void;
    kill(): void;
  }

  export interface CommandOptions {
    encoding?: "raw" | "utf8";
  }

  export interface CommandStream<T = unknown> {
    on(event: "data", callback: (data: T) => void): void;
  }

  export function open(path: string, openWith?: string): Promise<void>;

  export class Command {
    static sidecar(program: string, args?: string[], options?: CommandOptions): Command;

    readonly stdout: CommandStream<unknown>;
    readonly stderr: CommandStream<unknown>;
    spawn(): Promise<Child>;
  }
}
