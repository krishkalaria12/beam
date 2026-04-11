use chrono::{SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use std::collections::HashSet;
use tauri::AppHandle;
use tokio::sync::Mutex;
use url::Url;

use super::db::get_clipboard_pool;
use super::error::{ClipboardError, Result};
use super::password::{decrypt_value, encrypt_value};

use crate::clipboard::config::CONFIG as CLIPBOARD_CONFIG;

static CLIPBOARD_HISTORY_WRITE_LOCK: Mutex<()> = Mutex::const_new(());

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

#[derive(Debug, Clone, FromRow)]
struct StoredClipboardHistoryEntry {
    copied_at: String,
    encrypted_value: String,
    pinned: bool,
}

#[derive(Debug, Clone)]
struct VisibleClipboardHistoryEntry {
    entry: ClipboardHistoryEntry,
    pinned: bool,
}

pub async fn get_history(app: &AppHandle) -> Result<Vec<ClipboardHistoryEntry>> {
    let pool = get_clipboard_pool(app).await?;
    let (history, _) = load_visible_history(pool.as_ref()).await?;

    Ok(history.into_iter().map(|record| record.entry).collect())
}

pub async fn get_history_values(app: &AppHandle) -> Result<Vec<String>> {
    let history = get_history(app).await?;
    Ok(history.into_iter().map(|entry| entry.value).collect())
}

pub async fn save_to_history(app: &AppHandle, copy_value: String) -> Result<()> {
    if copy_value.trim().is_empty() {
        return Ok(());
    }

    let _guard = CLIPBOARD_HISTORY_WRITE_LOCK.lock().await;
    let pool = get_clipboard_pool(app).await?;
    let mut tx = pool.begin().await.map_err(database_error)?;
    let stored_history = load_stored_history_with_executor(&mut *tx).await?;
    let (duplicate_copied_ats, pinned) = find_duplicate_rows(&stored_history, &copy_value);

    delete_rows_by_copied_at(&mut tx, &duplicate_copied_ats).await?;

    sqlx::query(
        "INSERT INTO clipboard_history (copied_at, encrypted_value, pinned) VALUES (?, ?, ?)",
    )
    .bind(now_rfc3339())
    .bind(encrypt_value(&copy_value)?)
    .bind(pinned)
    .execute(&mut *tx)
    .await
    .map_err(database_error)?;

    trim_history(&mut tx).await?;
    tx.commit().await.map_err(database_error)?;

    Ok(())
}

pub async fn remove_history_entry(
    app: &AppHandle,
    copied_at: String,
    _value: String,
) -> Result<()> {
    let _guard = CLIPBOARD_HISTORY_WRITE_LOCK.lock().await;
    let pool = get_clipboard_pool(app).await?;

    sqlx::query("DELETE FROM clipboard_history WHERE copied_at = ?")
        .bind(copied_at)
        .execute(pool.as_ref())
        .await
        .map_err(database_error)?;

    Ok(())
}

pub async fn clear_history(app: &AppHandle) -> Result<()> {
    let _guard = CLIPBOARD_HISTORY_WRITE_LOCK.lock().await;
    let pool = get_clipboard_pool(app).await?;

    sqlx::query("DELETE FROM clipboard_history")
        .execute(pool.as_ref())
        .await
        .map_err(database_error)?;

    Ok(())
}

pub async fn get_pinned_entry_ids(app: &AppHandle) -> Result<Vec<String>> {
    let pool = get_clipboard_pool(app).await?;
    get_pinned_entry_ids_from_pool(pool.as_ref()).await
}

pub async fn set_entry_pinned(
    app: &AppHandle,
    copied_at: String,
    _value: String,
    pinned: bool,
) -> Result<Vec<String>> {
    let _guard = CLIPBOARD_HISTORY_WRITE_LOCK.lock().await;
    let pool = get_clipboard_pool(app).await?;

    sqlx::query("UPDATE clipboard_history SET pinned = ? WHERE copied_at = ?")
        .bind(pinned)
        .bind(copied_at)
        .execute(pool.as_ref())
        .await
        .map_err(database_error)?;

    get_pinned_entry_ids_from_pool(pool.as_ref()).await
}

async fn load_visible_history(
    pool: &SqlitePool,
) -> Result<(
    Vec<VisibleClipboardHistoryEntry>,
    Vec<StoredClipboardHistoryEntry>,
)> {
    let stored_history = load_stored_history(pool).await?;
    get_decrypted_history_with_undecryptable(stored_history)
}

async fn load_stored_history(pool: &SqlitePool) -> Result<Vec<StoredClipboardHistoryEntry>> {
    load_stored_history_with_executor(pool).await
}

async fn load_stored_history_with_executor<'a, E>(
    executor: E,
) -> Result<Vec<StoredClipboardHistoryEntry>>
where
    E: sqlx::Executor<'a, Database = sqlx::Sqlite>,
{
    sqlx::query_as::<_, StoredClipboardHistoryEntry>(
        "SELECT copied_at, encrypted_value, pinned FROM clipboard_history ORDER BY copied_at DESC",
    )
    .fetch_all(executor)
    .await
    .map_err(database_error)
}

fn get_decrypted_history_with_undecryptable(
    stored_history: Vec<StoredClipboardHistoryEntry>,
) -> Result<(
    Vec<VisibleClipboardHistoryEntry>,
    Vec<StoredClipboardHistoryEntry>,
)> {
    let mut history = Vec::with_capacity(stored_history.len());
    let mut undecryptable_history = Vec::new();

    for stored_entry in stored_history {
        let decrypted_value = match decrypt_value(&stored_entry.encrypted_value) {
            Ok(value) => value,
            Err(_) => {
                undecryptable_history.push(stored_entry);
                continue;
            }
        };

        if decrypted_value.trim().is_empty() {
            continue;
        }

        history.push(VisibleClipboardHistoryEntry {
            entry: build_entry_with_timestamp(decrypted_value, stored_entry.copied_at.clone()),
            pinned: stored_entry.pinned,
        });
    }

    dedupe_keep_order(&mut history);
    history.truncate(CLIPBOARD_CONFIG.max_history_entries);

    Ok((history, undecryptable_history))
}

fn dedupe_keep_order(values: &mut Vec<VisibleClipboardHistoryEntry>) {
    let mut seen = HashSet::new();
    values.retain(|entry| seen.insert(entry.entry.value.clone()));
}

async fn get_pinned_entry_ids_from_pool(pool: &SqlitePool) -> Result<Vec<String>> {
    let stored_history = sqlx::query_as::<_, StoredClipboardHistoryEntry>(
        "SELECT copied_at, encrypted_value, pinned FROM clipboard_history WHERE pinned = 1 ORDER BY copied_at DESC",
    )
    .fetch_all(pool)
    .await
    .map_err(database_error)?;
    let (history, _) = get_decrypted_history_with_undecryptable(stored_history)?;

    Ok(build_pinned_entry_ids(&history))
}

fn find_duplicate_rows(
    stored_history: &[StoredClipboardHistoryEntry],
    copy_value: &str,
) -> (Vec<String>, bool) {
    let mut duplicate_copied_ats = Vec::new();
    let mut pinned = false;

    for entry in stored_history {
        let Ok(decrypted_value) = decrypt_value(&entry.encrypted_value) else {
            continue;
        };

        if decrypted_value == copy_value {
            duplicate_copied_ats.push(entry.copied_at.clone());
            pinned |= entry.pinned;
        }
    }

    (duplicate_copied_ats, pinned)
}

async fn delete_rows_by_copied_at(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    copied_ats: &[String],
) -> Result<()> {
    for copied_at in copied_ats {
        sqlx::query("DELETE FROM clipboard_history WHERE copied_at = ?")
            .bind(copied_at)
            .execute(&mut **tx)
            .await
            .map_err(database_error)?;
    }

    Ok(())
}

async fn trim_history(tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>) -> Result<()> {
    sqlx::query(
        "DELETE FROM clipboard_history WHERE copied_at NOT IN (SELECT copied_at FROM clipboard_history ORDER BY copied_at DESC LIMIT ?)",
    )
    .bind(CLIPBOARD_CONFIG.max_history_entries as i64)
    .execute(&mut **tx)
    .await
    .map_err(database_error)?;

    Ok(())
}

fn build_pinned_entry_ids(history: &[VisibleClipboardHistoryEntry]) -> Vec<String> {
    history
        .iter()
        .filter(|record| record.pinned)
        .map(|record| build_pinned_entry_id(&record.entry.copied_at, &record.entry.value))
        .collect()
}

fn build_pinned_entry_id(copied_at: &str, value: &str) -> String {
    format!("{}::{}", copied_at.trim(), value)
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

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Micros, true)
}

fn database_error(error: sqlx::Error) -> ClipboardError {
    ClipboardError::Database(error.to_string())
}
