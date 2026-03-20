import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(packageDir, "..", "..");

const sourcePath = path.join(repoRoot, "packages", "beam-utils", "dist", "index.cjs");
const targetPath = path.join(packageDir, "src", "vendor", "beam-utils-main.ts");

if (!fs.existsSync(sourcePath)) {
  throw new Error(
    `Missing Beam utils bundle at ${sourcePath}. Build packages/beam-utils before syncing the vendor snapshot.`,
  );
}

const source = fs.readFileSync(sourcePath, "utf8");
const output = `export const BEAM_UTILS_MAIN = ${JSON.stringify(source)};\n`;

fs.writeFileSync(targetPath, output);
