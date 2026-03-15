import { Grid, Icon, List, updateCommandMetadata } from "@beam-launcher/api";
import { useEffect, useMemo, useState } from "react";

import {
	AUR_LOADING_ICON,
	MIN_QUERY_LENGTH,
	filterAurPackagesByScope,
	getAurAccentColor,
	getAurPackageScopeLabel,
	getAurPreferences,
	getMaintainerLabel,
	type AurSortMode,
} from "./aur";
import { AurPackageActions } from "./aur-parts";
import { useAurSearch } from "./use-aur-search";

const SORT_OPTIONS: Array<{ value: AurSortMode; title: string }> = [
	{ value: "relevance", title: "Relevance" },
	{ value: "popularity", title: "Popularity" },
	{ value: "votes", title: "Votes" },
	{ value: "updated", title: "Recently Updated" },
];
const GridDropdown = Grid.Dropdown as typeof List.Dropdown;
const GridItem = Grid.Item as typeof Grid.Item & {
	Detail: typeof List.Item.Detail;
};

export default function AurGridExplorer() {
	const [extensionPreferences] = useState(getAurPreferences);
	const [searchText, setSearchText] = useState(
		() => extensionPreferences.defaultQuery,
	);
	const [sortMode, setSortMode] = useState<AurSortMode>(
		() => extensionPreferences.defaultSortMode,
	);
	const { visibleResults, resultCount, isLoading, error, setError } =
		useAurSearch(searchText, sortMode);
	const normalizedQuery = searchText.trim();
	const packageScopeLabel = getAurPackageScopeLabel(
		extensionPreferences.packageScope,
	);
	const scopedResults = useMemo(
		() =>
			filterAurPackagesByScope(
				visibleResults,
				extensionPreferences.packageScope,
			),
		[extensionPreferences.packageScope, visibleResults],
	);
	const sections = useMemo(() => {
		const spotlight = scopedResults.slice(0, 6);
		const remainder = scopedResults.slice(spotlight.length);
		const maintained = remainder.filter((pkg) => pkg.Maintainer);
		const orphaned = remainder.filter((pkg) => !pkg.Maintainer);

		return [
			spotlight.length > 0
				? {
						key: "spotlight",
						title: "Spotlight",
						subtitle: "Top AUR hits",
						columns: 3,
						items: spotlight,
					}
				: null,
			maintained.length > 0
				? {
						key: "maintained",
						title: "Maintained Packages",
						subtitle: `${maintained.length} entries`,
						columns: 4,
						items: maintained,
					}
				: null,
			orphaned.length > 0
				? {
						key: "orphaned",
						title: "Orphaned Packages",
						subtitle: `${orphaned.length} entries`,
						columns: 4,
						items: orphaned,
					}
				: null,
		].filter(
			(section): section is NonNullable<typeof section> => section !== null,
		);
	}, [scopedResults]);

	useEffect(() => {
		const subtitle = isLoading
			? `Searching ${normalizedQuery || "AUR"}`
			: normalizedQuery
				? extensionPreferences.packageScope === "all"
					? `${resultCount} grid results`
					: `${scopedResults.length} ${packageScopeLabel.toLowerCase()} results`
				: "AUR grid";

		void updateCommandMetadata({ subtitle });
	}, [
		extensionPreferences.packageScope,
		isLoading,
		normalizedQuery,
		packageScopeLabel,
		resultCount,
		scopedResults.length,
	]);

	return (
		<Grid
			columns={4}
			aspectRatio={1}
			fit={Grid.Fit.Fill}
			filtering={false}
			isShowingDetail
			navigationTitle="AUR Grid Explorer"
			searchText={searchText}
			searchBarPlaceholder="Search packages for the grid view..."
			onSearchTextChange={(value: string) => {
				setSearchText(value);
				setError(null);
			}}
			searchBarAccessory={
				<GridDropdown
					value={sortMode}
					onChange={setSortMode}
					tooltip="Sort grid"
				>
					<GridDropdown.Section key="default" title="Default">
						<GridDropdown.Item
							key="relevance"
							value="relevance"
							title="Relevance"
						/>
					</GridDropdown.Section>
					<GridDropdown.Section key="metrics" title="Metrics">
						{SORT_OPTIONS.filter((option) => option.value !== "relevance").map(
							(option) => (
								<GridDropdown.Item
									key={option.value}
									value={option.value}
									title={option.title}
								/>
							),
						)}
					</GridDropdown.Section>
				</GridDropdown>
			}
		>
			{isLoading && visibleResults.length === 0 ? (
				<Grid.EmptyView
					key="loading"
					title="Searching packages…"
					description={`Fetching cards for "${normalizedQuery}".`}
					icon={AUR_LOADING_ICON}
				/>
			) : null}

			{normalizedQuery.length > 0 &&
			normalizedQuery.length < MIN_QUERY_LENGTH ? (
				<Grid.EmptyView
					key="too-short"
					title="Keep typing"
					description={`AUR search starts after ${MIN_QUERY_LENGTH} characters.`}
					icon={Icon.MagnifyingGlass}
				/>
			) : null}

			{error ? (
				<Grid.EmptyView
					key="error"
					title="Grid search failed"
					description={error}
					icon={Icon.Exclamationmark}
				/>
			) : null}

			{normalizedQuery.length === 0 &&
			sections.length === 0 &&
			!isLoading &&
			!error ? (
				<Grid.EmptyView
					key="idle"
					title="Search AUR"
					description={`Start typing at least ${MIN_QUERY_LENGTH} characters to populate the grid.`}
					icon={Icon.MagnifyingGlass}
				/>
			) : null}

			{sections.length === 0 &&
			normalizedQuery.length >= MIN_QUERY_LENGTH &&
			!isLoading &&
			!error ? (
				<Grid.EmptyView
					key="no-results"
					title="No packages found"
					description={
						extensionPreferences.packageScope === "all"
							? `Nothing matched "${normalizedQuery}".`
							: `Nothing matched "${normalizedQuery}" in the ${packageScopeLabel.toLowerCase()} filter.`
					}
					icon={Icon.Package}
				/>
			) : null}

			{sections.length > 0
				? sections.map((section) => (
						<Grid.Section
							key={section.key}
							title={section.title}
							subtitle={section.subtitle}
							columns={section.columns}
							aspectRatio={1}
						>
							{section.items.map((pkg) => (
								<GridItem
									key={pkg.ID}
									id={pkg.Name}
									title={pkg.Name}
									subtitle={getMaintainerLabel(pkg)}
									content={{ color: getAurAccentColor(pkg) }}
									accessory={{
										icon: Icon.Circle,
										tooltip: `Votes ${pkg.NumVotes ?? 0} · Popularity ${pkg.Popularity?.toFixed(2) ?? "0.00"}`,
									}}
									detail={
										<GridItem.Detail
											markdown={`# ${pkg.Name}\n\n${pkg.Description?.trim() || "No description"}\n\n- Maintainer: ${getMaintainerLabel(pkg)}\n- Votes: ${pkg.NumVotes ?? 0}\n- Popularity: ${pkg.Popularity?.toFixed(2) ?? "0.00"}`}
										/>
									}
									actions={<AurPackageActions pkg={pkg} />}
								/>
							))}
						</Grid.Section>
					))
				: null}
		</Grid>
	);
}
