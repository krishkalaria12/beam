pub mod error;

use nucleo::pattern::{CaseMatching, Normalization, Pattern};
use nucleo::{Config, Matcher, Utf32Str};
use rayon::prelude::*;

use super::types::{FileEntry, FileIndex, SearchResult};
use crate::config::config;
use error::{FileSearchError, Result};

const MATCH_CONFIG: Config = Config::DEFAULT;

// Search options for file search
#[derive(Debug, Clone)]
pub struct SearchOptions {
    pub page: usize,
    pub per_page: usize,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: config().FILE_SEARCH_DEFAULT_RESULTS_PER_PAGE,
        }
    }
}

// Metadata for paginated search results
#[derive(Debug, Clone)]
pub struct SearchMetadata {
    pub total_results: usize,
    pub page: usize,
    pub per_page: usize,
    pub total_pages: usize,
    pub has_next_page: bool,
    pub has_previous_page: bool,
}

// Complete search response with results and metadata
#[derive(Debug, Clone)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub metadata: SearchMetadata,
}

// Performs a fuzzy search on the file index with pagination support
pub fn search(query: &str, index: &FileIndex, options: SearchOptions) -> Result<SearchResponse> {
    let normalized_query = query.trim();

    if normalized_query.is_empty() {
        return Err(FileSearchError::EmptyQuery);
    }

    // Validate pagination options
    if options.page == 0 {
        return Err(FileSearchError::InvalidPageNumber {
            provided: options.page,
            reason: "Page number must be 1 or greater".to_string(),
        });
    }

    if options.per_page == 0 || options.per_page > config().FILE_SEARCH_MAX_RESULTS_PER_PAGE {
        return Err(FileSearchError::InvalidPerPage {
            provided: options.per_page,
            max: config().FILE_SEARCH_MAX_RESULTS_PER_PAGE,
        });
    }

    // Parse pattern once for all entries
    let pattern = Pattern::parse(normalized_query, CaseMatching::Ignore, Normalization::Smart);

    // Parallel Score Calculation using nucleo pattern matching
    let mut scored_entries: Vec<(&FileEntry, u32)> = index
        .entries
        .par_iter()
        .filter_map(|(_path, entry)| {
            let mut matcher = Matcher::new(MATCH_CONFIG);
            let mut scratch = Vec::new();

            // Score the filename
            let name_score = pattern.score(Utf32Str::new(&entry.name, &mut scratch), &mut matcher);

            // Score the full path as secondary criterion (with lower weight)
            scratch.clear();
            let path_score = pattern.score(Utf32Str::new(&entry.path, &mut scratch), &mut matcher);

            // Combine scores: name match is weighted higher
            let combined_score = match (name_score, path_score) {
                (Some(name), Some(path)) => Some(name * 4 + path),
                (Some(name), None) => Some(name * 4),
                (None, Some(path)) => Some(path),
                (None, None) => None,
            }?;

            Some((entry, combined_score))
        })
        .collect();

    // Sort by score (highest first), then by name for stable ordering
    scored_entries.par_sort_unstable_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.name.cmp(&b.0.name)));

    let total_results = scored_entries.len();
    let total_pages = ((total_results as f64) / (options.per_page as f64)).ceil() as usize;
    let total_pages = total_pages.max(1);

    // Apply pagination
    let start_index = (options.page - 1) * options.per_page;
    let end_index = (start_index + options.per_page).min(total_results);

    let paginated_results: Vec<SearchResult> = if start_index < total_results {
        scored_entries
            .into_iter()
            .skip(start_index)
            .take(end_index - start_index)
            .map(|(entry, score)| SearchResult {
                entry: entry.clone(),
                score: score as u16,
            })
            .collect()
    } else {
        Vec::new()
    };

    let metadata = SearchMetadata {
        total_results,
        page: options.page,
        per_page: options.per_page,
        total_pages,
        has_next_page: options.page < total_pages,
        has_previous_page: options.page > 1,
    };

    Ok(SearchResponse {
        results: paginated_results,
        metadata,
    })
}
