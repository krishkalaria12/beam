use chrono::{SecondsFormat, Utc};
use std::collections::HashSet;

use crate::config::config;

use super::model::TriggerMode;
use super::{
    error::{Result, SnippetError},
    model::{Snippet, SnippetContentType, SnippetRow},
};

pub fn normalize_required_text(value: &str, field: &str) -> Result<String> {
    let val_trim = value.trim();

    if val_trim.is_empty() {
        return Err(SnippetError::FieldNotFoundError(field.to_string()));
    }

    Ok(val_trim.to_string())
}

pub fn normalize_trigger_input(value: &str) -> Result<String> {
    let normalised_val = normalize_required_text(value, "trigger")?;

    let trimmed = normalised_val.trim();

    if trimmed.len() > 128 {
        return Err(SnippetError::ValidationError(format!(
            "Trigger is too long (Max {} chars)",
            128
        )));
    }

    Ok(trimmed.to_string())
}

pub fn normalize_trigger_for_match(trigger: &str, case_sensitive: bool) -> Result<String> {
    let normalised_val = normalize_required_text(trigger, "trigger")?;

    if !case_sensitive {
        return Ok(normalised_val.to_lowercase());
    }

    Ok(normalised_val)
}

pub fn parse_trigger_mode(value: &str) -> TriggerMode {
    let normalized = value.trim().to_lowercase();
    match normalized.as_str() {
        "instant" => TriggerMode::Instant,
        _ => TriggerMode::Delimiter,
    }
}

pub fn trigger_mode_to_db_value(mode: &TriggerMode) -> &'static str {
    match mode {
        TriggerMode::Delimiter => "delimiter",
        TriggerMode::Instant => "instant",
    }
}

pub fn normalize_cooldown_ms(value: Option<u64>) -> u64 {
    value.unwrap_or(config().SNIPPETS_DEFAULT_COOLDOWN_MS)
}

pub fn normalize_max_buffer_len(value: Option<usize>) -> usize {
    value
        .unwrap_or(config().SNIPPETS_DEFAULT_MAX_BUFFER_LEN)
        .clamp(
            config().SNIPPETS_MIN_MAX_BUFFER_LEN,
            config().SNIPPETS_MAX_MAX_BUFFER_LEN,
        )
}

pub fn now_utc_timestamp() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub fn content_type_to_db_value(content_type: &SnippetContentType) -> &'static str {
    match content_type {
        SnippetContentType::Text => "text",
        SnippetContentType::Markdown => "markdown",
        SnippetContentType::Code => "code",
    }
}

pub fn parse_content_type(value: &str) -> Result<SnippetContentType> {
    match value.trim().to_lowercase().as_str() {
        "text" => Ok(SnippetContentType::Text),
        "markdown" => Ok(SnippetContentType::Markdown),
        "code" => Ok(SnippetContentType::Code),
        _ => Err(SnippetError::CannotConvertContentType),
    }
}

pub fn map_row_to_snippet(row: SnippetRow, tags: Vec<String>) -> Result<Snippet> {
    Ok(Snippet {
        id: row.id,
        name: row.name,
        trigger: row.trigger,
        template: row.template,
        content_type: parse_content_type(&row.content_type)?,
        word_count: row.word_count,
        copied_count: row.copied_count,
        tags,
        enabled: row.enabled == 1,
        case_sensitive: row.case_sensitive == 1,
        word_boundary: row.word_boundary == 1,
        use_count: row.use_count,
        last_used_at: row.last_used_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

pub fn normalize_tags(tags: Option<Vec<String>>) -> Vec<String> {
    let Some(tags) = tags else {
        return Vec::new();
    };

    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for raw in tags {
        let normalized = raw.trim();
        if normalized.is_empty() {
            continue;
        }
        let key = normalized.to_lowercase();
        if seen.insert(key) {
            result.push(normalized.to_string());
        }
    }
    result
}

pub fn count_words(text: &str) -> i64 {
    text.split_whitespace().count() as i64
}

pub fn map_write_error(error: sqlx::Error) -> SnippetError {
    let message = error.to_string();
    let lowered = message.to_lowercase();
    if lowered.contains("idx_snippets_trigger_norm") || lowered.contains("unique") {
        return SnippetError::ValidationError("trigger already exists".to_string());
    }

    SnippetError::Database(message)
}
