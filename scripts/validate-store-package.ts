import path from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  compareVersions,
  fileSizeBytes,
  normalizeOptionalString,
  parseArgs,
  readJsonFile,
  repoRoot,
  sha256File,
} from "./utils";

type PackageJsonManifest = {
  name?: string;
  title?: string;
  description?: string;
  owner?: string;
  version?: string;
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

type StoreArtifactConfig = {
  id?: string;
  kind?: string;
};

type StoreReleaseConfig = {
  channel?: string;
  channelName?: string;
  prerelease?: boolean;
  artifact?: StoreArtifactConfig;
};

type StorePublishConfig = {
  packageId?: string;
  defaultChannel?: string;
  compatibility?: StoreCompatibility;
  release?: StoreReleaseConfig;
};

type CatalogChecksum = {
  algorithm: string;
  value: string;
};

type CatalogArtifact = {
  id: string;
  kind: string;
  downloadUrl: string;
  fileName: string;
  sizeBytes: number;
  checksums: CatalogChecksum[];
};

type CatalogRelease = {
  version: string;
  channel: string;
  channelName?: string;
  prerelease?: boolean;
  artifacts: CatalogArtifact[];
};

type CatalogPackage = {
  id: string;
  slug: string;
  defaultChannel?: string;
  compatibility: StoreCompatibility;
  manifest?: PackageJsonManifest;
  releases: CatalogRelease[];
};

type Catalog = {
  packages: CatalogPackage[];
};

function listSourceDirectories(packagesRoot: string): string[] {
  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesRoot, entry.name))
    .filter((dirPath) => existsSync(path.join(dirPath, "package.json")));
}

function requireValue(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }

  return value;
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

function assertCompatibleManifest(sourceDir: string, manifest: PackageJsonManifest, publish: StorePublishConfig): void {
  const platforms = (publish.compatibility?.platforms ?? []).map((entry) => entry.toLowerCase());
  if (!platforms.includes("linux")) {
    throw new Error(`${sourceDir}: compatibility.platforms must include linux.`);
  }

  if (
    !normalizeOptionalString(publish.compatibility?.minimumBeamVersion)
  ) {
    throw new Error(`${sourceDir}: minimumBeamVersion is required.`);
  }

  const version = requireValue(normalizeOptionalString(manifest.version), `${sourceDir}: package.json version is required.`);
  const channel = toChannelEnum(publish.release?.channel);
  const prerelease = Boolean(publish.release?.prerelease);

  if (channel === "EXTENSION_RELEASE_CHANNEL_STABLE" && (prerelease || version.includes("-"))) {
    throw new Error(`${sourceDir}: stable releases cannot be prerelease builds.`);
  }

  if (channel !== "EXTENSION_RELEASE_CHANNEL_STABLE" && !prerelease && !version.includes("-")) {
    throw new Error(`${sourceDir}: non-stable releases must be prerelease builds or set prerelease=true.`);
  }

  if (channel === "EXTENSION_RELEASE_CHANNEL_CUSTOM" && !normalizeOptionalString(publish.release?.channelName)) {
    throw new Error(`${sourceDir}: custom releases require release.channelName.`);
  }
}

function validateArchive(artifactPath: string, artifactKind: string): void {
  const testArgs =
    artifactKind === "EXTENSION_PACKAGE_ARTIFACT_KIND_TAR_GZ"
      ? ["-tzf", artifactPath]
      : ["-t", artifactPath];
  const testCommand = artifactKind === "EXTENSION_PACKAGE_ARTIFACT_KIND_TAR_GZ" ? "tar" : "unzip";
  const result = spawnSync(testCommand, testArgs, { stdio: "ignore" });
  if (result.status !== 0) {
    throw new Error(`Artifact archive validation failed for ${artifactPath}.`);
  }
}

function validateCatalog(catalog: Catalog, artifactsDir: string): void {
  const packageIds = new Set<string>();

  for (const pkg of catalog.packages) {
    if (packageIds.has(pkg.id)) {
      throw new Error(`Duplicate package id in catalog: ${pkg.id}`);
    }
    packageIds.add(pkg.id);

    if (pkg.defaultChannel && !pkg.releases.some((release) => release.channel === pkg.defaultChannel)) {
      throw new Error(`Catalog package ${pkg.id} defaultChannel has no matching release.`);
    }

    const releaseKeys = new Set<string>();
    for (const release of pkg.releases) {
      const key = `${release.version}:${release.channel}`;
      if (releaseKeys.has(key)) {
        throw new Error(`Catalog package ${pkg.id} has duplicate release ${key}.`);
      }
      releaseKeys.add(key);

      for (const artifact of release.artifacts) {
        const artifactPath = artifact.downloadUrl.startsWith("./artifacts/")
          ? path.join(artifactsDir, artifact.fileName)
          : path.resolve(repoRoot, artifact.downloadUrl);

        if (!existsSync(artifactPath)) {
          throw new Error(`Missing artifact for ${pkg.id}@${release.version}: ${artifactPath}`);
        }

        validateArchive(artifactPath, artifact.kind);

        const checksum = artifact.checksums.find(
          (entry) => entry.algorithm === "EXTENSION_CHECKSUM_ALGORITHM_SHA256",
        );
        if (!checksum) {
          throw new Error(`Artifact ${artifact.fileName} is missing a SHA-256 checksum.`);
        }

        if (sha256File(artifactPath) !== checksum.value) {
          throw new Error(`Artifact checksum mismatch for ${artifact.fileName}.`);
        }

        if (fileSizeBytes(artifactPath) !== artifact.sizeBytes) {
          throw new Error(`Artifact size mismatch for ${artifact.fileName}.`);
        }
      }
    }

    const stableReleases = pkg.releases
      .filter((release) => release.channel === "EXTENSION_RELEASE_CHANNEL_STABLE")
      .map((release) => release.version)
      .sort(compareVersions);

    for (let index = 1; index < stableReleases.length; index += 1) {
      if (compareVersions(stableReleases[index], stableReleases[index - 1]) < 0) {
        throw new Error(`Stable releases are out of order for ${pkg.id}.`);
      }
    }
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const packagesRoot = path.join(repoRoot, "store", "packages");
  const catalogPath = path.join(repoRoot, "store", "catalog.json");
  const artifactsDir = path.join(repoRoot, "store", "artifacts");
  const requestedSource = normalizeOptionalString(typeof args.source === "string" ? args.source : undefined);
  const validateAll = args.all === true || !requestedSource;

  const sourceDirs = validateAll
    ? listSourceDirectories(packagesRoot)
    : [path.resolve(repoRoot, requestedSource!)];

  for (const sourceDir of sourceDirs) {
    const manifest = readJsonFile<PackageJsonManifest>(path.join(sourceDir, "package.json"));
    const publish = readJsonFile<StorePublishConfig>(path.join(sourceDir, "beam-store.json"));
    assertCompatibleManifest(sourceDir, manifest, publish);
  }

  const catalog = readJsonFile<Catalog>(catalogPath);
  validateCatalog(catalog, artifactsDir);

  console.log(`validated ${sourceDirs.length} store package source(s) and catalog artifacts`);
}

main();
