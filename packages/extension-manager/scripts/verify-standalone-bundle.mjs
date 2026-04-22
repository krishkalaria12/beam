import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.resolve(scriptDir, "..", "dist", "index.cjs");
const bundleSource = readFileSync(bundlePath, "utf8");

const forbiddenImports = [
  'require("react-reconciler/node_modules/react")',
  'require("react-reconciler/node_modules/react/jsx-runtime")',
];

const unresolvedImports = forbiddenImports.filter((snippet) => bundleSource.includes(snippet));

if (unresolvedImports.length > 0) {
  const details = unresolvedImports.map((snippet) => `- ${snippet}`).join("\n");
  throw new Error(
    [
      `extension-manager bundle is not self-contained: ${bundlePath}`,
      "Found unresolved runtime imports that will crash packaged builds:",
      details,
    ].join("\n"),
  );
}

console.log(`Verified standalone extension-manager bundle: ${bundlePath}`);
