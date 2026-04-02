import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(packageDir, "..", "..");
const upstreamDir = path.join(repoRoot, "utils-main", "src");
const targetDir = path.join(packageDir, "src");

const beamForkedFiles = new Set([
  "createDeeplink.ts",
  "showFailureToast.ts",
  "useSQL.tsx",
  "useForm.tsx",
  path.join("icon", "favicon.ts"),
]);

const textReplacements = [
  ["@raycast/api", "@beam-launcher/api"],
  ["@raycast/utils", "@beam-launcher/utils"],
];

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walk(absolutePath);
    }
    return [absolutePath];
  });
}

if (!fs.existsSync(upstreamDir)) {
  console.warn(
    `Skipping upstream sync: ${upstreamDir} does not exist. Using the checked-in Beam utils snapshot.`,
  );
  process.exit(0);
}

for (const sourcePath of walk(upstreamDir)) {
  const relativePath = path.relative(upstreamDir, sourcePath);
  if (beamForkedFiles.has(relativePath)) {
    continue;
  }

  const targetPath = path.join(targetDir, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  let contents = fs.readFileSync(sourcePath, "utf8");
  for (const [from, to] of textReplacements) {
    contents = contents.replaceAll(from, to);
  }
  fs.writeFileSync(targetPath, contents);
}
