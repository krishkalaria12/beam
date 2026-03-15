import { rmSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const packageDir = resolve(import.meta.dirname, "..");
const protoDir = resolve(packageDir, "../../infra/proto/extension-runtime");
const generatedDir = resolve(packageDir, "src/generated");
const pluginPath = require.resolve("ts-proto/protoc-gen-ts_proto");

rmSync(generatedDir, { recursive: true, force: true });
mkdirSync(generatedDir, { recursive: true });

const protoFiles = readdirSync(protoDir)
  .filter((name) => name.endsWith(".proto"))
  .sort()
  .map((name) => join(protoDir, name));

const args = [
  `--plugin=protoc-gen-ts_proto=${pluginPath}`,
  "-I",
  protoDir,
  ...protoFiles,
  "--ts_proto_opt=esModuleInterop=true,env=node,outputServices=none,useExactTypes=false,exportCommonSymbols=false",
  `--ts_proto_out=${generatedDir}`,
];

const result = spawnSync("protoc", args, {
  cwd: packageDir,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
