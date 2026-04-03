#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Options = {
  repoDir: string;
  tag?: string;
  githubRepo: string;
  version?: string;
  assetUrl?: string;
  assetSha256?: string;
  pkgrel: string;
};

type AssetInfo = {
  url: string;
  sha256: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const aurTemplateDir = path.join(repoRoot, "infra", "aur", "beam-launcher-bin");
const desktopTemplatePath = path.join(aurTemplateDir, "beam.desktop");
const iconTemplatePath = path.join(
  repoRoot,
  "apps",
  "desktop",
  "src-tauri",
  "icons",
  "128x128.png",
);
const licenseTemplatePath = path.join(repoRoot, "LICENSE");

const packageName = "beam-launcher-bin";
const appName = "beam";
const githubProjectUrl = "https://github.com/krishkalaria12/beam";
const packageDescription = "A blazing-fast, open-source command launcher for Linux";
const arch = "x86_64";
const localAssetFileName = `${appName}-${arch}.AppImage`;
const depends = [
  "gtk3",
  "hicolor-icon-theme",
  "libayatana-appindicator",
  "librsvg",
  "webkit2gtk-4.1",
];
const provides = ["beam"];
const conflicts = ["beam"];

function parseArgs(argv: string[]): Options {
  const options: Options = {
    repoDir: "",
    githubRepo: "krishkalaria12/beam",
    pkgrel: "1",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = argv[index + 1];

    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    if (next === undefined) {
      throw new Error(`Missing value for ${argument}`);
    }

    switch (argument) {
      case "--repo-dir": {
        options.repoDir = next;
        break;
      }
      case "--tag": {
        options.tag = next;
        break;
      }
      case "--github-repo": {
        options.githubRepo = next;
        break;
      }
      case "--version": {
        options.version = next;
        break;
      }
      case "--asset-url": {
        options.assetUrl = next;
        break;
      }
      case "--asset-sha256": {
        options.assetSha256 = next;
        break;
      }
      case "--pkgrel": {
        options.pkgrel = next;
        break;
      }
      default: {
        throw new Error(`Unknown argument: ${argument}`);
      }
    }

    index += 1;
  }

  if (options.repoDir.length === 0) {
    throw new Error("Missing required argument: --repo-dir");
  }

  const hasReleaseTag = typeof options.tag === "string" && options.tag.length > 0;
  const hasManualAsset =
    typeof options.version === "string" && typeof options.assetUrl === "string";

  if (!hasReleaseTag && !hasManualAsset) {
    throw new Error("Provide either --tag or both --version and --asset-url");
  }

  return options;
}

function sha256ForBuffer(contents: Buffer | string): string {
  return createHash("sha256").update(contents).digest("hex");
}

function sha256ForFile(filePath: string): string {
  return sha256ForBuffer(readFileSync(filePath));
}

function normalizeVersion(input: string): string {
  return input.startsWith("v") ? input.slice(1) : input;
}

async function fetchReleaseAsset(options: Options): Promise<AssetInfo> {
  if (options.assetUrl) {
    if (options.assetSha256) {
      return {
        url: options.assetUrl,
        sha256: options.assetSha256,
      };
    }

    const assetResponse = await fetch(options.assetUrl);
    if (!assetResponse.ok) {
      throw new Error(
        `Failed to download ${options.assetUrl}: ${assetResponse.status} ${assetResponse.statusText}`,
      );
    }

    const assetBuffer = Buffer.from(await assetResponse.arrayBuffer());

    return {
      url: options.assetUrl,
      sha256: sha256ForBuffer(assetBuffer),
    };
  }

  if (!options.tag) {
    throw new Error("Missing --tag for release lookup");
  }

  const response = await fetch(
    `https://api.github.com/repos/${options.githubRepo}/releases/tags/${options.tag}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch release ${options.tag}: ${response.status} ${response.statusText}`,
    );
  }

  const release = (await response.json()) as {
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  };

  const appImageAsset = release.assets?.find((asset) => {
    if (typeof asset.name !== "string" || typeof asset.browser_download_url !== "string") {
      return false;
    }

    return asset.name.endsWith(".AppImage") && /(amd64|x86_64)/i.test(asset.name);
  });

  if (!appImageAsset?.browser_download_url) {
    throw new Error(`Could not find an x86_64 AppImage asset on release ${options.tag}`);
  }

  const assetResponse = await fetch(appImageAsset.browser_download_url);
  if (!assetResponse.ok) {
    throw new Error(
      `Failed to download ${appImageAsset.browser_download_url}: ${assetResponse.status} ${assetResponse.statusText}`,
    );
  }

  const assetBuffer = Buffer.from(await assetResponse.arrayBuffer());

  return {
    url: appImageAsset.browser_download_url,
    sha256: sha256ForBuffer(assetBuffer),
  };
}

function renderPkgbuild(args: {
  version: string;
  pkgrel: string;
  assetUrl: string;
  appImageSha256: string;
  desktopSha256: string;
  iconSha256: string;
  licenseSha256: string;
}): string {
  return `# Maintained automatically by Beam release automation\npkgname=${packageName}\npkgver=${args.version}\npkgrel=${args.pkgrel}\npkgdesc=${JSON.stringify(packageDescription)}\narch=('${arch}')\nurl=${JSON.stringify(githubProjectUrl)}\nlicense=('MIT')\ndepends=(${depends.map((entry) => `'${entry}'`).join(" ")})\nprovides=(${provides.map((entry) => `'${entry}'`).join(" ")})\nconflicts=(${conflicts.map((entry) => `'${entry}'`).join(" ")})\noptions=('!strip')\nsource=(\n  '${localAssetFileName}::${args.assetUrl}'\n  'beam.desktop'\n  'beam.png'\n  'LICENSE'\n)\nnoextract=('${localAssetFileName}')\nsha256sums=(\n  '${args.appImageSha256}'\n  '${args.desktopSha256}'\n  '${args.iconSha256}'\n  '${args.licenseSha256}'\n)\n\npackage() {\n  install -Dm755 "${"${srcdir}"}/${localAssetFileName}" "${"${pkgdir}"}/opt/${appName}/${appName}.AppImage"\n  install -Dm644 "${"${srcdir}"}/beam.desktop" "${"${pkgdir}"}/usr/share/applications/${appName}.desktop"\n  install -Dm644 "${"${srcdir}"}/beam.png" "${"${pkgdir}"}/usr/share/icons/hicolor/128x128/apps/${appName}.png"\n  install -Dm644 "${"${srcdir}"}/LICENSE" "${"${pkgdir}"}/usr/share/licenses/${packageName}/LICENSE"\n\n  install -dm755 "${"${pkgdir}"}/usr/bin"\n  cat > "${"${pkgdir}"}/usr/bin/${appName}" <<'EOF'\n#!/usr/bin/env bash\nif command -v fusermount >/dev/null 2>&1 || command -v fusermount3 >/dev/null 2>&1; then\n  exec /opt/${appName}/${appName}.AppImage "$@"\nfi\n\nAPPIMAGE_EXTRACT_AND_RUN=1 exec /opt/${appName}/${appName}.AppImage "$@"\nEOF\n  chmod 755 "${"${pkgdir}"}/usr/bin/${appName}"\n}\n`;
}

function renderSrcinfo(args: {
  version: string;
  pkgrel: string;
  assetUrl: string;
  appImageSha256: string;
  desktopSha256: string;
  iconSha256: string;
  licenseSha256: string;
}): string {
  const lines = [
    `pkgbase = ${packageName}`,
    `\tpkgdesc = ${packageDescription}`,
    `\tpkgver = ${args.version}`,
    `\tpkgrel = ${args.pkgrel}`,
    `\turl = ${githubProjectUrl}`,
    `\tarch = ${arch}`,
    "\tlicense = MIT",
    ...depends.map((dependency) => `\tdepends = ${dependency}`),
    ...provides.map((entry) => `\tprovides = ${entry}`),
    ...conflicts.map((entry) => `\tconflicts = ${entry}`),
    "\toptions = !strip",
    `\tsource = ${localAssetFileName}::${args.assetUrl}`,
    "\tsource = beam.desktop",
    "\tsource = beam.png",
    "\tsource = LICENSE",
    `\tnoextract = ${localAssetFileName}`,
    `\tsha256sums = ${args.appImageSha256}`,
    `\tsha256sums = ${args.desktopSha256}`,
    `\tsha256sums = ${args.iconSha256}`,
    `\tsha256sums = ${args.licenseSha256}`,
    `\npkgname = ${packageName}`,
    `\tpkgdesc = ${packageDescription}`,
    `\tarch = ${arch}`,
  ];

  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoDir = path.resolve(options.repoDir);
  const version = normalizeVersion(options.version ?? options.tag ?? "");

  if (version.length === 0) {
    throw new Error("Could not determine version");
  }

  if (!existsSync(desktopTemplatePath)) {
    throw new Error(`Missing desktop template: ${desktopTemplatePath}`);
  }

  if (!existsSync(iconTemplatePath)) {
    throw new Error(`Missing icon file: ${iconTemplatePath}`);
  }

  if (!existsSync(licenseTemplatePath)) {
    throw new Error(`Missing license file: ${licenseTemplatePath}`);
  }

  const asset = await fetchReleaseAsset(options);

  mkdirSync(repoDir, { recursive: true });

  const outputDesktopPath = path.join(repoDir, "beam.desktop");
  const outputIconPath = path.join(repoDir, "beam.png");
  const outputLicensePath = path.join(repoDir, "LICENSE");
  const outputPkgbuildPath = path.join(repoDir, "PKGBUILD");
  const outputSrcinfoPath = path.join(repoDir, ".SRCINFO");

  copyFileSync(desktopTemplatePath, outputDesktopPath);
  copyFileSync(iconTemplatePath, outputIconPath);
  copyFileSync(licenseTemplatePath, outputLicensePath);

  const desktopSha256 = sha256ForFile(outputDesktopPath);
  const iconSha256 = sha256ForFile(outputIconPath);
  const licenseSha256 = sha256ForFile(outputLicensePath);

  const templateArgs = {
    version,
    pkgrel: options.pkgrel,
    assetUrl: asset.url,
    appImageSha256: asset.sha256,
    desktopSha256,
    iconSha256,
    licenseSha256,
  };

  writeFileSync(outputPkgbuildPath, renderPkgbuild(templateArgs));
  writeFileSync(outputSrcinfoPath, renderSrcinfo(templateArgs));

  console.log(`Rendered ${packageName} AUR files in ${repoDir}`);
}

await main();
