use chrono::{SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
use tauri::{AppHandle, Wry};
use tauri_plugin_store::{Store, StoreExt};
use url::Url;

use super::error::{ClipboardError, Result};
use super::password::{decrypt_value, encrypt_value};

use crate::clipboard::config::CONFIG as CLIPBOARD_CONFIG;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "snake_case")]
pub enum ClipboardContentType {
    #[default]
    Text,
    Link,
    Image,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardHistoryEntry {
    pub value: String,
    pub copied_at: String,
    pub content_type: ClipboardContentType,
    pub character_count: usize,
    pub word_count: usize,
}

#[derive(Debug, Clone, Deserialize)]
struct StoredClipboardHistoryEntry {
    value: String,
    #[serde(default)]
    copied_at: Option<String>,
}

pub fn get_history(app: &AppHandle) -> Result<Vec<ClipboardHistoryEntry>> {
    let store = app
        .store(&CLIPBOARD_CONFIG.store_file_name)
        .map_err(|e| ClipboardError::StoreOpeningError(e.to_string()))?;

    get_decrypted_history(&store)
}

pub fn get_history_values(app: &AppHandle) -> Result<Vec<String>> {
    let history = get_history(app)?;
    Ok(history.into_iter().map(|entry| entry.value).collect())
}

pub fn save_to_history(app: &AppHandle, copy_value: String) -> Result<()> {
    let store = app
        .store(&CLIPBOARD_CONFIG.store_file_name)
        .map_err(|e| ClipboardError::StoreOpeningError(e.to_string()))?;

    let mut pinned_entry_ids = read_pinned_entry_ids(&store)?;
    let should_keep_pinned = pinned_entry_ids
        .iter()
        .any(|entry_id| pinned_entry_matches_value(entry_id, &copy_value));

    let (mut history, mut undecryptable_history) =
        get_decrypted_history_with_undecryptable(&store)?;
    history.retain(|entry| entry.value != copy_value);
    history.insert(0, build_entry(copy_value));
    dedupe_keep_order(&mut history);
    history.truncate(CLIPBOARD_CONFIG.max_history_entries);

    let encrypted_history = encrypt_history_entries(&history)?;
    let remaining_slots = CLIPBOARD_CONFIG
        .max_history_entries
        .saturating_sub(encrypted_history.len());
    undecryptable_history.truncate(remaining_slots);

    let mut serialized_history =
        Vec::with_capacity(encrypted_history.len() + undecryptable_history.len());
    for entry in encrypted_history {
        let json_entry = serde_json::to_value(entry)
            .map_err(|e| ClipboardError::SerializationError(e.to_string()))?;
        serialized_history.push(json_entry);
    }

    for entry in undecryptable_history {
        serialized_history.push(stored_history_entry_to_value(entry));
    }

    let app_json = Value::Array(serialized_history);

    store.set(CLIPBOARD_CONFIG.history_key, app_json);
    store
        .save()
        .map_err(|e| ClipboardError::StoreSaveError(e.to_string()))?;

    pinned_entry_ids.retain(|entry_id| {
        history
            .iter()
            .any(|entry| pinned_entry_matches_id(entry_id, &entry.copied_at, &entry.value))
    });

    if should_keep_pinned {
        if let Some(entry) = history.first() {
            pinned_entry_ids.push(build_pinned_entry_id(&entry.copied_at, &entry.value));
        }
    }

    dedupe_keep_order_strings(&mut pinned_entry_ids);
    save_pinned_entry_ids(&store, &pinned_entry_ids)?;

    Ok(())
}

pub fn remove_history_entry(app: &AppHandle, copied_at: String, value: String) -> Result<()> {
    let store = app
        .store(&CLIPBOARD_CONFIG.store_file_name)
        .map_err(|e| ClipboardError::StoreOpeningError(e.to_string()))?;

    let (history, undecryptable_history) = get_decrypted_history_with_undecryptable(&store)?;
    let filtered_history = history
        .into_iter()
        .filter(|entry| !(entry.copied_at == copied_at && entry.value == value))
        .collect::<Vec<_>>();

    persist_history_entries(&store, &filtered_history, undecryptable_history)?;

    let pinned_entry_id = build_pinned_entry_id(&copied_at, &value);
    let mut pinned_entry_ids = read_pinned_entry_ids(&store)?;
    pinned_entry_ids.retain(|entry_id| entry_id != &pinned_entry_id);
    save_pinned_entry_ids(&store, &pinned_entry_ids)
}

pub fn clear_history(app: &AppHandle) -> Result<()> {
    let store = app
        .store(&CLIPBOARD_CONFIG.store_file_name)
        .map_err(|e| ClipboardError::StoreOpeningError(e.to_string()))?;

    persist_history_entries(&store, &[], Vec::new())?;
    save_pinned_entry_ids(&store, &[])
}

pub fn get_pinned_entry_ids(app: &AppHandle) -> Result<Vec<String>> {
    let store = app
        .store(&CLIPBOARD_CONFIG.store_file_name)
        .map_err(|e| ClipboardError::StoreOpeningError(e.to_string()))?;

    read_pinned_entry_ids(&store)
}

pub fn set_entry_pinned(
    app: &AppHandle,
    copied_at: String,
    value: String,
    pinned: bool,
) -> Result<Vec<String>> {
    let store = app
        .store(&CLIPBOARD_CONFIG.store_file_name)
        .map_err(|e| ClipboardError::StoreOpeningError(e.to_string()))?;

    let entry_id = build_pinned_entry_id(&copied_at, &value);
    let mut entry_ids = read_pinned_entry_ids(&store)?;

    if pinned {
        if !entry_ids.iter().any(|existing| existing == &entry_id) {
            entry_ids.push(entry_id);
        }
    } else {
        entry_ids.retain(|existing| existing != &entry_id);
    }

    dedupe_keep_order_strings(&mut entry_ids);
    save_pinned_entry_ids(&store, &entry_ids)?;
    Ok(entry_ids)
}

fn get_from_history(store: &Store<Wry>) -> Option<Value> {
    store.get(&CLIPBOARD_CONFIG.history_key)
}

fn get_decrypted_history(store: &Store<Wry>) -> Result<Vec<ClipboardHistoryEntry>> {
    let (history, _) = get_decrypted_history_with_undecryptable(store)?;
    Ok(history)
}

fn get_decrypted_history_with_undecryptable(
    store: &Store<Wry>,
) -> Result<(Vec<ClipboardHistoryEntry>, Vec<StoredClipboardHistoryEntry>)> {
    let stored_history = get_stored_history(store);
    let mut history = Vec::with_capacity(stored_history.len());
    let mut undecryptable_history = Vec::new();

    for stored_entry in stored_history {
        let value = match decrypt_value(&stored_entry.value) {
            Ok(value) => value,
            Err(_) => {
                undecryptable_history.push(stored_entry);
                continue;
            }
        };
        let value = value.trim().to_string();

        if value.is_empty() {
            continue;
        }

        if value.len() > CLIPBOARD_CONFIG.max_entry_bytes {
            continue;
        }

        let copied_at = normalize_copied_at(stored_entry.copied_at);

        history.push(build_entry_with_timestamp(value, copied_at));
    }

    dedupe_keep_order(&mut history);
    history.truncate(CLIPBOARD_CONFIG.max_history_entries);

    Ok((history, undecryptable_history))
}

fn get_stored_history(store: &Store<Wry>) -> Vec<StoredClipboardHistoryEntry> {
    let Some(json_value) = get_from_history(store) else {
        return Vec::new();
    };

    match json_value {
        Value::Array(entries) => entries
            .into_iter()
            .filter_map(parse_stored_history_entry)
            .collect(),
        _ => Vec::new(),
    }
}

fn parse_stored_history_entry(value: Value) -> Option<StoredClipboardHistoryEntry> {
    match value {
        Value::String(raw_value) => Some(StoredClipboardHistoryEntry {
            value: raw_value,
            copied_at: None,
        }),
        Value::Object(object) => {
            let value = object.get("value")?.as_str()?.to_string();
            let copied_at = object
                .get("copied_at")
                .and_then(|copied_at| copied_at.as_str().map(ToString::to_string));

            Some(StoredClipboardHistoryEntry { value, copied_at })
        }
        _ => None,
    }
}

fn stored_history_entry_to_value(entry: StoredClipboardHistoryEntry) -> Value {
    match entry.copied_at {
        Some(copied_at) => json!({
            "value": entry.value,
            "copied_at": copied_at,
        }),
        None => Value::String(entry.value),
    }
}

fn read_pinned_entry_ids(store: &Store<Wry>) -> Result<Vec<String>> {
    let Some(value) = store.get(CLIPBOARD_CONFIG.pinned_entries_key) else {
        return Ok(Vec::new());
    };

    let entry_ids = serde_json::from_value::<Vec<String>>(value)
        .map_err(|e| ClipboardError::SerializationError(e.to_string()))?;
    let mut normalized = entry_ids
        .into_iter()
        .map(|entry_id| entry_id.trim().to_string())
        .filter(|entry_id| !entry_id.is_empty())
        .collect::<Vec<_>>();
    dedupe_keep_order_strings(&mut normalized);
    Ok(normalized)
}

fn save_pinned_entry_ids(store: &Store<Wry>, entry_ids: &[String]) -> Result<()> {
    let value = serde_json::to_value(entry_ids)
        .map_err(|e| ClipboardError::SerializationError(e.to_string()))?;
    store.set(CLIPBOARD_CONFIG.pinned_entries_key, value);
    store
        .save()
        .map_err(|e| ClipboardError::StoreSaveError(e.to_string()))?;
    Ok(())
}

fn persist_history_entries(
    store: &Store<Wry>,
    history: &[ClipboardHistoryEntry],
    mut undecryptable_history: Vec<StoredClipboardHistoryEntry>,
) -> Result<()> {
    let encrypted_history = encrypt_history_entries(history)?;
    let remaining_slots = CLIPBOARD_CONFIG
        .max_history_entries
        .saturating_sub(encrypted_history.len());
    undecryptable_history.truncate(remaining_slots);

    let mut serialized_history =
        Vec::with_capacity(encrypted_history.len() + undecryptable_history.len());
    for entry in encrypted_history {
        let json_entry = serde_json::to_value(entry)
            .map_err(|e| ClipboardError::SerializationError(e.to_string()))?;
        serialized_history.push(json_entry);
    }

    for entry in undecryptable_history {
        serialized_history.push(stored_history_entry_to_value(entry));
    }

    store.set(
        CLIPBOARD_CONFIG.history_key,
        Value::Array(serialized_history),
    );
    store
        .save()
        .map_err(|e| ClipboardError::StoreSaveError(e.to_string()))?;

    Ok(())
}

fn encrypt_history_entries(
    history: &[ClipboardHistoryEntry],
) -> Result<Vec<ClipboardHistoryEntry>> {
    history
        .iter()
        .map(|entry| {
            let mut encrypted_entry = entry.clone();
            encrypted_entry.value = encrypt_value(&entry.value)?;
            Ok(encrypted_entry)
        })
        .collect()
}

fn dedupe_keep_order(values: &mut Vec<ClipboardHistoryEntry>) {
    let mut seen = HashSet::new();
    values.retain(|entry| seen.insert(entry.value.clone()));
}

fn dedupe_keep_order_strings(values: &mut Vec<String>) {
    let mut seen = HashSet::new();
    values.retain(|entry| seen.insert(entry.clone()));
}

fn build_pinned_entry_id(copied_at: &str, value: &str) -> String {
    format!("{}::{}", copied_at.trim(), value)
}

fn pinned_entry_matches_id(entry_id: &str, copied_at: &str, value: &str) -> bool {
    entry_id == build_pinned_entry_id(copied_at, value)
}

fn pinned_entry_matches_value(entry_id: &str, value: &str) -> bool {
    entry_id
        .split_once("::")
        .map(|(_, stored_value)| stored_value == value)
        .unwrap_or(false)
}

fn build_entry(value: String) -> ClipboardHistoryEntry {
    build_entry_with_timestamp(value, now_rfc3339())
}

fn build_entry_with_timestamp(value: String, copied_at: String) -> ClipboardHistoryEntry {
    let content_type = detect_content_type(&value);
    let (character_count, word_count) = count_words_and_characters(&value, &content_type);

    ClipboardHistoryEntry {
        value,
        copied_at,
        content_type,
        character_count,
        word_count,
    }
}

fn detect_content_type(value: &str) -> ClipboardContentType {
    if value.starts_with("data:image/") {
        return ClipboardContentType::Image;
    }

    if looks_like_link(value) {
        return ClipboardContentType::Link;
    }

    ClipboardContentType::Text
}

fn looks_like_link(value: &str) -> bool {
    if value.contains(char::is_whitespace) {
        return false;
    }

    if let Ok(url) = Url::parse(value) {
        return matches!(url.scheme(), "http" | "https" | "ftp" | "mailto");
    }

    if value.starts_with("www.") {
        return Url::parse(&format!("https://{value}")).is_ok();
    }

    false
}

fn count_words_and_characters(value: &str, content_type: &ClipboardContentType) -> (usize, usize) {
    if matches!(content_type, ClipboardContentType::Image) {
        return (0, 0);
    }

    let character_count = value.chars().count();
    let word_count = value.split_whitespace().count();

    (character_count, word_count)
}

fn normalize_copied_at(copied_at: Option<String>) -> String {
    copied_at
        .and_then(normalized_optional_text)
        .unwrap_or_else(now_rfc3339)
}

fn normalized_optional_text(value: String) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    Some(trimmed.to_string())
}

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}
