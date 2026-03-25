use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use std::sync::atomic::{AtomicU16, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tokio::sync::Mutex;

use super::db::get_calculator_pool;
use super::error::{CalculatorError, Result};

use crate::calculator::config::CONFIG as CALCULATOR_CONFIG;

static NEXT_HISTORY_DISCRIMINATOR: AtomicU16 = AtomicU16::new(0);
static CALCULATOR_HISTORY_WRITE_LOCK: Mutex<()> = Mutex::const_new(());

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, PartialEq)]
pub struct CalculatorHistoryEntry {
    pub query: String,
    pub result: String,
    pub timestamp: i64,
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
struct CalculatorHistorySnapshot {
    timestamp: i64,
    session_id: Option<String>,
    pinned: bool,
}

pub async fn get_history(app: &AppHandle) -> Result<Vec<CalculatorHistoryEntry>> {
    let pool = get_calculator_pool(app).await?;

    sqlx::query_as::<_, CalculatorHistoryEntry>(
        "SELECT query, result, timestamp, session_id FROM calculator_history ORDER BY timestamp DESC",
    )
    .fetch_all(pool.as_ref())
    .await
    .map_err(database_error)
}

pub async fn save_to_history(
    app: &AppHandle,
    query: String,
    result: String,
    session_id: String,
) -> Result<()> {
    let _guard = CALCULATOR_HISTORY_WRITE_LOCK.lock().await;
    let pool = get_calculator_pool(app).await?;
    let mut tx = pool.begin().await.map_err(database_error)?;

    let timestamp = now_timestamp_millis();
    let pinned = has_pinned_duplicate(&mut tx, &query, &result).await?;
    let newest_entry = load_newest_history_snapshot(&mut tx).await?;

    let persisted_timestamp = if newest_entry
        .as_ref()
        .and_then(|entry| entry.session_id.as_ref())
        .is_some_and(|existing_session_id| existing_session_id == &session_id)
    {
        let existing = newest_entry.expect("newest entry checked above");
        sqlx::query(
            "UPDATE calculator_history SET query = ?, result = ?, session_id = ?, timestamp = ?, pinned = ? WHERE timestamp = ?",
        )
        .bind(&query)
        .bind(&result)
        .bind(&session_id)
        .bind(timestamp)
        .bind(existing.pinned || pinned)
        .bind(existing.timestamp)
        .execute(&mut *tx)
        .await
        .map_err(database_error)?;

        timestamp
    } else {
        sqlx::query(
            "INSERT INTO calculator_history (timestamp, query, result, session_id, pinned) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(timestamp)
        .bind(&query)
        .bind(&result)
        .bind(&session_id)
        .bind(pinned)
        .execute(&mut *tx)
        .await
        .map_err(database_error)?;

        timestamp
    };

    sqlx::query("DELETE FROM calculator_history WHERE query = ? AND result = ? AND timestamp <> ?")
        .bind(&query)
        .bind(&result)
        .bind(persisted_timestamp)
        .execute(&mut *tx)
        .await
        .map_err(database_error)?;

    trim_history(&mut tx).await?;

    tx.commit().await.map_err(database_error)?;

    Ok(())
}

fn now_timestamp_millis() -> i64 {
    let base_millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default();
    let discriminator =
        i64::from(NEXT_HISTORY_DISCRIMINATOR.fetch_add(1, Ordering::Relaxed) % 1000);

    base_millis
        .saturating_mul(1000)
        .saturating_add(discriminator)
}

pub async fn delete_history_entry(app: &AppHandle, timestamp: i64) -> Result<()> {
    let _guard = CALCULATOR_HISTORY_WRITE_LOCK.lock().await;
    let pool = get_calculator_pool(app).await?;

    sqlx::query("DELETE FROM calculator_history WHERE timestamp = ?")
        .bind(timestamp)
        .execute(pool.as_ref())
        .await
        .map_err(database_error)?;

    Ok(())
}

pub async fn clear_history(app: &AppHandle) -> Result<()> {
    let _guard = CALCULATOR_HISTORY_WRITE_LOCK.lock().await;
    let pool = get_calculator_pool(app).await?;

    sqlx::query("DELETE FROM calculator_history")
        .execute(pool.as_ref())
        .await
        .map_err(database_error)?;

    Ok(())
}

pub async fn get_pinned_timestamps(app: &AppHandle) -> Result<Vec<i64>> {
    let pool = get_calculator_pool(app).await?;
    get_pinned_timestamps_from_pool(pool.as_ref()).await
}

async fn get_pinned_timestamps_from_pool(pool: &SqlitePool) -> Result<Vec<i64>> {
    sqlx::query_as::<_, (i64,)>(
        "SELECT timestamp FROM calculator_history WHERE pinned = 1 ORDER BY timestamp ASC",
    )
    .fetch_all(pool)
    .await
    .map_err(database_error)
    .map(|rows| rows.into_iter().map(|(timestamp,)| timestamp).collect())
}

pub async fn set_history_entry_pinned(
    app: &AppHandle,
    timestamp: i64,
    pinned: bool,
) -> Result<Vec<i64>> {
    let _guard = CALCULATOR_HISTORY_WRITE_LOCK.lock().await;
    let pool = get_calculator_pool(app).await?;

    sqlx::query("UPDATE calculator_history SET pinned = ? WHERE timestamp = ?")
        .bind(pinned)
        .bind(timestamp)
        .execute(pool.as_ref())
        .await
        .map_err(database_error)?;

    get_pinned_timestamps_from_pool(pool.as_ref()).await
}

async fn has_pinned_duplicate(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    query: &str,
    result: &str,
) -> Result<bool> {
    sqlx::query_as::<_, (bool,)>(
        "SELECT EXISTS(SELECT 1 FROM calculator_history WHERE query = ? AND result = ? AND pinned = 1)",
    )
    .bind(query)
    .bind(result)
    .fetch_one(&mut **tx)
    .await
    .map(|(exists,)| exists)
    .map_err(database_error)
}

async fn load_newest_history_snapshot(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
) -> Result<Option<CalculatorHistorySnapshot>> {
    sqlx::query_as::<_, CalculatorHistorySnapshot>(
        "SELECT timestamp, session_id, pinned FROM calculator_history ORDER BY timestamp DESC LIMIT 1",
    )
    .fetch_optional(&mut **tx)
    .await
    .map_err(database_error)
}

async fn trim_history(tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>) -> Result<()> {
    sqlx::query(
        "DELETE FROM calculator_history WHERE timestamp NOT IN (SELECT timestamp FROM calculator_history ORDER BY timestamp DESC LIMIT ?)",
    )
    .bind(CALCULATOR_CONFIG.max_history_entries as i64)
    .execute(&mut **tx)
    .await
    .map_err(database_error)?;

    Ok(())
}

fn database_error(error: sqlx::Error) -> CalculatorError {
    CalculatorError::Database(error.to_string())
}
