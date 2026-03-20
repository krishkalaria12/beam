import { getPreferenceValues } from "@beam-launcher/api";
import { withCache } from "@beam-launcher/utils";

export const LAB_COMMANDS = {
  dashboard: "dashboard",
  workflowForm: "workflow-form",
  captureSnapshot: "capture-snapshot",
} as const;

export type LabOpenTarget = "npm" | "repository";

export type LabPreferences = {
  defaultQuery: string;
  preferredOpenTarget: LabOpenTarget;
  showRepositorySignals: boolean;
};

export type PackageCard = {
  id: string;
  name: string;
  version: string;
  description: string;
  ownerName: string;
  npmUrl: string;
  homepageUrl?: string;
  repositoryUrl?: string;
  keywords: string[];
  signalScore: number;
};

type RegistryDocument = {
  author?: string | { name?: string };
  description?: string;
  homepage?: string;
  keywords?: string[];
  maintainers?: Array<{ name?: string }>;
  name: string;
  repository?: string | { url?: string };
  version: string;
};

const DEFAULT_PREFERENCES: LabPreferences = {
  defaultQuery: "beam",
  preferredOpenTarget: "repository",
  showRepositorySignals: true,
};

const CURATED_PACKAGES = [
  "@beam-launcher/api",
  "@beam-launcher/utils",
  "react",
  "dequal",
  "typescript",
] as const;

function isOpenTarget(value: unknown): value is LabOpenTarget {
  return value === "npm" || value === "repository";
}

function normalizeRepositoryUrl(repository?: RegistryDocument["repository"]): string | undefined {
  const raw = typeof repository === "string" ? repository : repository?.url;
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }

  return raw.trim().replace(/^git\+/, "").replace(/\.git$/, "");
}

function deriveOwnerName(document: RegistryDocument): string {
  const fallbackOwner = document.name.startsWith("@")
    ? document.name.slice(1).split("/")[0]
    : document.name.split("/")[0];

  if (typeof document.author === "string" && document.author.trim().length > 0) {
    return document.author.trim();
  }

  if (typeof document.author !== "string" && document.author?.name?.trim()) {
    return document.author.name.trim();
  }

  if (document.maintainers?.[0]?.name?.trim()) {
    return document.maintainers[0].name.trim();
  }

  return fallbackOwner;
}

function buildSignalScore(document: RegistryDocument): number {
  const keywordWeight = Math.min((document.keywords?.length ?? 0) / 8, 0.65);
  const repositoryWeight = normalizeRepositoryUrl(document.repository) ? 0.2 : 0;
  const homepageWeight = document.homepage?.trim() ? 0.15 : 0;

  return Math.min(keywordWeight + repositoryWeight + homepageWeight, 1);
}

async function fetchPackageCard(name: string): Promise<PackageCard> {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`npm registry request failed for ${name}: ${response.status}`);
  }

  const document = (await response.json()) as RegistryDocument;
  const repositoryUrl = normalizeRepositoryUrl(document.repository);

  return {
    id: document.name,
    name: document.name,
    version: document.version,
    description: document.description?.trim() || "No package description published.",
    ownerName: deriveOwnerName(document),
    npmUrl: `https://www.npmjs.com/package/${document.name}`,
    homepageUrl: document.homepage?.trim() || undefined,
    repositoryUrl,
    keywords: document.keywords ?? [],
    signalScore: buildSignalScore(document),
  };
}

const loadPackageCardsCached = withCache(
  async (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    const visiblePackages = CURATED_PACKAGES.filter((candidate) => {
      if (normalizedQuery.length === 0) {
        return true;
      }

      return candidate.toLowerCase().includes(normalizedQuery);
    });

    return Promise.all(visiblePackages.map((candidate) => fetchPackageCard(candidate)));
  },
  { maxAge: 5 * 60 * 1000 },
);

export async function loadPackageCards(query: string): Promise<PackageCard[]> {
  return loadPackageCardsCached(query);
}

export function getLabPreferences(): LabPreferences {
  const raw = getPreferenceValues<Record<string, unknown>>();

  return {
    defaultQuery:
      typeof raw.defaultQuery === "string" && raw.defaultQuery.trim().length > 0
        ? raw.defaultQuery.trim()
        : DEFAULT_PREFERENCES.defaultQuery,
    preferredOpenTarget: isOpenTarget(raw.preferredOpenTarget)
      ? raw.preferredOpenTarget
      : DEFAULT_PREFERENCES.preferredOpenTarget,
    showRepositorySignals:
      typeof raw.showRepositorySignals === "boolean"
        ? raw.showRepositorySignals
        : DEFAULT_PREFERENCES.showRepositorySignals,
  };
}

export function getPreferredPackageUrl(
  card: PackageCard,
  preferredOpenTarget: LabOpenTarget,
): string {
  if (preferredOpenTarget === "repository" && card.repositoryUrl) {
    return card.repositoryUrl;
  }

  return card.npmUrl;
}
