import path from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  asFlag,
  asString,
  compareVersions,
  ensureDir,
  fileSizeBytes,
  normalizeOptionalString,
  parseArgs,
  readJsonFile,
  replaceFile,
  repoRoot,
  runCommand,
  sha256File,
  writeJsonFile,
} from "./utils";

type PackageJsonAuthor = string | { name?: string };

type PackageJsonManifest = {
  name?: string;
  title?: string;
  description?: string;
  icon?: string;
  author?: PackageJsonAuthor;
  owner?: string;
  version?: string;
  commands?: unknown[];
  preferences?: unknown[];
};

type StoreAuthor = {
  handle: string;
  name?: string;
  avatarUrl?: string;
  profileUrl?: string;
};

type StoreVerification = {
  status: string;
  label?: string;
  verifiedBy?: string;
  summary?: string;
};

type StoreCompatibility = {
  platforms?: string[];
  desktopEnvironments?: string[];
  minimumBeamVersion?: string;
  maximumBeamVersion?: string;
  linuxTested?: boolean;
  waylandTested?: boolean;
  x11Tested?: boolean;
  notes?: string[];
};

type StoreArtifactVerification = {
  signer?: string;
  signature?: string;
  provenanceUrl?: string;
  transparencyLogUrl?: string;
};

type StoreArtifactConfig = {
  id?: string;
  kind?: string;
  mimeType?: string;
  platforms?: string[];
  desktopEnvironments?: string[];
  verification?: StoreArtifactVerification;
};

type StoreReleaseNotes = {
  summary?: string;
  markdown?: string;
  changelogUrl?: string;
};

type StoreReleaseConfig = {
  channel?: string;
  channelName?: string;
  prerelease?: boolean;
  publishedAt?: string;
  publishedBy?: string;
  primaryArtifactId?: string;
  releaseNotes?: StoreReleaseNotes;
  artifact?: StoreArtifactConfig;
};

type StorePublishConfig = {
  packageId?: string;
  title?: string;
  summary?: string;
  description?: string;
  author?: StoreAuthor;
  icons?: {
    light?: string;
    dark?: string;
  };
  categories?: string[];
  tags?: string[];
  verification?: StoreVerification;
  compatibility?: StoreCompatibility;
  defaultChannel?: string;
  packageFormatVersion?: string;
  downloadCount?: number;
  readmeUrl?: string;
  sourceUrl?: string;
  screenshots?: string[];
  release?: StoreReleaseConfig;
};

type CatalogRelease = {
  version: string;
  channel: string;
  channelName?: string;
  prerelease?: boolean;
  publishedAt?: string;
  publishedBy?: string;
  primaryArtifactId?: string;
  releaseNotes?: StoreReleaseNotes;
  artifacts: Array<{
    id: string;
    kind: string;
    downloadUrl: string;
    fileName: string;
    mimeType?: string;
    sizeBytes: number;
    platforms?: string[];
    desktopEnvironments?: string[];
    checksums: Array<{
      algorithm: string;
      value: string;
    }>;
    verification?: StoreArtifactVerification;
  }>;
};

type CatalogPackage = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  author: StoreAuthor;
  icons?: {
    light?: string;
    dark?: string;
  };
  categories?: string[];
  tags?: string[];
  verification: StoreVerification;
  compatibility: StoreCompatibility;
  defaultChannel?: string;
  packageFormatVersion?: string;
  downloadCount?: number;
  readmeUrl?: string;
  sourceUrl?: string;
  screenshots?: string[];
  manifest?: PackageJsonManifest;
  releases: CatalogRelease[];
};

type Catalog = {
  formatVersion?: string;
  generatedAt?: string;
  source?: Record<string, unknown>;
  packages: CatalogPackage[];
};

function normalizeAuthor(author: PackageJsonAuthor | undefined): PackageJsonAuthor | undefined {
  if (typeof author === "string") {
    const trimmed = author.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (author && typeof author === "object") {
    const name = normalizeOptionalString(author.name);
    return name ? { name } : undefined;
  }

  return undefined;
}

function manifestFromPackageJson(packageJson: PackageJsonManifest): PackageJsonManifest {
  return {
    name: normalizeOptionalString(packageJson.name),
    title: normalizeOptionalString(packageJson.title),
    description: normalizeOptionalString(packageJson.description),
    icon: normalizeOptionalString(packageJson.icon),
    author: normalizeAuthor(packageJson.author),
    owner: normalizeOptionalString(packageJson.owner),
    version: normalizeOptionalString(packageJson.version),
    commands: Array.isArray(packageJson.commands) ? packageJson.commands : [],
    preferences: Array.isArray(packageJson.preferences) ? packageJson.preferences : [],
  };
}

function toChannelEnum(value: string | undefined): string {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  switch (normalized) {
    case "stable":
    case "extension_release_channel_stable":
      return "EXTENSION_RELEASE_CHANNEL_STABLE";
    case "beta":
    case "extension_release_channel_beta":
      return "EXTENSION_RELEASE_CHANNEL_BETA";
    case "nightly":
    case "extension_release_channel_nightly":
      return "EXTENSION_RELEASE_CHANNEL_NIGHTLY";
    case "custom":
    case "extension_release_channel_custom":
      return "EXTENSION_RELEASE_CHANNEL_CUSTOM";
    default:
      return "EXTENSION_RELEASE_CHANNEL_STABLE";
  }
}

function toArtifactKindEnum(value: string | undefined): string {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  switch (normalized) {
    case "tar.gz":
    case "tgz":
    case "extension_package_artifact_kind_tar_gz":
      return "EXTENSION_PACKAGE_ARTIFACT_KIND_TAR_GZ";
    case "zip":
    case "extension_package_artifact_kind_zip":
    default:
      return "EXTENSION_PACKAGE_ARTIFACT_KIND_ZIP";
  }
}

function defaultArtifactId(kind: string): string {
  if (kind === "EXTENSION_PACKAGE_ARTIFACT_KIND_TAR_GZ") {
    return "linux-tar-gz";
  }
  return "linux-zip";
}

function listSourceDirectories(packagesRoot: string): string[] {
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesRoot, entry.name))
    .filter((dirPath) => existsSync(path.join(dirPath, "package.json")));
}

function zipPackageSource(sourceDir: string, artifactPath: string): void {
  replaceFile(artifactPath);
  runCommand("zip", ["-qr", artifactPath, ".", "-x", "beam-store.json"], { cwd: sourceDir });
}

function compareReleasesDescending(left: CatalogRelease, right: CatalogRelease): number {
  const versionOrder = compareVersions(left.version, right.version);
  if (versionOrder !== 0) {
    return versionOrder * -1;
  }
  return (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "");
}

function mergeRelease(releases: CatalogRelease[], release: CatalogRelease): CatalogRelease[] {
  const next = releases.filter(
    (entry) => !(entry.version === release.version && entry.channel === release.channel),
  );
  next.push(release);
  next.sort(compareReleasesDescending);
  return next;
}

function packageManifestShouldUpdate(
  packageEntry: CatalogPackage | undefined,
  releaseChannel: string,
  defaultChannel: string,
): boolean {
  if (!packageEntry?.manifest) {
    return true;
  }

  return releaseChannel === defaultChannel;
}

function requireValue(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function isPrereleaseVersion(version: string): boolean {
  return version.includes("-");
}

function validateCompatibilityPolicy(
  sourceDir: string,
  compatibility: StoreCompatibility,
  manifest: PackageJsonManifest,
): void {
  if (!(compatibility.platforms ?? []).map((entry) => entry.toLowerCase()).includes("linux")) {
    throw new Error(
      `${sourceDir}: Beam store packages must declare linux support in compatibility.platforms.`,
    );
  }

  const minimumBeamVersion = normalizeOptionalString(compatibility.minimumBeamVersion) ?? undefined;

  if (!minimumBeamVersion) {
    throw new Error(
      `${sourceDir}: minimumBeamVersion is required in beam-store.json compatibility.`,
    );
  }
}

function validateChannelPolicy(
  sourceDir: string,
  version: string,
  releaseChannel: string,
  publishConfig: StorePublishConfig,
  _existingPackage: CatalogPackage | undefined,
): void {
  const prerelease = Boolean(publishConfig.release?.prerelease);
  const channelName = normalizeOptionalString(publishConfig.release?.channelName);

  if (releaseChannel === "EXTENSION_RELEASE_CHANNEL_STABLE") {
    if (prerelease || isPrereleaseVersion(version)) {
      throw new Error(`${sourceDir}: stable releases cannot be prerelease builds.`);
    }
  } else if (!prerelease && !isPrereleaseVersion(version)) {
    throw new Error(
      `${sourceDir}: non-stable channels must use prerelease versions or set release.prerelease=true.`,
    );
  }

  if (releaseChannel === "EXTENSION_RELEASE_CHANNEL_CUSTOM" && !channelName) {
    throw new Error(`${sourceDir}: custom channel releases require release.channelName.`);
  }
}

function validateArtifactIntegrity(artifactPath: string, artifactKind: string): void {
  const testArgs =
    artifactKind === "EXTENSION_PACKAGE_ARTIFACT_KIND_TAR_GZ"
      ? ["-tzf", artifactPath]
      : ["-t", artifactPath];
  const testCommand = artifactKind === "EXTENSION_PACKAGE_ARTIFACT_KIND_TAR_GZ" ? "tar" : "unzip";
  const testResult = spawnSync(testCommand, testArgs, { stdio: "ignore" });
  if (testResult.status !== 0) {
    throw new Error(`Artifact validation failed for ${artifactPath}.`);
  }
}

function publishPackage(
  sourceDir: string,
  catalog: Catalog,
  artifactsDir: string,
  dryRun: boolean,
): { packageId: string; version: string; artifactFile: string } {
  const packageJsonPath = path.join(sourceDir, "package.json");
  const publishConfigPath = path.join(sourceDir, "beam-store.json");
  const packageJson = readJsonFile<PackageJsonManifest>(packageJsonPath);
  const publishConfig = existsSync(publishConfigPath)
    ? readJsonFile<StorePublishConfig>(publishConfigPath)
    : {};

  const manifest = manifestFromPackageJson(packageJson);
  const slug = requireValue(manifest.name, `Missing package name in ${packageJsonPath}`);
  const version = requireValue(manifest.version, `Missing package version in ${packageJsonPath}`);
  const owner = normalizeOptionalString(manifest.owner) ?? "beam";
  const packageId = normalizeOptionalString(publishConfig.packageId) ?? `${owner}.${slug}`;
  const packageTitle = normalizeOptionalString(publishConfig.title) ?? manifest.title ?? slug;
  const defaultChannel = toChannelEnum(publishConfig.defaultChannel);
  const releaseChannel = toChannelEnum(publishConfig.release?.channel);
  const artifactKind = toArtifactKindEnum(publishConfig.release?.artifact?.kind);
  const artifactId =
    normalizeOptionalString(publishConfig.release?.artifact?.id) ?? defaultArtifactId(artifactKind);
  const fileExtension =
    artifactKind === "EXTENSION_PACKAGE_ARTIFACT_KIND_TAR_GZ" ? "tar.gz" : "zip";
  const artifactFile = `${slug}-${version}.${fileExtension}`;
  const artifactPath = path.join(artifactsDir, artifactFile);

  if (!dryRun) {
    ensureDir(artifactsDir);
    zipPackageSource(sourceDir, artifactPath);
  }

  const existingPackage = catalog.packages.find((entry) => entry.id === packageId);
  const author =
    publishConfig.author ??
    existingPackage?.author ??
    ({
      handle: owner,
      name:
        typeof manifest.author === "string"
          ? manifest.author
          : (normalizeOptionalString(manifest.author?.name) ?? owner),
    } satisfies StoreAuthor);

  if (!author?.handle) {
    throw new Error(`Missing publish author handle for ${sourceDir}`);
  }

  const verification =
    publishConfig.verification ??
    existingPackage?.verification ??
    ({
      status: "EXTENSION_VERIFICATION_STATUS_UNVERIFIED",
      label: "Unverified",
    } satisfies StoreVerification);
  const compatibility =
    publishConfig.compatibility ??
    existingPackage?.compatibility ??
    ({
      platforms: ["linux"],
      desktopEnvironments: [],
      linuxTested: true,
      waylandTested: false,
      x11Tested: false,
      notes: [],
    } satisfies StoreCompatibility);

  validateCompatibilityPolicy(sourceDir, compatibility, manifest);
  validateChannelPolicy(sourceDir, version, releaseChannel, publishConfig, existingPackage);

  if (dryRun) {
    return { packageId, version, artifactFile };
  }

  const checksum = sha256File(artifactPath);
  const sizeBytes = fileSizeBytes(artifactPath);
  validateArtifactIntegrity(artifactPath, artifactKind);
  const release: CatalogRelease = {
    version,
    channel: releaseChannel,
    channelName: normalizeOptionalString(publishConfig.release?.channelName),
    prerelease: Boolean(publishConfig.release?.prerelease),
    publishedAt:
      normalizeOptionalString(publishConfig.release?.publishedAt) ?? new Date().toISOString(),
    publishedBy: normalizeOptionalString(publishConfig.release?.publishedBy) ?? "beam-cli",
    primaryArtifactId:
      normalizeOptionalString(publishConfig.release?.primaryArtifactId) ?? artifactId,
    releaseNotes: publishConfig.release?.releaseNotes,
    artifacts: [
      {
        id: artifactId,
        kind: artifactKind,
        downloadUrl: `./artifacts/${artifactFile}`,
        fileName: artifactFile,
        mimeType:
          normalizeOptionalString(publishConfig.release?.artifact?.mimeType) ?? "application/zip",
        sizeBytes,
        platforms: publishConfig.release?.artifact?.platforms ?? ["linux"],
        desktopEnvironments: publishConfig.release?.artifact?.desktopEnvironments ?? [],
        checksums: [
          {
            algorithm: "EXTENSION_CHECKSUM_ALGORITHM_SHA256",
            value: checksum,
          },
        ],
        verification: publishConfig.release?.artifact?.verification,
      },
    ],
  };

  const packageEntry: CatalogPackage = existingPackage
    ? {
        ...existingPackage,
        slug,
        title: packageTitle,
        summary:
          normalizeOptionalString(publishConfig.summary) ??
          existingPackage.summary ??
          manifest.description,
        description:
          normalizeOptionalString(publishConfig.description) ??
          existingPackage.description ??
          manifest.description,
        author,
        icons: publishConfig.icons ?? existingPackage.icons,
        categories: publishConfig.categories ?? existingPackage.categories ?? [],
        tags: publishConfig.tags ?? existingPackage.tags ?? [],
        verification,
        compatibility,
        defaultChannel,
        packageFormatVersion:
          normalizeOptionalString(publishConfig.packageFormatVersion) ??
          existingPackage.packageFormatVersion ??
          "1",
        downloadCount: publishConfig.downloadCount ?? existingPackage.downloadCount,
        readmeUrl: normalizeOptionalString(publishConfig.readmeUrl) ?? existingPackage.readmeUrl,
        sourceUrl: normalizeOptionalString(publishConfig.sourceUrl) ?? existingPackage.sourceUrl,
        screenshots: publishConfig.screenshots ?? existingPackage.screenshots ?? [],
        manifest: packageManifestShouldUpdate(existingPackage, releaseChannel, defaultChannel)
          ? manifest
          : existingPackage.manifest,
        releases: mergeRelease(existingPackage.releases ?? [], release),
      }
    : {
        id: packageId,
        slug,
        title: packageTitle,
        summary: normalizeOptionalString(publishConfig.summary) ?? manifest.description,
        description: normalizeOptionalString(publishConfig.description) ?? manifest.description,
        author,
        icons: publishConfig.icons,
        categories: publishConfig.categories ?? [],
        tags: publishConfig.tags ?? [],
        verification,
        compatibility,
        defaultChannel,
        packageFormatVersion: normalizeOptionalString(publishConfig.packageFormatVersion) ?? "1",
        downloadCount: publishConfig.downloadCount,
        readmeUrl: normalizeOptionalString(publishConfig.readmeUrl),
        sourceUrl: normalizeOptionalString(publishConfig.sourceUrl),
        screenshots: publishConfig.screenshots ?? [],
        manifest,
        releases: [release],
      };

  catalog.packages = catalog.packages
    .filter((entry) => entry.id !== packageId)
    .concat(packageEntry)
    .sort((left, right) => left.id.localeCompare(right.id));

  return { packageId, version, artifactFile };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = asFlag(args["dry-run"]);
  const packagesRoot = path.join(repoRoot, "store", "packages");
  const catalogPath = asString(args.catalog) ?? path.join(repoRoot, "store", "catalog.json");
  const artifactsDir = asString(args["artifacts-dir"]) ?? path.join(repoRoot, "store", "artifacts");
  const requestedSource = asString(args.source);
  const publishAll = asFlag(args.all);

  if (!publishAll && !requestedSource) {
    throw new Error("Pass --source <dir> or --all");
  }

  const catalog = existsSync(catalogPath)
    ? readJsonFile<Catalog>(catalogPath)
    : {
        formatVersion: "1",
        generatedAt: new Date().toISOString(),
        source: {
          id: "beam",
          label: "Beam Store",
          kind: "EXTENSION_STORE_SOURCE_KIND_BEAM",
        },
        packages: [],
      };

  const sourceDirs = publishAll
    ? listSourceDirectories(packagesRoot)
    : [path.resolve(repoRoot, requestedSource!)];

  const results = sourceDirs.map((sourceDir) =>
    publishPackage(sourceDir, catalog, artifactsDir, dryRun),
  );

  if (!dryRun) {
    catalog.formatVersion = "1";
    catalog.generatedAt = new Date().toISOString();
    writeJsonFile(catalogPath, catalog);
  }

  for (const result of results) {
    console.log(
      `${dryRun ? "[dry-run] " : ""}published ${result.packageId}@${result.version} -> ${result.artifactFile}`,
    );
  }
}

main();
