mod bootstrap;
#[cfg(target_os = "linux")]
mod config;
#[cfg(target_os = "linux")]
mod runner;
#[cfg(target_os = "linux")]
mod types;

use tauri::AppHandle;

use crate::file_search::types::{PaginatedSearchMetadata, PaginatedSearchResponse, SearchRequest};

pub use bootstrap::initialize;

#[cfg(target_os = "linux")]
use std::path::PathBuf;
#[cfg(target_os = "linux")]
use std::time::Duration;

#[cfg(target_os = "linux")]
use crate::file_search::indexer::helper::get_file_metadata;
#[cfg(target_os = "linux")]
use crate::file_search::types::SearchResult;

#[cfg(target_os = "linux")]
use self::types::{DSearchSearchHit, DSearchSearchResponse};

#[cfg(target_os = "linux")]
const SEARCH_TIMEOUT: Duration = Duration::from_millis(1500);
#[cfg(target_os = "linux")]
pub const DSEARCH_INSTALL_URL: &str = "https://github.com/AvengeMedia/danksearch";

#[cfg(target_os = "linux")]
pub fn is_available() -> bool {
    runner::resolve_binary().is_some()
}

#[cfg(not(target_os = "linux"))]
pub fn is_available() -> bool {
    false
}

#[cfg(target_os = "linux")]
pub async fn search_files(
    app: &AppHandle,
    request: &SearchRequest,
) -> Option<PaginatedSearchResponse> {
    let paths = match config::ensure_config(app) {
        Ok(paths) => paths,
        Err(error) => {
            runner::throttled_warn(
                "dsearch-config-search",
                format!("failed to prepare dsearch config: {error}"),
            );
            return None;
        }
    };
    let Some(binary) = runner::resolve_binary() else {
        return None;
    };

    let limit = request
        .page
        .saturating_mul(request.per_page)
        .max(request.per_page);
    let args = vec![
        "-c".to_string(),
        paths.config_path.display().to_string(),
        "search".to_string(),
        request.query.trim().to_string(),
        "--json".to_string(),
        "--limit".to_string(),
        limit.to_string(),
    ];

    let response =
        match runner::run_json_command::<DSearchSearchResponse>(&binary, &args, SEARCH_TIMEOUT)
            .await
        {
            Ok(response) => response,
            Err(error) => {
                runner::throttled_warn(
                    "dsearch-search",
                    format!("dsearch search failed, falling back to native file search: {error}"),
                );
                return None;
            }
        };

    Some(map_search_response(response, request))
}

#[cfg(not(target_os = "linux"))]
pub async fn search_files(
    _app: &AppHandle,
    _request: &SearchRequest,
) -> Option<PaginatedSearchResponse> {
    None
}

#[cfg(target_os = "linux")]
fn map_search_response(
    response: DSearchSearchResponse,
    request: &SearchRequest,
) -> PaginatedSearchResponse {
    let filtered_hits = response
        .hits
        .into_iter()
        .filter_map(map_hit_to_result)
        .collect::<Vec<_>>();

    let start_index = (request.page - 1) * request.per_page;
    let results = filtered_hits
        .into_iter()
        .skip(start_index)
        .take(request.per_page)
        .collect::<Vec<_>>();
    let total_results = response.total as usize;
    let total_pages = ((total_results as f64) / (request.per_page as f64)).ceil() as usize;
    let total_pages = total_pages.max(1);

    PaginatedSearchResponse {
        results,
        metadata: PaginatedSearchMetadata {
            total_results,
            page: request.page,
            per_page: request.per_page,
            total_pages,
            has_next_page: request.page < total_pages,
            has_previous_page: request.page > 1,
        },
    }
}

#[cfg(target_os = "linux")]
fn map_hit_to_result(hit: DSearchSearchHit) -> Option<SearchResult> {
    let path = PathBuf::from(hit.id);
    if !path.is_absolute() || !path.exists() || !path.is_file() {
        return None;
    }

    let entry = get_file_metadata(&path).ok()?;
    Some(SearchResult {
        entry,
        score: public_score(hit.score),
    })
}

#[cfg(target_os = "linux")]
fn public_score(score: f64) -> u16 {
    if !score.is_finite() || score.is_sign_negative() {
        return 0;
    }

    let scaled = (score * 1000.0).round();
    scaled.min(u16::MAX as f64) as u16
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn converts_search_scores_to_public_range() {
        assert_eq!(public_score(1.234), 1234);
        assert_eq!(public_score(-1.0), 0);
    }

    #[test]
    fn maps_search_results_and_skips_stale_hits() {
        let root =
            std::env::temp_dir().join(format!("beam-dsearch-map-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();

        let live_file = root.join("notes.txt");
        fs::write(&live_file, "beam").unwrap();

        let response = DSearchSearchResponse {
            total: 2,
            hits: vec![
                DSearchSearchHit {
                    id: live_file.display().to_string(),
                    score: 2.0,
                },
                DSearchSearchHit {
                    id: root.join("missing.txt").display().to_string(),
                    score: 5.0,
                },
            ],
        };
        let request = SearchRequest {
            query: "notes".to_string(),
            page: 1,
            per_page: 20,
        };

        let mapped = map_search_response(response, &request);

        assert_eq!(mapped.metadata.total_results, 2);
        assert_eq!(mapped.results.len(), 1);
        assert_eq!(mapped.results[0].entry.name, "notes.txt");

        let _ = fs::remove_dir_all(&root);
    }
}
