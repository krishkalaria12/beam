import { Command, Flags } from "@oclif/core";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Logger } from "../../utils/logger.js";

type ExtensionManifest = {
  $schema?: string;
  name: string;
  title: string;
  description?: string;
  author?: string;
  owner?: string;
  package_id?: string;
  version?: string;
  minimum_beam_version?: string;
  release_channel?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
};

function startCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function packageRootFromDirname(dirname: string): string {
  let current = dirname;

  while (true) {
    const pkgJson = path.join(current, "package.json");
    if (existsSync(pkgJson)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("Unable to resolve @beam-launcher/api package root.");
    }

    current = parent;
  }
}

function resolveTemplateDir(packageRoot: string): string {
  const packagedTemplate = path.join(packageRoot, "templates", "extension-boilerplate");
  if (existsSync(path.join(packagedTemplate, "package.json"))) {
    return packagedTemplate;
  }

  const repoTemplate = path.resolve(packageRoot, "..", "..", "extra", "extension-boilerplate");
  if (existsSync(path.join(repoTemplate, "package.json"))) {
    return repoTemplate;
  }

  throw new Error("Unable to locate the Beam extension boilerplate template.");
}

function ensureTargetDir(targetDir: string, force: boolean): void {
  if (!existsSync(targetDir)) {
    return;
  }

  const entries = readdirSync(targetDir);
  if (entries.length === 0) {
    return;
  }

  if (!force) {
    throw new Error(`Target directory ${targetDir} already exists and is not empty. Use --force to overwrite it.`);
  }

  rmSync(targetDir, { recursive: true, force: true });
}

function updateManifest(
  manifestPath: string,
  options: {
    slug: string;
    title: string;
    description: string;
    owner: string;
    author: string;
    packageId: string;
    sdkVersion: string;
  },
): void {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ExtensionManifest;

  manifest.$schema =
    "https://raw.githubusercontent.com/krishkalaria12/beam/main/extra/schemas/extension.json";
  manifest.name = options.slug;
  manifest.title = options.title;
  manifest.description = options.description;
  manifest.owner = options.owner;
  manifest.author = options.author;
  manifest.package_id = options.packageId;
  manifest.dependencies = {
    ...(manifest.dependencies ?? {}),
    "@beam-launcher/api": `^${options.sdkVersion}`,
  };

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function updateReadme(
  readmePath: string,
  options: {
    title: string;
    description: string;
    slug: string;
  },
): void {
  const next = `# ${options.title}\n\n${options.description}\n\n## Development\n\n\`\`\`bash\nbun install\nbun run dev\n\`\`\`\n\n## Build\n\n\`\`\`bash\nbun run build\n\`\`\`\n\n## Notes\n\n- Entry slug: \`${options.slug}\`\n- Built with \`@beam-launcher/api\`\n`;
  writeFileSync(readmePath, next, "utf8");
}

export default class Create extends Command {
  static description = "Scaffold a new Beam extension from the bundled boilerplate";
  static examples = [
    "<%= config.bin %> <%= command.id %> --directory my-extension",
    "<%= config.bin %> <%= command.id %> --directory my-extension --title \"My Extension\" --owner beam-launcher",
  ];

  static flags = {
    directory: Flags.string({
      char: "d",
      description: "Directory to create the new extension in",
      required: true,
    }),
    title: Flags.string({
      description: "Human-readable extension title",
      required: false,
    }),
    description: Flags.string({
      description: "Extension description",
      required: false,
    }),
    owner: Flags.string({
      description: "Owner handle used for package_id",
      required: false,
    }),
    author: Flags.string({
      description: "Author name written into the manifest",
      required: false,
    }),
    packageId: Flags.string({
      description: "Override the generated package_id",
      required: false,
    }),
    install: Flags.boolean({
      description: "Run bun install in the generated extension directory",
      default: false,
    }),
    force: Flags.boolean({
      description: "Overwrite the target directory if it already exists",
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Create);
    const logger = new Logger();
    const packageRoot = packageRootFromDirname(__dirname);
    const templateDir = resolveTemplateDir(packageRoot);
    const targetDir = path.resolve(process.cwd(), flags.directory);
    const slug = slugify(path.basename(targetDir));

    if (!slug) {
      throw new Error("Unable to derive an extension slug from the target directory.");
    }

        const title = flags.title?.trim() || startCase(slug);
        const owner = flags.owner?.trim() || "beam-launcher";
        const author = flags.author?.trim() || owner;
        const description = flags.description?.trim() || `${title} for Beam.`;
        const packageId = flags.packageId?.trim() || `${owner}.${slug}`;
        const sdkPackageJson = JSON.parse(
            readFileSync(path.join(packageRoot, "package.json"), "utf8"),
        ) as { version?: string };
        const sdkVersion = sdkPackageJson.version?.trim() || "1.0.0";

    ensureTargetDir(targetDir, flags.force);

    cpSync(templateDir, targetDir, {
      recursive: true,
      force: true,
      filter: (entry) => !entry.includes(`${path.sep}node_modules${path.sep}`) && !entry.endsWith(`${path.sep}node_modules`),
    });

        updateManifest(path.join(targetDir, "package.json"), {
            slug,
            title,
            description,
            owner,
            author,
            packageId,
            sdkVersion,
        });
    updateReadme(path.join(targetDir, "README.md"), { title, description, slug });

    if (flags.install) {
      const { spawnSync } = await import("node:child_process");
      const result = spawnSync("bun", ["install"], { cwd: targetDir, stdio: "inherit" });
      if (result.status !== 0) {
        throw new Error("Failed to install dependencies in the generated extension.");
      }
    }

    logger.logReady(`created Beam extension at ${targetDir}`);
    logger.logInfo(`next: cd ${targetDir}`);
    logger.logInfo(flags.install ? "run: bun run dev" : "run: bun install && bun run dev");
  }
}
