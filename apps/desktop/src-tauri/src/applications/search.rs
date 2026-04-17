use nucleo::pattern::{CaseMatching, Normalization, Pattern};
use nucleo::{Config, Matcher, Utf32Str};
use rayon::prelude::*;
use tauri::{command, AppHandle};

use super::{
    app_entry::{AppEntry, SearchableAppEntry},
    cache::get_searchable_applications,
    error::Result,
};

const MATCH_CONFIG: Config = Config::DEFAULT;
const MAX_SEARCH_RESULTS: usize = 50;
const SCORE_EXACT_NAME: u32 = 10_000;
const SCORE_PREFIX_NAME: u32 = 5_000;
const SCORE_WORD_BOUNDARY: u32 = 3_000;
const SCORE_SUBSTRING_NAME: u32 = 500;
const SCORE_GENERIC_PREFIX: u32 = 800;
const SCORE_GENERIC_SUBSTRING: u32 = 400;
const SCORE_APP_ID_SUBSTRING: u32 = 350;
const SCORE_KEYWORD_PREFIX: u32 = 300;
const SCORE_KEYWORD_SUBSTRING: u32 = 150;
const SCORE_COMMENT_SUBSTRING: u32 = 50;
const MAX_FUZZY_SCORE: u32 = 120;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum MatchTier {
    ExactName,
    PrefixName,
    WordBoundary,
    SubstringName,
    GenericPrefix,
    GenericSubstring,
    AppIdSubstring,
    KeywordPrefix,
    KeywordSubstring,
    CommentSubstring,
    Fuzzy,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct AppSearchRank {
    tier: MatchTier,
    score: u32,
    name_len: usize,
}

#[derive(Debug)]
struct RankedApplication<'a> {
    application: &'a SearchableAppEntry,
    rank: AppSearchRank,
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

fn token_prefix_match(haystack: &str, parts: &[&str]) -> bool {
    all_parts_match(parts, |part| {
        split_tokens(haystack).any(|token| token.starts_with(part))
    })
}

fn score_match(text: &str, normalized_query: &str) -> Option<(MatchTier, u32)> {
    if text.is_empty() {
        return None;
    }

    if text == normalized_query {
        return Some((MatchTier::ExactName, SCORE_EXACT_NAME));
    }

    if text.starts_with(normalized_query) {
        return Some((MatchTier::PrefixName, SCORE_PREFIX_NAME));
    }

    let parts = query_parts(normalized_query);
    if token_prefix_match(text, &parts) {
        return Some((MatchTier::WordBoundary, SCORE_WORD_BOUNDARY));
    }

    text.contains(normalized_query)
        .then_some((MatchTier::SubstringName, SCORE_SUBSTRING_NAME))
}

fn bounded_fuzzy_score(pattern: &Pattern, value: &str) -> Option<u32> {
    let mut matcher = Matcher::new(MATCH_CONFIG);
    let mut scratch = Vec::new();
    let score = pattern.score(Utf32Str::new(value, &mut scratch), &mut matcher)?;
    Some(score.min(MAX_FUZZY_SCORE))
}

fn rank_application(
    application: &SearchableAppEntry,
    normalized_query: &str,
    fuzzy_pattern: &Pattern,
) -> Option<AppSearchRank> {
    let name = application.app.name.trim().to_lowercase();
    let generic_name = application.generic_name.trim().to_lowercase();
    let app_id = application.app.app_id.trim().to_lowercase();
    let comment = application.search_comment().trim().to_lowercase();
    let keywords: Vec<String> = application
        .keywords
        .iter()
        .map(|keyword| keyword.trim().to_lowercase())
        .filter(|keyword| !keyword.is_empty())
        .collect();

    let (tier, score) = match score_match(&name, normalized_query) {
        Some(rank) => rank,
        None if !generic_name.is_empty() && generic_name.starts_with(normalized_query) => {
            (MatchTier::GenericPrefix, SCORE_GENERIC_PREFIX)
        }
        None if !generic_name.is_empty() && generic_name.contains(normalized_query) => {
            (MatchTier::GenericSubstring, SCORE_GENERIC_SUBSTRING)
        }
        None if !app_id.is_empty() && app_id.contains(normalized_query) => {
            (MatchTier::AppIdSubstring, SCORE_APP_ID_SUBSTRING)
        }
        None => {
            let mut keyword_rank = None;
            for keyword in &keywords {
                if keyword.starts_with(normalized_query) {
                    keyword_rank = Some((MatchTier::KeywordPrefix, SCORE_KEYWORD_PREFIX));
                    break;
                }
                if keyword.contains(normalized_query) {
                    keyword_rank = Some((MatchTier::KeywordSubstring, SCORE_KEYWORD_SUBSTRING));
                    break;
                }
            }

            match keyword_rank {
                Some(rank) => rank,
                None if !comment.is_empty() && comment.contains(normalized_query) => {
                    (MatchTier::CommentSubstring, SCORE_COMMENT_SUBSTRING)
                }
                None => (
                    MatchTier::Fuzzy,
                    bounded_fuzzy_score(fuzzy_pattern, &application.app.name)?,
                ),
            }
        }
    };

    Some(AppSearchRank {
        tier,
        score,
        name_len: application.app.name.chars().count(),
    })
}

fn rank_searchable_applications(
    applications: &[SearchableAppEntry],
    query: &str,
) -> Vec<SearchableAppEntry> {
    let normalized_query = query.trim().to_lowercase();
    if normalized_query.is_empty() {
        return applications.to_vec();
    }

    let fuzzy_pattern = Pattern::parse(
        &normalized_query,
        CaseMatching::Ignore,
        Normalization::Smart,
    );

    let mut matches: Vec<RankedApplication<'_>> = applications
        .par_iter()
        .filter_map(|application| {
            rank_application(application, &normalized_query, &fuzzy_pattern)
                .map(|rank| RankedApplication { application, rank })
        })
        .collect();

    matches.par_sort_unstable_by(|left, right| {
        left.rank
            .tier
            .cmp(&right.rank.tier)
            .then_with(|| right.rank.score.cmp(&left.rank.score))
            .then_with(|| left.rank.name_len.cmp(&right.rank.name_len))
            .then_with(|| left.application.app.name.cmp(&right.application.app.name))
            .then_with(|| {
                left.application
                    .app
                    .app_id
                    .cmp(&right.application.app.app_id)
            })
    });

    matches
        .into_iter()
        .take(MAX_SEARCH_RESULTS)
        .map(|entry| entry.application.clone())
        .collect()
}

#[command]
pub fn search_applications(app: AppHandle, query: String) -> Result<Vec<AppEntry>> {
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return Ok(Vec::new());
    }

    let applications = get_searchable_applications(app)?;
    Ok(
        rank_searchable_applications(&applications, normalized_query)
            .into_iter()
            .map(|entry| entry.into_public_entry())
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn app(
        app_id: &str,
        name: &str,
        description: &str,
        generic_name: &str,
        keywords: &[&str],
        comment: &str,
    ) -> SearchableAppEntry {
        SearchableAppEntry {
            app: AppEntry {
                app_id: app_id.to_string(),
                name: name.to_string(),
                description: description.to_string(),
                exec_path: String::new(),
                icon: String::new(),
                desktop_file_path: String::new(),
            },
            generic_name: generic_name.to_string(),
            keywords: keywords.iter().map(|keyword| keyword.to_string()).collect(),
            comment: comment.to_string(),
        }
    }

    fn ids(results: &[SearchableAppEntry]) -> Vec<String> {
        results
            .iter()
            .map(|entry| entry.app.app_id.clone())
            .collect::<Vec<_>>()
    }

    #[test]
    fn exact_name_outranks_other_matches() {
        let apps = vec![
            app("code", "Code", "Editor", "", &[], ""),
            app("code-editor", "Code Editor", "Editor", "", &[], ""),
        ];

        let ranked = rank_searchable_applications(&apps, "Code");
        assert_eq!(ids(&ranked), vec!["code", "code-editor"]);
    }

    #[test]
    fn prefix_name_outranks_substring_and_fuzzy() {
        let apps = vec![
            app("code", "Code", "Editor", "", &[], ""),
            app("xcode", "XCode", "Editor", "", &[], ""),
            app("codec", "Codec", "Media", "", &[], ""),
        ];

        let ranked = rank_searchable_applications(&apps, "cod");
        assert_eq!(ids(&ranked), vec!["code", "codec", "xcode"]);
    }

    #[test]
    fn token_prefix_matches_multi_word_queries() {
        let apps = vec![
            app("code-editor", "Code Editor", "Editor", "", &[], ""),
            app("coding-tools", "Coding Tools", "Tools", "", &[], ""),
        ];

        let ranked = rank_searchable_applications(&apps, "code ed");
        assert_eq!(ids(&ranked), vec!["code-editor"]);
    }

    #[test]
    fn generic_name_match_works() {
        let apps = vec![
            app(
                "org.gnome.TextEditor",
                "Text Editor",
                "launch",
                "Code Editor",
                &[],
                "",
            ),
            app("viewer", "Viewer", "launch", "", &[], ""),
        ];

        let ranked = rank_searchable_applications(&apps, "code");
        assert_eq!(ids(&ranked), vec!["org.gnome.TextEditor"]);
    }

    #[test]
    fn desktop_id_match_works() {
        let apps = vec![
            app("org.gnome.Terminal", "Terminal", "launch", "", &[], ""),
            app("browser", "Browser", "launch", "", &[], ""),
        ];

        let ranked = rank_searchable_applications(&apps, "gnome");
        assert_eq!(ids(&ranked), vec!["org.gnome.Terminal"]);
    }

    #[test]
    fn keyword_match_works() {
        let apps = vec![
            app(
                "devtools",
                "Workbench",
                "launch",
                "",
                &["development", "coding"],
                "",
            ),
            app("notes", "Notes", "launch", "", &[], ""),
        ];

        let ranked = rank_searchable_applications(&apps, "dev");
        assert_eq!(ids(&ranked), vec!["devtools"]);
    }

    #[test]
    fn comment_match_ranks_below_name_generic_id_and_keywords() {
        let apps = vec![
            app(
                "comment-match",
                "Viewer",
                "launch",
                "",
                &[],
                "best browser for docs",
            ),
            app("keyword-match", "Workbench", "launch", "", &["browser"], ""),
        ];

        let ranked = rank_searchable_applications(&apps, "browser");
        assert_eq!(ids(&ranked), vec!["keyword-match", "comment-match"]);
    }

    #[test]
    fn fuzzy_match_only_applies_after_stronger_tiers() {
        let apps = vec![
            app("calculator", "Calculator", "launch", "", &[], ""),
            app("calendar", "Calendar", "launch", "", &[], ""),
        ];

        let ranked = rank_searchable_applications(&apps, "calclator");
        assert_eq!(ids(&ranked)[0], "calculator");
    }

    #[test]
    fn empty_query_returns_original_order() {
        let apps = vec![
            app("first", "First", "launch", "", &[], ""),
            app("second", "Second", "launch", "", &[], ""),
        ];

        let ranked = rank_searchable_applications(&apps, "");
        assert_eq!(ids(&ranked), vec!["first", "second"]);
    }
}
