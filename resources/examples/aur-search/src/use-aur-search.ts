import { useEffect, useMemo, useState } from "react";

import {
	MAX_VISIBLE_RESULTS,
	MIN_QUERY_LENGTH,
	searchAurPackages,
	sortAurPackages,
	type AurPackage,
	type AurSortMode,
} from "./aur";

export function useAurSearch(searchText: string, sortMode: AurSortMode) {
	const [results, setResults] = useState<AurPackage[]>([]);
	const [resultCount, setResultCount] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const normalizedSearchText = searchText.trim();

		if (normalizedSearchText.length < MIN_QUERY_LENGTH) {
			setResults([]);
			setResultCount(0);
			setError(null);
			setIsLoading(false);
			return;
		}

		const controller = new AbortController();
		setResults([]);
		setResultCount(0);
		setError(null);
		setIsLoading(true);

		const timeout = setTimeout(() => {
			void searchAurPackages(normalizedSearchText, controller.signal)
				.then((payload) => {
					if (controller.signal.aborted) {
						return;
					}

					setResults(payload.results);
					setResultCount(payload.resultCount);
				})
				.catch((fetchError: unknown) => {
					if (controller.signal.aborted) {
						return;
					}

					setResults([]);
					setResultCount(0);
					setError(
						fetchError instanceof Error
							? fetchError.message
							: "Failed to search AUR",
					);
				})
				.finally(() => {
					if (!controller.signal.aborted) {
						setIsLoading(false);
					}
				});
		}, 220);

		return () => {
			controller.abort();
			clearTimeout(timeout);
		};
	}, [searchText]);

	const sortedResults = useMemo(
		() => sortAurPackages(results, sortMode),
		[results, sortMode],
	);
	const visibleResults = useMemo(
		() => sortedResults.slice(0, MAX_VISIBLE_RESULTS),
		[sortedResults],
	);

	return {
		results,
		sortedResults,
		visibleResults,
		resultCount,
		isLoading,
		error,
		setError,
	};
}
