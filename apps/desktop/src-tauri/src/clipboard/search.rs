use nucleo::pattern::{CaseMatching, Normalization, Pattern};
use nucleo::{Config, Matcher, Utf32Str};
use rayon::prelude::*;
use tauri::AppHandle;

use super::error::Result;
use super::history::{get_history, ClipboardContentType, ClipboardHistoryEntry};

use crate::clipboard::config::CONFIG as CLIPBOARD_CONFIG;

const MATCH_CONFIG: Config = Config::DEFAULT;

pub async fn search_history(app: &AppHandle, query: &str) -> Result<Vec<ClipboardHistoryEntry>> {
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return Ok(Vec::new());
    }

    let history = get_history(app).await?;
    Ok(fuzzy_match_history_entries(
        history,
        normalized_query,
        CLIPBOARD_CONFIG.search_max_results,
    ))
}

fn fuzzy_match_history_entries(
    history: Vec<ClipboardHistoryEntry>,
    query: &str,
    limit: usize,
) -> Vec<ClipboardHistoryEntry> {
    let pattern = Pattern::parse(query, CaseMatching::Ignore, Normalization::Smart);

    let mut matches: Vec<(u32, ClipboardHistoryEntry)> = history
        .into_par_iter()
        .filter_map(|entry| {
            let mut matcher = Matcher::new(MATCH_CONFIG);
            let mut scratch = Vec::new();

            let value_excerpt =
                excerpt_chars(&entry.value, CLIPBOARD_CONFIG.search_max_entry_chars);
            let value_score =
                pattern.score(Utf32Str::new(value_excerpt, &mut scratch), &mut matcher);

            scratch.clear();
            let content_type_label = content_type_label(&entry.content_type);
            let content_type_score = pattern.score(
                Utf32Str::new(content_type_label, &mut scratch),
                &mut matcher,
            );

            let value_weight = CLIPBOARD_CONFIG.search_value_weight;
            let content_type_weight = CLIPBOARD_CONFIG.search_content_type_weight;

            let combined_score = match (value_score, content_type_score) {
                (Some(value), Some(content_type)) => Some(
                    value
                        .saturating_mul(value_weight)
                        .saturating_add(content_type.saturating_mul(content_type_weight)),
                ),
                (Some(value), None) => Some(value.saturating_mul(value_weight)),
                (None, Some(content_type)) => {
                    Some(content_type.saturating_mul(content_type_weight))
                }
                (None, None) => None,
            }?;

            Some((combined_score, entry))
        })
        .collect();

    matches.par_sort_unstable_by(|(first_score, first_entry), (second_score, second_entry)| {
        second_score
            .cmp(first_score)
            .then_with(|| second_entry.copied_at.cmp(&first_entry.copied_at))
    });

    matches.truncate(limit);
    matches.into_iter().map(|(_, entry)| entry).collect()
}

fn excerpt_chars(value: &str, max_chars: usize) -> &str {
    if value.chars().count() <= max_chars {
        return value;
    }

    let end_index = value
        .char_indices()
        .nth(max_chars)
        .map(|(index, _)| index)
        .unwrap_or(value.len());

    &value[..end_index]
}

fn content_type_label(content_type: &ClipboardContentType) -> &'static str {
    match content_type {
        ClipboardContentType::Text => "text",
        ClipboardContentType::Link => "link",
        ClipboardContentType::Image => "image",
    }
}
