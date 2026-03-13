import {
  ExtensionChecksumAlgorithm,
  ExtensionStoreCatalog,
  ExtensionStorePackage,
  ExtensionStoreArtifact,
  ExtensionStoreArtifactVerification,
  ExtensionStoreChecksum,
  ExtensionStoreReleaseNotes,
  ExtensionStoreSearchResult,
  ExtensionStoreSourceKind,
  ExtensionStoreUpdateResult,
  ExtensionVerificationStatus,
  ExtensionReleaseChannel,
  ExtensionPackageArtifactKind,
  type ExtensionStoreAuthor,
  type ExtensionStoreCompatibility,
  type ExtensionStoreIcons,
  type ExtensionStoreRelease,
  type ExtensionStoreSource,
  type ExtensionStoreUpdate,
  type ExtensionStoreVerification,
} from "./generated/store";
import { parseExtensionManifest, type ExtensionManifestRecord } from "./manifest-types";

export interface ExtensionStoreAuthorRecord {
  handle: string;
  name?: string;
  avatarUrl?: string;
  avatar?: string;
  profileUrl?: string;
}

export interface ExtensionStoreVerificationRecord {
  status: ExtensionVerificationStatus;
  label?: string;
  verifiedBy?: string;
  summary?: string;
}

export interface ExtensionStoreCompatibilityRecord {
  platforms: string[];
  desktopEnvironments: string[];
  minimumBeamVersion?: string;
  maximumBeamVersion?: string;
  linuxTested: boolean;
  waylandTested: boolean;
  x11Tested: boolean;
  notes: string[];
}

export interface ExtensionStoreReleaseRecord {
  version: string;
  downloadUrl: string;
  publishedAt?: string;
  checksumSha256?: string;
  changelogUrl?: string;
  channel: ExtensionReleaseChannel;
  channelName?: string;
  prerelease: boolean;
  artifacts: ExtensionStoreArtifactRecord[];
  primaryArtifactId?: string;
  releaseNotes?: ExtensionStoreReleaseNotesRecord;
  publishedBy?: string;
}

export interface ExtensionStoreChecksumRecord {
  algorithm: ExtensionChecksumAlgorithm;
  value: string;
}

export interface ExtensionStoreArtifactVerificationRecord {
  signer?: string;
  signature?: string;
  provenanceUrl?: string;
  transparencyLogUrl?: string;
}

export interface ExtensionStoreArtifactRecord {
  id: string;
  kind: ExtensionPackageArtifactKind;
  downloadUrl: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  checksums: ExtensionStoreChecksumRecord[];
  verification?: ExtensionStoreArtifactVerificationRecord;
  platforms: string[];
  desktopEnvironments: string[];
}

export interface ExtensionStoreReleaseNotesRecord {
  summary?: string;
  markdown?: string;
  changelogUrl?: string;
}

export interface ExtensionStoreSourceRecord {
  id: string;
  label: string;
  kind: ExtensionStoreSourceKind;
  homepageUrl?: string;
}

export interface ExtensionStoreListingRecord {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  author: ExtensionStoreAuthorRecord;
  icons: { light?: string; dark?: string };
  categories: string[];
  tags: string[];
  source: ExtensionStoreSourceRecord;
  verification: ExtensionStoreVerificationRecord;
  compatibility: ExtensionStoreCompatibilityRecord;
  latestRelease: ExtensionStoreReleaseRecord;
  readmeUrl?: string;
  sourceUrl?: string;
  screenshots: string[];
  manifest?: ExtensionManifestRecord;
  downloadCount?: number;
  releases: ExtensionStoreReleaseRecord[];
  defaultChannel: ExtensionReleaseChannel;
  packageFormatVersion?: string;
}

export interface ExtensionStoreUpdateRecord {
  id: string;
  slug: string;
  title: string;
  installedVersion: string;
  latestVersion: string;
  latestRelease: ExtensionStoreReleaseRecord;
  verification: ExtensionStoreVerificationRecord;
  compatibility: ExtensionStoreCompatibilityRecord;
}

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringList(values: readonly string[]): string[] {
  return values
    .map((value) => normalizeOptionalString(value))
    .filter((value): value is string => value !== undefined);
}

function normalizeAuthor(
  author: ExtensionStoreAuthor | undefined,
): ExtensionStoreAuthorRecord | null {
  const handle = normalizeOptionalString(author?.handle);
  if (!handle) {
    return null;
  }

  return {
    handle,
    name: normalizeOptionalString(author?.name),
    avatarUrl: normalizeOptionalString(author?.avatarUrl),
    avatar: normalizeOptionalString(author?.avatarUrl),
    profileUrl: normalizeOptionalString(author?.profileUrl),
  };
}

function normalizeIcons(icons: ExtensionStoreIcons | undefined): { light?: string; dark?: string } {
  return {
    light: normalizeOptionalString(icons?.light),
    dark: normalizeOptionalString(icons?.dark),
  };
}

function normalizeSource(
  source: ExtensionStoreSource | undefined,
): ExtensionStoreSourceRecord | null {
  const id = normalizeOptionalString(source?.id);
  const label = normalizeOptionalString(source?.label);
  if (!id || !label) {
    return null;
  }

  return {
    id,
    label,
    kind: source?.kind ?? ExtensionStoreSourceKind.EXTENSION_STORE_SOURCE_KIND_UNSPECIFIED,
    homepageUrl: normalizeOptionalString(source?.homepageUrl),
  };
}

function normalizeVerification(
  verification: ExtensionStoreVerification | undefined,
): ExtensionStoreVerificationRecord {
  return {
    status:
      verification?.status ?? ExtensionVerificationStatus.EXTENSION_VERIFICATION_STATUS_UNSPECIFIED,
    label: normalizeOptionalString(verification?.label),
    verifiedBy: normalizeOptionalString(verification?.verifiedBy),
    summary: normalizeOptionalString(verification?.summary),
  };
}

function normalizeCompatibility(
  compatibility: ExtensionStoreCompatibility | undefined,
): ExtensionStoreCompatibilityRecord {
  return {
    platforms: normalizeStringList(compatibility?.platforms ?? []),
    desktopEnvironments: normalizeStringList(compatibility?.desktopEnvironments ?? []),
    minimumBeamVersion: normalizeOptionalString(compatibility?.minimumBeamVersion),
    maximumBeamVersion: normalizeOptionalString(compatibility?.maximumBeamVersion),
    linuxTested: Boolean(compatibility?.linuxTested),
    waylandTested: Boolean(compatibility?.waylandTested),
    x11Tested: Boolean(compatibility?.x11Tested),
    notes: normalizeStringList(compatibility?.notes ?? []),
  };
}

function normalizeRelease(
  release: ExtensionStoreRelease | undefined,
): ExtensionStoreReleaseRecord | null {
  const version = normalizeOptionalString(release?.version);
  const downloadUrl = normalizeOptionalString(release?.downloadUrl);
  if (!version || !downloadUrl) {
    return null;
  }

  return {
    version,
    downloadUrl,
    publishedAt: normalizeOptionalString(release?.publishedAt),
    checksumSha256: normalizeOptionalString(release?.checksumSha256),
    changelogUrl: normalizeOptionalString(release?.changelogUrl),
    channel: release?.channel ?? ExtensionReleaseChannel.EXTENSION_RELEASE_CHANNEL_UNSPECIFIED,
    channelName: normalizeOptionalString(release?.channelName),
    prerelease: Boolean(release?.prerelease),
    artifacts: (release?.artifacts ?? [])
      .map((artifact) => normalizeArtifact(artifact))
      .filter((artifact): artifact is ExtensionStoreArtifactRecord => artifact !== null),
    primaryArtifactId: normalizeOptionalString(release?.primaryArtifactId),
    releaseNotes: normalizeReleaseNotes(release?.releaseNotes) ?? undefined,
    publishedBy: normalizeOptionalString(release?.publishedBy),
  };
}

function normalizeChecksum(
  checksum: ExtensionStoreChecksum | undefined,
): ExtensionStoreChecksumRecord | null {
  const value = normalizeOptionalString(checksum?.value);
  if (!value) {
    return null;
  }

  return {
    algorithm:
      checksum?.algorithm ?? ExtensionChecksumAlgorithm.EXTENSION_CHECKSUM_ALGORITHM_UNSPECIFIED,
    value,
  };
}

function normalizeArtifactVerification(
  verification: ExtensionStoreArtifactVerification | undefined,
): ExtensionStoreArtifactVerificationRecord | null {
  const normalized = {
    signer: normalizeOptionalString(verification?.signer),
    signature: normalizeOptionalString(verification?.signature),
    provenanceUrl: normalizeOptionalString(verification?.provenanceUrl),
    transparencyLogUrl: normalizeOptionalString(verification?.transparencyLogUrl),
  };

  return Object.values(normalized).some((value) => value !== undefined) ? normalized : null;
}

function normalizeArtifact(
  artifact: ExtensionStoreArtifact | undefined,
): ExtensionStoreArtifactRecord | null {
  const id = normalizeOptionalString(artifact?.id);
  const downloadUrl = normalizeOptionalString(artifact?.downloadUrl);
  if (!id || !downloadUrl) {
    return null;
  }

  return {
    id,
    kind:
      artifact?.kind ?? ExtensionPackageArtifactKind.EXTENSION_PACKAGE_ARTIFACT_KIND_UNSPECIFIED,
    downloadUrl,
    fileName: normalizeOptionalString(artifact?.fileName),
    mimeType: normalizeOptionalString(artifact?.mimeType),
    sizeBytes:
      typeof artifact?.sizeBytes === "number" && Number.isFinite(artifact.sizeBytes)
        ? artifact.sizeBytes
        : undefined,
    checksums: (artifact?.checksums ?? [])
      .map((checksum) => normalizeChecksum(checksum))
      .filter((checksum): checksum is ExtensionStoreChecksumRecord => checksum !== null),
    verification: normalizeArtifactVerification(artifact?.verification) ?? undefined,
    platforms: normalizeStringList(artifact?.platforms ?? []),
    desktopEnvironments: normalizeStringList(artifact?.desktopEnvironments ?? []),
  };
}

function normalizeReleaseNotes(
  notes: ExtensionStoreReleaseNotes | undefined,
): ExtensionStoreReleaseNotesRecord | null {
  const normalized = {
    summary: normalizeOptionalString(notes?.summary),
    markdown: normalizeOptionalString(notes?.markdown),
    changelogUrl: normalizeOptionalString(notes?.changelogUrl),
  };

  return Object.values(normalized).some((value) => value !== undefined) ? normalized : null;
}

function normalizePackage(entry: ExtensionStorePackage): ExtensionStoreListingRecord | null {
  const id = normalizeOptionalString(entry.id);
  const slug = normalizeOptionalString(entry.slug);
  const title = normalizeOptionalString(entry.title);
  const author = normalizeAuthor(entry.author);
  const source = normalizeSource(entry.source);
  const latestRelease = normalizeRelease(entry.latestRelease);

  if (!id || !slug || !title || !author || !source || !latestRelease) {
    return null;
  }

  return {
    id,
    slug,
    title,
    summary: normalizeOptionalString(entry.summary),
    description: normalizeOptionalString(entry.description),
    author,
    icons: normalizeIcons(entry.icons),
    categories: normalizeStringList(entry.categories),
    tags: normalizeStringList(entry.tags),
    source,
    verification: normalizeVerification(entry.verification),
    compatibility: normalizeCompatibility(entry.compatibility),
    latestRelease,
    readmeUrl: normalizeOptionalString(entry.readmeUrl),
    sourceUrl: normalizeOptionalString(entry.sourceUrl),
    screenshots: normalizeStringList(entry.screenshots),
    manifest: entry.manifest ? (parseExtensionManifest(entry.manifest) ?? undefined) : undefined,
    downloadCount:
      typeof entry.downloadCount === "number" && Number.isFinite(entry.downloadCount)
        ? entry.downloadCount
        : undefined,
    releases: (entry.releases ?? [])
      .map((release) => normalizeRelease(release))
      .filter((release): release is ExtensionStoreReleaseRecord => release !== null),
    defaultChannel:
      entry.defaultChannel ?? ExtensionReleaseChannel.EXTENSION_RELEASE_CHANNEL_UNSPECIFIED,
    packageFormatVersion: normalizeOptionalString(entry.packageFormatVersion),
  };
}

function normalizeUpdate(entry: ExtensionStoreUpdate): ExtensionStoreUpdateRecord | null {
  const id = normalizeOptionalString(entry.id);
  const slug = normalizeOptionalString(entry.slug);
  const title = normalizeOptionalString(entry.title);
  const installedVersion = normalizeOptionalString(entry.installedVersion);
  const latestVersion = normalizeOptionalString(entry.latestVersion);
  const latestRelease = normalizeRelease(entry.latestRelease);

  if (!id || !slug || !title || !installedVersion || !latestVersion || !latestRelease) {
    return null;
  }

  return {
    id,
    slug,
    title,
    installedVersion,
    latestVersion,
    latestRelease,
    verification: normalizeVerification(entry.verification),
    compatibility: normalizeCompatibility(entry.compatibility),
  };
}

export function parseExtensionStoreCatalog(raw: unknown): ExtensionStoreListingRecord[] | null {
  try {
    const catalog = ExtensionStoreCatalog.fromJSON(raw);
    return catalog.packages
      .map((entry) => normalizePackage(entry))
      .filter((entry): entry is ExtensionStoreListingRecord => entry !== null);
  } catch {
    return null;
  }
}

export function parseExtensionStoreSearchResult(
  raw: unknown,
): ExtensionStoreListingRecord[] | null {
  try {
    const result = ExtensionStoreSearchResult.fromJSON(raw);
    return result.packages
      .map((entry) => normalizePackage(entry))
      .filter((entry): entry is ExtensionStoreListingRecord => entry !== null);
  } catch {
    return null;
  }
}

export function parseExtensionStorePackage(raw: unknown): ExtensionStoreListingRecord | null {
  try {
    return normalizePackage(ExtensionStorePackage.fromJSON(raw));
  } catch {
    return null;
  }
}

export function parseExtensionStoreUpdates(raw: unknown): ExtensionStoreUpdateRecord[] | null {
  try {
    const result = ExtensionStoreUpdateResult.fromJSON(raw);
    return result.updates
      .map((entry) => normalizeUpdate(entry))
      .filter((entry): entry is ExtensionStoreUpdateRecord => entry !== null);
  } catch {
    return null;
  }
}
