pub mod error;

use std::path::Path;

use nucleo::pattern::{CaseMatching, Normalization, Pattern};
use nucleo::{Config, Matcher, Utf32Str};
use rayon::prelude::*;

use super::types::{FileEntry, FileIndex, SearchResult};
use crate::file_search::config::CONFIG as FILE_SEARCH_CONFIG;
use error::{FileSearchError, Result};

const MATCH_CONFIG: Config = Config::DEFAULT;
const SHORT_ALPHA_FUZZY_QUERY_MAX_LEN: usize = 4;

#[derive(Debug, Clone, Copy)]
struct MatchRank {
    tier: u8,
    score: u32,
    name_len: usize,
    path_len: usize,
}

#[derive(Debug)]
struct RankedEntry<'a> {
    entry: &'a FileEntry,
    rank: MatchRank,
}

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
            per_page: FILE_SEARCH_CONFIG.default_results_per_page,
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

fn file_stem(name: &str) -> &str {
    Path::new(name)
        .file_stem()
        .and_then(|stem| stem.to_str())
        .filter(|stem| !stem.is_empty())
        .unwrap_or(name)
}

fn split_tokens(value: &str) -> impl Iterator<Item = &str> {
    value
        .split(|ch: char| !ch.is_alphanumeric())
        .filter(|token| !token.is_empty())
}

fn query_parts(query: &str) -> Vec<&str> {
    query
        .split_whitespace()
        .filter(|part| !part.is_empty())
        .collect()
}

fn all_parts_match(parts: &[&str], mut predicate: impl FnMut(&str) -> bool) -> bool {
    !parts.is_empty() && parts.iter().copied().all(&mut predicate)
}

fn token_exact_match(haystack: &str, parts: &[&str]) -> bool {
    all_parts_match(parts, |part| {
        split_tokens(haystack).any(|token| token == part)
    })
}

fn token_prefix_match(haystack: &str, parts: &[&str]) -> bool {
    all_parts_match(parts, |part| {
        split_tokens(haystack).any(|token| token.starts_with(part))
    })
}

fn segment_exact_match(haystack: &str, parts: &[&str]) -> bool {
    all_parts_match(parts, |part| {
        haystack
            .split('/')
            .filter(|segment| !segment.is_empty())
            .any(|segment| segment == part)
    })
}

fn segment_prefix_match(haystack: &str, parts: &[&str]) -> bool {
    all_parts_match(parts, |part| {
        haystack
            .split('/')
            .filter(|segment| !segment.is_empty())
            .any(|segment| segment.starts_with(part))
    })
}

fn segment_substring_position(haystack: &str, query: &str) -> Option<usize> {
    haystack
        .split('/')
        .filter(|segment| !segment.is_empty())
        .filter_map(|segment| segment.find(query))
        .min()
}

fn closeness_bonus(haystack_len: usize, needle_len: usize) -> u32 {
    350u32.saturating_sub(haystack_len.saturating_sub(needle_len) as u32)
}

fn position_bonus(position: usize) -> u32 {
    350u32.saturating_sub(position as u32 * 10)
}

fn build_rank(tier: u8, score: u32, entry: &FileEntry) -> MatchRank {
    MatchRank {
        tier,
        score: score.min(999),
        name_len: entry.name.chars().count(),
        path_len: entry.path.chars().count(),
    }
}

fn public_score(rank: MatchRank) -> u16 {
    ((rank.tier as u32) * 1000 + rank.score.min(999)).min(u16::MAX as u32) as u16
}

fn allows_fuzzy_fallback(query: &str) -> bool {
    let query_len = query.chars().count();
    query_len <= SHORT_ALPHA_FUZZY_QUERY_MAX_LEN
        && query_len > 0
        && query.chars().all(|ch| ch.is_ascii_alphabetic())
}

fn rank_entry(
    entry: &FileEntry,
    query: &str,
    query_parts: &[&str],
    fuzzy: Option<&Pattern>,
) -> Option<MatchRank> {
    let normalized_name = entry.name.to_lowercase();
    let normalized_stem = file_stem(&entry.name).to_lowercase();
    let normalized_path = entry.path.to_lowercase();
    let query_len = query.chars().count();

    if normalized_name == query {
        return Some(build_rank(12, 999, entry));
    }

    if normalized_stem == query {
        return Some(build_rank(11, 999, entry));
    }

    if token_exact_match(&normalized_name, query_parts)
        || token_exact_match(&normalized_stem, query_parts)
    {
        let score = closeness_bonus(normalized_stem.chars().count(), query_len);
        return Some(build_rank(10, score, entry));
    }

    if normalized_name.starts_with(query) {
        let score = closeness_bonus(normalized_name.chars().count(), query_len);
        return Some(build_rank(9, score, entry));
    }

    if normalized_stem.starts_with(query) {
        let score = closeness_bonus(normalized_stem.chars().count(), query_len);
        return Some(build_rank(8, score, entry));
    }

    if token_prefix_match(&normalized_name, query_parts)
        || token_prefix_match(&normalized_stem, query_parts)
    {
        let score = closeness_bonus(normalized_stem.chars().count(), query_len);
        return Some(build_rank(7, score, entry));
    }

    if let Some(position) = normalized_name.find(query) {
        let score =
            position_bonus(position) + closeness_bonus(normalized_name.chars().count(), query_len);
        return Some(build_rank(6, score, entry));
    }

    if let Some(position) = normalized_stem.find(query) {
        let score =
            position_bonus(position) + closeness_bonus(normalized_stem.chars().count(), query_len);
        return Some(build_rank(5, score, entry));
    }

    if segment_exact_match(&normalized_path, query_parts) {
        return Some(build_rank(4, 800, entry));
    }

    if segment_prefix_match(&normalized_path, query_parts) {
        return Some(build_rank(3, 700, entry));
    }

    if let Some(position) = segment_substring_position(&normalized_path, query) {
        let score = position_bonus(position);
        return Some(build_rank(2, score, entry));
    }

    let pattern = fuzzy?;
    let mut matcher = Matcher::new(MATCH_CONFIG);
    let mut scratch = Vec::new();

    let name_score = pattern.score(Utf32Str::new(&entry.name, &mut scratch), &mut matcher);
    scratch.clear();
    let path_score = pattern.score(Utf32Str::new(&entry.path, &mut scratch), &mut matcher);

    match (name_score, path_score) {
        (Some(score), _) => Some(build_rank(1, score, entry)),
        (None, Some(score)) => Some(build_rank(0, score, entry)),
        (None, None) => None,
    }
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

    if options.per_page == 0 || options.per_page > FILE_SEARCH_CONFIG.max_results_per_page {
        return Err(FileSearchError::InvalidPerPage {
            provided: options.per_page,
            max: FILE_SEARCH_CONFIG.max_results_per_page,
        });
    }

    let normalized_query = normalized_query.to_lowercase();
    let query_parts = query_parts(&normalized_query);
    let fuzzy_pattern = allows_fuzzy_fallback(&normalized_query).then(|| {
        Pattern::parse(
            &normalized_query,
            CaseMatching::Ignore,
            Normalization::Smart,
        )
    });

    let mut scored_entries: Vec<RankedEntry<'_>> = index
        .entries
        .par_iter()
        .filter_map(|(_path, entry)| {
            rank_entry(
                entry,
                &normalized_query,
                &query_parts,
                fuzzy_pattern.as_ref(),
            )
            .map(|rank| RankedEntry { entry, rank })
        })
        .collect();

    scored_entries.par_sort_unstable_by(|a, b| {
        b.rank
            .tier
            .cmp(&a.rank.tier)
            .then_with(|| b.rank.score.cmp(&a.rank.score))
            .then_with(|| a.rank.name_len.cmp(&b.rank.name_len))
            .then_with(|| a.rank.path_len.cmp(&b.rank.path_len))
            .then_with(|| a.entry.name.cmp(&b.entry.name))
    });

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
            .map(|ranked| SearchResult {
                entry: ranked.entry.clone(),
                score: public_score(ranked.rank),
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
