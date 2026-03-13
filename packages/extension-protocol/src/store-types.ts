import {
  ExtensionStoreCatalog,
  ExtensionStorePackage,
  ExtensionStoreSearchResult,
  ExtensionStoreSourceKind,
  ExtensionStoreUpdateResult,
  ExtensionVerificationStatus,
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
}

export interface ExtensionStoreSourceRecord {
  id: string;
  label: string;
  kind: ExtensionStoreSourceKind;
  homepageUrl?: string;
}

export interface ExtensionStoreListingRecord {
  id: string;
  name: string;
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
  download_url: string;
  readmeUrl?: string;
  sourceUrl?: string;
  screenshots: string[];
  manifest?: ExtensionManifestRecord;
  downloadCount?: number;
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

function normalizeAuthor(author: ExtensionStoreAuthor | undefined): ExtensionStoreAuthorRecord | null {
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

function normalizeSource(source: ExtensionStoreSource | undefined): ExtensionStoreSourceRecord | null {
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
      verification?.status ??
      ExtensionVerificationStatus.EXTENSION_VERIFICATION_STATUS_UNSPECIFIED,
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

function normalizeRelease(release: ExtensionStoreRelease | undefined): ExtensionStoreReleaseRecord | null {
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
  };
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
    name: slug,
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
    download_url: latestRelease.downloadUrl,
    readmeUrl: normalizeOptionalString(entry.readmeUrl),
    sourceUrl: normalizeOptionalString(entry.sourceUrl),
    screenshots: normalizeStringList(entry.screenshots),
    manifest: entry.manifest ? parseExtensionManifest(entry.manifest) ?? undefined : undefined,
    downloadCount:
      typeof entry.downloadCount === "number" && Number.isFinite(entry.downloadCount)
        ? entry.downloadCount
        : undefined,
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

export function parseExtensionStoreSearchResult(raw: unknown): ExtensionStoreListingRecord[] | null {
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
