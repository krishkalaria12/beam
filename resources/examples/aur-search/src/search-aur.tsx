import {
	Action,
	ActionPanel,
	Icon,
	List,
	open,
	showToast,
	updateCommandMetadata,
} from "@beam-launcher/api";
import { useEffect, useState } from "react";

import {
	AUR_LOADING_ICON,
	EXAMPLE_QUERIES,
	MIN_QUERY_LENGTH,
	filterAurPackagesByScope,
	getAurPackageScopeLabel,
	getAurPreferences,
	getAurSearchUrl,
	type AurSortMode,
} from "./aur";
import {
	AurListResultDetail,
	AurPackageActions,
	AurPackageSheet,
} from "./aur-parts";
import { useAurSearch } from "./use-aur-search";

const SORT_OPTIONS: Array<{ value: AurSortMode; title: string }> = [
	{ value: "relevance", title: "Relevance" },
	{ value: "popularity", title: "Popularity" },
	{ value: "votes", title: "Votes" },
	{ value: "updated", title: "Recently Updated" },
];

export default function SearchAurPackages() {
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
	const filteredResults = filterAurPackagesByScope(
		visibleResults,
		extensionPreferences.packageScope,
	);
	const packageScopeLabel = getAurPackageScopeLabel(
		extensionPreferences.packageScope,
	);
	const hasQuery = normalizedQuery.length > 0;
	const showExamples =
		extensionPreferences.showExampleQueries && normalizedQuery.length === 0;
	const showIdleHint = !hasQuery && !showExamples;
	const queryTooShort = hasQuery && normalizedQuery.length < MIN_QUERY_LENGTH;
	const showNoResults =
		hasQuery &&
		!isLoading &&
		!error &&
		filteredResults.length === 0 &&
		!queryTooShort;

	useEffect(() => {
		const subtitle = isLoading
			? `Searching ${normalizedQuery || "AUR"}`
			: error
				? "Search error"
				: hasQuery
					? extensionPreferences.packageScope === "all"
						? `${resultCount} AUR results`
						: `${filteredResults.length} ${packageScopeLabel.toLowerCase()} results`
					: "AUR search testbed";

		void updateCommandMetadata({ subtitle });
	}, [
		error,
		extensionPreferences.packageScope,
		filteredResults.length,
		hasQuery,
		isLoading,
		normalizedQuery,
		packageScopeLabel,
		resultCount,
	]);

	return (
		<List
			filtering={false}
			isShowingDetail
			navigationTitle="AUR Search"
			searchBarPlaceholder="Search AUR packages by name or description..."
			searchText={searchText}
			onSearchTextChange={(value) => {
				setSearchText(value);
				setError(null);
			}}
			searchBarAccessory={
				<List.Dropdown
					value={sortMode}
					onChange={setSortMode}
					tooltip="Sort results"
				>
					<List.Dropdown.Section key="default" title="Default">
						<List.Dropdown.Item
							key="relevance"
							value="relevance"
							title="Relevance"
						/>
					</List.Dropdown.Section>
					<List.Dropdown.Section key="metrics" title="Metrics">
						{SORT_OPTIONS.filter((option) => option.value !== "relevance").map(
							(option) => (
								<List.Dropdown.Item
									key={option.value}
									value={option.value}
									title={option.title}
								/>
							),
						)}
					</List.Dropdown.Section>
				</List.Dropdown>
			}
		>
			{isLoading && visibleResults.length === 0 ? (
				<List.EmptyView
					key="loading"
					title="Searching AUR…"
					description={`Looking up "${normalizedQuery}" through the AUR RPC index.`}
					icon={AUR_LOADING_ICON}
				/>
			) : null}

			{showExamples ? (
				<List.Section
					key="examples"
					title="Example Queries"
					subtitle="Start with common AUR lookups"
				>
					{EXAMPLE_QUERIES.map((query) => (
						<List.Item
							key={query}
							title={query}
							icon={Icon.MagnifyingGlass}
							subtitle="Example search"
							keywords={[query, "example", "preset", "aur"]}
							detail={
								<List.Item.Detail
									markdown={`# ${query}\n\nUse this preset to search the AUR RPC index from Beam.\n\n- Query: \`${query}\`\n- Source: \`aur.archlinux.org/rpc/v5/search/<query>?by=name-desc\``}
								/>
							}
							actions={
								<ActionPanel>
									<Action
										key="search-query"
										title="Search This Query"
										icon={Icon.MagnifyingGlass}
										onAction={() => setSearchText(query)}
									/>
									<Action.Push
										key="open-sheet"
										title="Open Test Sheet"
										target={
											<AurPackageSheet
												pkg={{
													ID: 0,
													Name: query,
													PackageBase: query,
													Version: "example",
													Description:
														"Preset AUR example used to exercise Beam detail navigation.",
												}}
											/>
										}
									/>
									<Action
										key="open-browser-search"
										title="Open AUR Search In Browser"
										icon={Icon.ArrowNe}
										onAction={() => open(getAurSearchUrl(query))}
									/>
								</ActionPanel>
							}
						/>
					))}
				</List.Section>
			) : null}

			{queryTooShort ? (
				<List.EmptyView
					key="too-short"
					title="Keep typing"
					description={`AUR search starts after ${MIN_QUERY_LENGTH} characters.`}
					icon={Icon.MagnifyingGlass}
				/>
			) : null}

			{error ? (
				<List.Section key="search-error" title="Search Error">
					<List.Item
						title="AUR request failed"
						subtitle={error}
						icon={Icon.Exclamationmark}
						actions={
							<ActionPanel>
								<Action
									key="open-aur-in-browser"
									title="Open AUR In Browser"
									icon={Icon.ArrowNe}
									onAction={() => open(getAurSearchUrl(normalizedQuery))}
								/>
								<Action.CopyToClipboard
									key="copy-error"
									title="Copy Error"
									content={error}
								/>
							</ActionPanel>
						}
						detail={
							<List.Item.Detail
								markdown={`# Request failed\n\n${error}\n\nThe extension uses the official AUR RPC search endpoint:\n\n\`${getAurSearchUrl(normalizedQuery)}\``}
							/>
						}
					/>
				</List.Section>
			) : null}

			{showIdleHint ? (
				<List.EmptyView
					key="idle"
					title="Search AUR"
					description={`Start typing at least ${MIN_QUERY_LENGTH} characters to search the AUR RPC index.`}
					icon={Icon.MagnifyingGlass}
				/>
			) : null}

			{filteredResults.length > 0 ? (
				<List.Section
					key="packages"
					title="Packages"
					subtitle={
						extensionPreferences.packageScope === "all"
							? `${resultCount} results · sorted by ${sortMode}`
							: `${filteredResults.length} shown · ${packageScopeLabel.toLowerCase()} · sorted by ${sortMode}`
					}
				>
					{filteredResults.map((pkg) => (
						<List.Item
							key={pkg.ID}
							id={pkg.Name}
							title={pkg.Name}
							subtitle={pkg.Description?.trim() || "No description"}
							keywords={[
								pkg.Name,
								pkg.PackageBase,
								...(pkg.Keywords ?? []),
								pkg.Maintainer ?? "orphaned",
							]}
							icon={{
								value: pkg.OutOfDate ? Icon.Exclamationmark : Icon.Package,
								tooltip: pkg.OutOfDate
									? "Package marked out of date"
									: "Package entry",
							}}
							accessories={[
								{ text: { value: `★ ${pkg.NumVotes ?? 0}` } },
								{
									text: { value: `⇡ ${pkg.Popularity?.toFixed(2) ?? "0.00"}` },
								},
								pkg.LastModified
									? { tag: { value: new Date(pkg.LastModified * 1000) } }
									: {
											tag: {
												value: pkg.Maintainer ? "Maintained" : "Orphaned",
											},
										},
							]}
							detail={<AurListResultDetail pkg={pkg} />}
							actions={<AurPackageActions pkg={pkg} />}
						/>
					))}
				</List.Section>
			) : null}

			{showNoResults ? (
				<List.EmptyView
					key="no-results"
					title="No packages matched"
					description={
						extensionPreferences.packageScope === "all"
							? `Try another query or open "${normalizedQuery}" in the browser.`
							: `No results matched the ${packageScopeLabel.toLowerCase()} filter. Try another query or change the package scope preference.`
					}
					icon={Icon.Package}
				/>
			) : null}

			{hasQuery ? (
				<List.Section key="quick-tools" title="Quick Tools">
					<List.Item
						title="Open current search in browser"
						subtitle={normalizedQuery}
						icon={Icon.ArrowNe}
						actions={
							<ActionPanel>
								<Action
									key="open-current-search"
									title="Open Search"
									icon={Icon.ArrowNe}
									onAction={() => open(getAurSearchUrl(normalizedQuery))}
								/>
								<Action
									key="show-current-query-toast"
									title="Show Query Toast"
									icon={Icon.SpeechBubble}
									onAction={() =>
										showToast({
											title: "Current AUR query",
											message: normalizedQuery,
										})
									}
								/>
							</ActionPanel>
						}
					/>
				</List.Section>
			) : null}
		</List>
	);
}
