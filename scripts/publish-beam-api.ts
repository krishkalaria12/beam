import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import {
  asFlag,
  asString,
  parseArgs,
  readJsonFile,
  repoRoot,
  runCommand,
  writeJsonFile,
} from "./utils";

type PackageJson = {
  name: string;
  version: string;
  publishConfig?: {
    access?: string;
  };
};

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const packageDir = `${repoRoot}/packages/beam-api`;
  const packageJsonPath = path.join(packageDir, "package.json");
  const packageJson = readJsonFile<PackageJson>(packageJsonPath);

  const requestedVersion = asString(args.version);
  const requestedTag = asString(args.tag);
  const requestedOtp = asString(args.otp);
  const shouldPublish = asFlag(args.publish);
  const dryRun = asFlag(args["dry-run"]) || !shouldPublish;
  const access = packageJson.publishConfig?.access ?? "public";

  if (requestedVersion && requestedVersion !== packageJson.version) {
    packageJson.version = requestedVersion;
    writeJsonFile(packageJsonPath, packageJson);
    console.log(`Updated ${packageJson.name} version to ${requestedVersion}`);
  }

  runCommand("bun", ["run", "--cwd", "packages/beam-api", "build"]);

  if (dryRun) {
    const existingTarballs = new Set(
      fs
        .readdirSync(packageDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".tgz"))
        .map((entry) => entry.name),
    );

    runCommand("bun", ["pm", "pack"], { cwd: packageDir });

    for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".tgz") || existingTarballs.has(entry.name)) {
        continue;
      }

      fs.rmSync(path.join(packageDir, entry.name));
    }

    console.log(`Dry-run complete for ${packageJson.name}@${packageJson.version}`);
    return;
  }

  if (!process.env.NPM_CONFIG_TOKEN) {
    throw new Error("Missing NPM_CONFIG_TOKEN for publish.");
  }

  const tempUserConfigPath = path.join(os.tmpdir(), `beam-npm-${process.pid}.npmrc`);
  fs.writeFileSync(
    tempUserConfigPath,
    `registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${process.env.NPM_CONFIG_TOKEN}\n`,
    "utf8",
  );

  const publishArgs = ["publish", "--access", access, "--userconfig", tempUserConfigPath];
  if (requestedTag) {
    publishArgs.push("--tag", requestedTag);
  }
  if (requestedOtp) {
    publishArgs.push("--otp", requestedOtp);
  }

  try {
    runCommand("npm", publishArgs, { cwd: packageDir });
  } finally {
    fs.rmSync(tempUserConfigPath, { force: true });
  }

  console.log(`Published ${packageJson.name}@${packageJson.version}`);
}

main();
