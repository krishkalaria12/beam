import { getPreferenceValues } from "@beam-launcher/api";

export type AurPackage = {
	Description?: string;
	FirstSubmitted?: number;
	ID: number;
	Keywords?: string[];
	LastModified?: number;
	Maintainer?: string | null;
	Name: string;
	NumVotes?: number;
	OutOfDate?: number | null;
	PackageBase: string;
	Popularity?: number;
	URL?: string;
	URLPath?: string;
	Version: string;
};

type AurResponse = {
	error?: string;
	resultcount: number;
	results: AurPackage[];
	type: string;
	version: number;
};

export type AurSearchResult = {
	results: AurPackage[];
	resultCount: number;
};

export type AurSortMode = "relevance" | "popularity" | "votes" | "updated";
export type AurPackageScope = "all" | "maintained" | "orphaned";
export type AurHelper = "yay" | "paru" | "trizen" | "pikaur";
export type AurExtensionPreferences = {
	defaultQuery: string;
	defaultSortMode: AurSortMode;
	packageScope: AurPackageScope;
	showExampleQueries: boolean;
	preferredHelper: AurHelper;
};

export const MIN_QUERY_LENGTH = 2;
export const MAX_VISIBLE_RESULTS = 75;
export const AUR_LOADING_ICON = "loader-2";
const AUR_SORT_MODES: readonly AurSortMode[] = [
	"relevance",
	"popularity",
	"votes",
	"updated",
];
const AUR_PACKAGE_SCOPES: readonly AurPackageScope[] = [
	"all",
	"maintained",
	"orphaned",
];
const AUR_HELPERS: readonly AurHelper[] = ["yay", "paru", "trizen", "pikaur"];
const DEFAULT_AUR_PREFERENCES: AurExtensionPreferences = {
	defaultQuery: "neovim",
	defaultSortMode: "popularity",
	packageScope: "all",
	showExampleQueries: true,
	preferredHelper: "yay",
};
export const EXAMPLE_QUERIES = [
	"neovim",
	"yay",
	"hyprland-git",
	"visual-studio-code-bin",
	"wezterm-git",
];
export const AUR_SAMPLE_PACKAGE: AurPackage = {
	ID: 9001,
	Name: "yay-bin",
	PackageBase: "yay-bin",
	Version: "12.4.2-1",
	Description:
		"Binary release of the AUR helper yay, useful for testing Beam command flows.",
	Maintainer: "beam-launcher",
	NumVotes: 1463,
	Popularity: 12.37,
	URL: "https://github.com/Jguer/yay",
	Keywords: ["aur", "helper", "pacman"],
	FirstSubmitted: 1_606_435_200,
	LastModified: 1_742_947_200,
};

const AUR_BASE_URL = "https://aur.archlinux.org";

function isOneOf<T extends readonly string[]>(
	value: unknown,
	options: T,
): value is T[number] {
	return (
		typeof value === "string" && (options as readonly string[]).includes(value)
	);
}

export function resolveAurPreferences(
	rawPreferences: Record<string, unknown> = {},
): AurExtensionPreferences {
	return {
		defaultQuery:
			typeof rawPreferences.defaultQuery === "string"
				? rawPreferences.defaultQuery.trim()
				: DEFAULT_AUR_PREFERENCES.defaultQuery,
		defaultSortMode: isOneOf(rawPreferences.defaultSortMode, AUR_SORT_MODES)
			? rawPreferences.defaultSortMode
			: DEFAULT_AUR_PREFERENCES.defaultSortMode,
		packageScope: isOneOf(rawPreferences.packageScope, AUR_PACKAGE_SCOPES)
			? rawPreferences.packageScope
			: DEFAULT_AUR_PREFERENCES.packageScope,
		showExampleQueries:
			typeof rawPreferences.showExampleQueries === "boolean"
				? rawPreferences.showExampleQueries
				: DEFAULT_AUR_PREFERENCES.showExampleQueries,
		preferredHelper: isOneOf(rawPreferences.preferredHelper, AUR_HELPERS)
			? rawPreferences.preferredHelper
			: DEFAULT_AUR_PREFERENCES.preferredHelper,
	};
}

export function getAurPreferences(): AurExtensionPreferences {
	return resolveAurPreferences(getPreferenceValues<Record<string, unknown>>());
}

export async function searchAurPackages(
	query: string,
	signal?: AbortSignal,
): Promise<AurSearchResult> {
	const normalizedQuery = query.trim();
	if (normalizedQuery.length < MIN_QUERY_LENGTH) {
		return { results: [], resultCount: 0 };
	}

	const response = await fetch(
		`${AUR_BASE_URL}/rpc/v5/search/${encodeURIComponent(normalizedQuery)}?by=name-desc`,
		{
			headers: {
				accept: "application/json",
			},
			signal,
		},
	);

	if (!response.ok) {
		throw new Error(`AUR search failed with status ${response.status}`);
	}

	const payload = (await response.json()) as AurResponse;
	if (payload.error) {
		throw new Error(payload.error);
	}

	return {
		results: payload.results,
		resultCount: payload.resultcount,
	};
}

export function getAurPackageUrl(pkg: AurPackage): string {
	return `${AUR_BASE_URL}/packages/${encodeURIComponent(pkg.Name)}`;
}

export function getAurSearchUrl(query: string): string {
	return `${AUR_BASE_URL}/packages?K=${encodeURIComponent(query.trim())}`;
}

export function getAurCloneUrl(pkg: AurPackage): string {
	return `${AUR_BASE_URL}/${encodeURIComponent(pkg.PackageBase)}.git`;
}

export function getAurSnapshotUrl(pkg: AurPackage): string {
	if (pkg.URLPath) {
		return `${AUR_BASE_URL}${pkg.URLPath}`;
	}

	return `${AUR_BASE_URL}/cgit/aur.git/snapshot/${encodeURIComponent(pkg.PackageBase)}.tar.gz`;
}

export function formatAurDate(epochSeconds?: number | null): string | null {
	if (!epochSeconds || epochSeconds <= 0) {
		return null;
	}

	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(epochSeconds * 1000));
}

export function formatPopularity(value?: number): string {
	if (typeof value !== "number") {
		return "0.00";
	}

	return value.toFixed(2);
}

export function formatVotes(value?: number): string {
	return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function buildAurInstallCommand(
	pkgOrName: AurPackage | string,
	helper?: string,
	includeDevel = false,
): string {
	const packageName =
		typeof pkgOrName === "string" ? pkgOrName.trim() : pkgOrName.Name.trim();
	const resolvedHelper = helper?.trim() || getAurPreferences().preferredHelper;

	return `${resolvedHelper} -S${includeDevel ? " --devel" : ""} ${packageName || "<package>"}`.trim();
}

export function getAurSignals(
	pkg: AurPackage,
): Array<{ text: string; color?: string }> {
	const signals: Array<{ text: string; color?: string }> = [
		{
			text: pkg.Maintainer ? "Maintained" : "Orphaned",
			color: pkg.Maintainer ? "#16a34a" : "#f59e0b",
		},
		{
			text: pkg.OutOfDate ? "Outdated" : "Fresh",
			color: pkg.OutOfDate ? "#f97316" : "#2563eb",
		},
	];

	if (pkg.URL) {
		signals.push({ text: "Homepage", color: "#6b7280" });
	}

	if (pkg.Keywords?.length) {
		signals.push(
			...pkg.Keywords.slice(0, 2).map((keyword) => ({ text: keyword })),
		);
	}

	return signals;
}

export function buildDetailMarkdown(pkg: AurPackage): string {
	const description =
		pkg.Description?.trim() ||
		"No description provided by the package maintainer.";
	const homepage = pkg.URL ? `- Homepage: ${pkg.URL}` : "";
	const submitted = formatAurDate(pkg.FirstSubmitted);
	const modified = formatAurDate(pkg.LastModified);
	const outdated = formatAurDate(pkg.OutOfDate);

	return [
		`# ${pkg.Name}`,
		"",
		description,
		"",
		"## Install",
		"",
		"```bash",
		buildAurInstallCommand(pkg),
		"```",
		"",
		"## Source",
		"",
		"```bash",
		`git clone ${getAurCloneUrl(pkg)}`,
		"```",
		"",
		"## Package Facts",
		"",
		`- Package base: ${pkg.PackageBase}`,
		`- Version: ${pkg.Version}`,
		`- Maintainer: ${pkg.Maintainer ?? "Orphaned"}`,
		`- Votes: ${formatVotes(pkg.NumVotes)}`,
		`- Popularity: ${formatPopularity(pkg.Popularity)}`,
		submitted ? `- First submitted: ${submitted}` : "",
		modified ? `- Last updated: ${modified}` : "",
		outdated ? `- Out of date since: ${outdated}` : "",
		homepage,
	]
		.filter(Boolean)
		.join("\n");
}

export function sortAurPackages(
	packages: AurPackage[],
	mode: AurSortMode,
): AurPackage[] {
	const copy = [...packages];

	if (mode === "popularity") {
		return copy.sort(
			(left, right) => (right.Popularity ?? 0) - (left.Popularity ?? 0),
		);
	}

	if (mode === "votes") {
		return copy.sort(
			(left, right) => (right.NumVotes ?? 0) - (left.NumVotes ?? 0),
		);
	}

	if (mode === "updated") {
		return copy.sort(
			(left, right) => (right.LastModified ?? 0) - (left.LastModified ?? 0),
		);
	}

	return copy;
}

export function getAurAccentColor(pkg: AurPackage): string {
	if (pkg.OutOfDate) {
		return "#f59e0b";
	}

	if ((pkg.Popularity ?? 0) >= 8) {
		return "#16a34a";
	}

	if ((pkg.Popularity ?? 0) >= 3) {
		return "#2563eb";
	}

	return "#6b7280";
}

export function getMaintainerLabel(pkg: AurPackage): string {
	return pkg.Maintainer?.trim() || "Orphaned";
}

export function filterAurPackagesByScope(
	packages: AurPackage[],
	scope: AurPackageScope,
): AurPackage[] {
	if (scope === "maintained") {
		return packages.filter((pkg) => Boolean(pkg.Maintainer?.trim()));
	}

	if (scope === "orphaned") {
		return packages.filter((pkg) => !pkg.Maintainer?.trim());
	}

	return packages;
}

export function getAurPackageScopeLabel(scope: AurPackageScope): string {
	if (scope === "maintained") {
		return "Maintained Only";
	}

	if (scope === "orphaned") {
		return "Orphaned Only";
	}

	return "All Packages";
}
