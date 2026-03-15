import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));

export const repoRoot = path.resolve(scriptsDir, "../..");

export type ParsedArgs = Record<string, string | boolean>;

export function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      continue;
    }

    const key = argument.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

export function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asFlag(value: string | boolean | undefined): boolean {
  return value === true;
}

export function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function writeJsonFile(filePath: string, data: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): void {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

export function sha256File(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export function fileSizeBytes(filePath: string): number {
  return statSync(filePath).size;
}

export function replaceFile(filePath: string): void {
  if (existsSync(filePath)) {
    rmSync(filePath);
  }
}

export function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease: Array<number | string>;
};

function parseVersionToken(value: string): ParsedVersion | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value.trim());
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: (match[4] ?? "")
      .split(".")
      .filter((token) => token.length > 0)
      .map((token) => (/^\d+$/.test(token) ? Number(token) : token)),
  };
}

function comparePrerelease(left: Array<number | string>, right: Array<number | string>): number {
  if (left.length === 0 && right.length === 0) {
    return 0;
  }
  if (left.length === 0) {
    return 1;
  }
  if (right.length === 0) {
    return -1;
  }

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];

    if (leftValue === undefined) {
      return -1;
    }
    if (rightValue === undefined) {
      return 1;
    }
    if (leftValue === rightValue) {
      continue;
    }

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return leftValue > rightValue ? 1 : -1;
    }
    if (typeof leftValue === "number") {
      return -1;
    }
    if (typeof rightValue === "number") {
      return 1;
    }

    return leftValue > rightValue ? 1 : -1;
  }

  return 0;
}

export function compareVersions(left: string, right: string): number {
  const leftVersion = parseVersionToken(left);
  const rightVersion = parseVersionToken(right);

  if (!leftVersion || !rightVersion) {
    return left.localeCompare(right);
  }

  if (leftVersion.major !== rightVersion.major) {
    return leftVersion.major > rightVersion.major ? 1 : -1;
  }
  if (leftVersion.minor !== rightVersion.minor) {
    return leftVersion.minor > rightVersion.minor ? 1 : -1;
  }
  if (leftVersion.patch !== rightVersion.patch) {
    return leftVersion.patch > rightVersion.patch ? 1 : -1;
  }

  return comparePrerelease(leftVersion.prerelease, rightVersion.prerelease);
}
