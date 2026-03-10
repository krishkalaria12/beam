use nanoid::nanoid;
use sqlx::query_as;
use std::collections::HashMap;
use tauri::AppHandle;

use super::db::{get_snippets_pool, SnippetDbPool};
use super::error::{Result, SnippetError};
use super::helpers::{
    content_type_to_db_value, count_words, map_row_to_snippet, map_write_error,
    normalize_cooldown_ms, normalize_max_buffer_len, normalize_required_text, normalize_tags,
    normalize_trigger_for_match, normalize_trigger_input, now_utc_timestamp, parse_trigger_mode,
    trigger_mode_to_db_value,
};
use super::model::{
    CreateSnippetPayload, Snippet, SnippetContentType, SnippetRow, SnippetRuntimeSettings,
    SnippetSettingsRow, SnippetStatusUpdatePayload, UpdateSnippetPayload,
    UpdateSnippetRuntimeSettingsPayload,
};

pub struct SnippetsRepository;

impl SnippetsRepository {
    pub fn new() -> Self {
        Self
    }

    pub async fn get_runtime_settings(&self, app: &AppHandle) -> Result<SnippetRuntimeSettings> {
        let pool: SnippetDbPool = get_snippets_pool(app).await?;

        let row = query_as::<_, SnippetSettingsRow>("SELECT * FROM snippet_settings WHERE id = 1")
            .fetch_optional(pool.as_ref())
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?
            .ok_or_else(|| SnippetError::NotFound("snippet settings not found".to_string()))?;

        Ok(SnippetRuntimeSettings {
            enabled: row.enabled == 1,
            trigger_mode: parse_trigger_mode(&row.trigger_mode),
            cooldown_ms: normalize_cooldown_ms(Some(row.cooldown_ms.max(0) as u64)),
            max_buffer_len: normalize_max_buffer_len(Some(row.max_buffer_len.max(0) as usize)),
        })
    }

    pub async fn update_runtime_settings(
        &self,
        app: &AppHandle,
        payload: UpdateSnippetRuntimeSettingsPayload,
    ) -> Result<()> {
        let pool: SnippetDbPool = get_snippets_pool(app).await?;
        let current = self.get_runtime_settings(app).await?;

        let enabled = payload.enabled.unwrap_or(current.enabled);
        let trigger_mode = payload.trigger_mode.unwrap_or(current.trigger_mode);
        let cooldown_ms = normalize_cooldown_ms(payload.cooldown_ms.or(Some(current.cooldown_ms)));
        let max_buffer_len =
            normalize_max_buffer_len(payload.max_buffer_len.or(Some(current.max_buffer_len)));

        let result = sqlx::query(
            "UPDATE snippet_settings SET enabled = ?, trigger_mode = ?, cooldown_ms = ?, max_buffer_len = ? WHERE id = 1",
        )
        .bind(if enabled { 1_i64 } else { 0_i64 })
        .bind(trigger_mode_to_db_value(&trigger_mode))
        .bind(cooldown_ms as i64)
        .bind(max_buffer_len as i64)
        .execute(pool.as_ref())
        .await
        .map_err(|error| SnippetError::Database(error.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(SnippetError::NotFound(
                "snippet settings not found".to_string(),
            ));
        }

        Ok(())
    }

    pub async fn list_snippets(&self, app: &AppHandle) -> Result<Vec<Snippet>> {
        let pool: SnippetDbPool = get_snippets_pool(app).await?;

        let snippet_rows =
            query_as::<_, SnippetRow>("SELECT * FROM snippets ORDER BY updated_at DESC")
                .fetch_all(pool.as_ref())
                .await
                .map_err(|error| SnippetError::Database(error.to_string()))?;

        if snippet_rows.is_empty() {
            return Ok(Vec::new());
        }

        let tag_pairs = query_as::<_, (String, String)>(
            r#"
            SELECT m.snippet_id, t.name
            FROM snippet_tag_map m
            JOIN snippet_tags t ON t.id = m.tag_id
            ORDER BY t.name ASC
            "#,
        )
        .fetch_all(pool.as_ref())
        .await
        .map_err(|error| SnippetError::Database(error.to_string()))?;

        let mut snippet_to_tags: HashMap<String, Vec<String>> = HashMap::new();
        for (snippet_id, tag_name) in tag_pairs {
            snippet_to_tags
                .entry(snippet_id)
                .or_default()
                .push(tag_name);
        }

        snippet_rows
            .into_iter()
            .map(|row| {
                let tags = snippet_to_tags.remove(&row.id).unwrap_or_default();
                map_row_to_snippet(row, tags)
            })
            .collect()
    }

    pub async fn get_snippet_by_id(&self, app: &AppHandle, id: &str) -> Result<Option<Snippet>> {
        let normalized_id = normalize_required_text(id, "snippet id")?;
        let pool: SnippetDbPool = get_snippets_pool(app).await?;

        let row = query_as::<_, SnippetRow>("SELECT * FROM snippets WHERE id = ?")
            .bind(&normalized_id)
            .fetch_optional(pool.as_ref())
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;

        let Some(row) = row else {
            return Ok(None);
        };

        let tags = query_as::<_, (String,)>(
            r#"
            SELECT t.name
            FROM snippet_tag_map m
            JOIN snippet_tags t ON t.id = m.tag_id
            WHERE m.snippet_id = ?
            ORDER BY t.name ASC
            "#,
        )
        .bind(&normalized_id)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|error| SnippetError::Database(error.to_string()))?
        .into_iter()
        .map(|(name,)| name)
        .collect::<Vec<_>>();

        Ok(Some(map_row_to_snippet(row, tags)?))
    }

    pub async fn create_snippet(
        &self,
        app: &AppHandle,
        payload: CreateSnippetPayload,
    ) -> Result<Snippet> {
        let pool: SnippetDbPool = get_snippets_pool(app).await?;
        let mut tx = pool
            .begin()
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;

        let id = nanoid!();
        let name = normalize_required_text(&payload.name, "snippet name")?;
        let trigger = normalize_trigger_input(&payload.trigger)?;
        let template = normalize_required_text(&payload.template, "template")?;
        let case_sensitive = payload.case_sensitive.unwrap_or(false);
        let trigger_norm = normalize_trigger_for_match(&trigger, case_sensitive)?;
        let enabled = payload.enabled.unwrap_or(true);
        let word_boundary = payload.word_boundary.unwrap_or(true);
        let instant_expand = payload.instant_expand.unwrap_or(false);
        let content_type = payload.content_type.unwrap_or(SnippetContentType::Text);
        let content_type_db = content_type_to_db_value(&content_type);
        let tags = normalize_tags(payload.tags);
        let word_count = count_words(&template);

        sqlx::query(
            r#"
            INSERT INTO snippets
            (id, name, trigger, trigger_norm, template, content_type, word_count, copied_count, enabled, case_sensitive, word_boundary, instant_expand, use_count, last_used_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, NULL)
            "#,
        )
        .bind(&id)
        .bind(&name)
        .bind(&trigger)
        .bind(&trigger_norm)
        .bind(&template)
        .bind(content_type_db)
        .bind(word_count)
        .bind(if enabled { 1_i64 } else { 0_i64 })
        .bind(if case_sensitive { 1_i64 } else { 0_i64 })
        .bind(if word_boundary { 1_i64 } else { 0_i64 })
        .bind(if instant_expand { 1_i64 } else { 0_i64 })
        .execute(&mut *tx)
        .await
        .map_err(|error| map_write_error(error))?;

        upsert_snippet_tags(&mut tx, &id, &tags).await?;

        tx.commit()
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;

        self.get_snippet_by_id(app, &id)
            .await?
            .ok_or_else(|| SnippetError::NotFound(format!("snippet '{id}' not found after create")))
    }

    pub async fn update_snippet(
        &self,
        app: &AppHandle,
        payload: UpdateSnippetPayload,
    ) -> Result<Snippet> {
        let snippet_id = normalize_required_text(&payload.id, "snippet id")?;
        let current = self
            .get_snippet_by_id(app, &snippet_id)
            .await?
            .ok_or_else(|| SnippetError::NotFound(format!("snippet '{snippet_id}' not found")))?;

        let pool: SnippetDbPool = get_snippets_pool(app).await?;
        let mut tx = pool
            .begin()
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;
        let current_instant_expand =
            query_as::<_, (i64,)>("SELECT instant_expand FROM snippets WHERE id = ?")
                .bind(&snippet_id)
                .fetch_optional(&mut *tx)
                .await
                .map_err(|error| SnippetError::Database(error.to_string()))?
                .ok_or_else(|| SnippetError::NotFound(format!("snippet '{snippet_id}' not found")))?
                .0;

        let name = match payload.name {
            Some(value) => normalize_required_text(&value, "snippet name")?,
            None => current.name.clone(),
        };
        let trigger = match payload.trigger {
            Some(value) => normalize_trigger_input(&value)?,
            None => current.trigger.clone(),
        };
        let template = match payload.template {
            Some(value) => normalize_required_text(&value, "template")?,
            None => current.template.clone(),
        };
        let content_type = payload.content_type.unwrap_or(current.content_type.clone());
        let enabled = payload.enabled.unwrap_or(current.enabled);
        let case_sensitive = payload.case_sensitive.unwrap_or(current.case_sensitive);
        let word_boundary = payload.word_boundary.unwrap_or(current.word_boundary);
        let instant_expand = payload
            .instant_expand
            .unwrap_or(current_instant_expand == 1);
        let trigger_norm = normalize_trigger_for_match(&trigger, case_sensitive)?;
        let word_count = count_words(&template);
        let content_type_db = content_type_to_db_value(&content_type);

        let result = sqlx::query(
            r#"
            UPDATE snippets
            SET name = ?, trigger = ?, trigger_norm = ?, template = ?, content_type = ?, word_count = ?, enabled = ?, case_sensitive = ?, word_boundary = ?, instant_expand = ?
            WHERE id = ?
            "#,
        )
        .bind(&name)
        .bind(&trigger)
        .bind(&trigger_norm)
        .bind(&template)
        .bind(content_type_db)
        .bind(word_count)
        .bind(if enabled { 1_i64 } else { 0_i64 })
        .bind(if case_sensitive { 1_i64 } else { 0_i64 })
        .bind(if word_boundary { 1_i64 } else { 0_i64 })
        .bind(if instant_expand { 1_i64 } else { 0_i64 })
        .bind(&snippet_id)
        .execute(&mut *tx)
        .await
        .map_err(map_write_error)?;

        if result.rows_affected() == 0 {
            return Err(SnippetError::NotFound(format!(
                "snippet '{snippet_id}' not found"
            )));
        }

        if let Some(tags) = payload.tags {
            let normalized_tags = normalize_tags(Some(tags));
            upsert_snippet_tags(&mut tx, &snippet_id, &normalized_tags).await?;
        }

        tx.commit()
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;

        self.get_snippet_by_id(app, &snippet_id)
            .await?
            .ok_or_else(|| {
                SnippetError::NotFound(format!("snippet '{snippet_id}' not found after update"))
            })
    }

    pub async fn delete_snippet(&self, app: &AppHandle, id: &str) -> Result<()> {
        let snippet_id = normalize_required_text(id, "snippet id")?;
        let pool: SnippetDbPool = get_snippets_pool(app).await?;
        let mut tx = pool
            .begin()
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;

        let result = sqlx::query("DELETE FROM snippets WHERE id = ?")
            .bind(&snippet_id)
            .execute(&mut *tx)
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(SnippetError::NotFound(format!(
                "snippet '{snippet_id}' not found"
            )));
        }

        prune_orphan_tags(&mut tx).await?;

        tx.commit()
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;

        Ok(())
    }

    pub async fn set_snippet_enabled(
        &self,
        app: &AppHandle,
        payload: SnippetStatusUpdatePayload,
    ) -> Result<Snippet> {
        let snippet_id = normalize_required_text(&payload.id, "snippet id")?;
        let pool: SnippetDbPool = get_snippets_pool(app).await?;

        let result = sqlx::query("UPDATE snippets SET enabled = ? WHERE id = ?")
            .bind(if payload.enabled { 1_i64 } else { 0_i64 })
            .bind(&snippet_id)
            .execute(pool.as_ref())
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(SnippetError::NotFound(format!(
                "snippet '{snippet_id}' not found"
            )));
        }

        self.get_snippet_by_id(app, &snippet_id)
            .await?
            .ok_or_else(|| {
                SnippetError::NotFound(format!("snippet '{snippet_id}' not found after update"))
            })
    }

    pub async fn increment_snippet_copied_count(
        &self,
        app: &AppHandle,
        snippet_id: &str,
    ) -> Result<()> {
        self.record_snippet_usage(app, snippet_id, true).await
    }

    pub async fn record_snippet_usage(
        &self,
        app: &AppHandle,
        snippet_id: &str,
        copied: bool,
    ) -> Result<()> {
        let snippet_id = normalize_required_text(snippet_id, "snippet id")?;
        let pool: SnippetDbPool = get_snippets_pool(app).await?;
        let now = now_utc_timestamp();

        let result = if copied {
            sqlx::query(
                "UPDATE snippets SET copied_count = copied_count + 1, use_count = use_count + 1, last_used_at = ? WHERE id = ?",
            )
            .bind(now)
            .bind(&snippet_id)
            .execute(pool.as_ref())
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?
        } else {
            sqlx::query(
                "UPDATE snippets SET use_count = use_count + 1, last_used_at = ? WHERE id = ?",
            )
            .bind(now)
            .bind(&snippet_id)
            .execute(pool.as_ref())
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?
        };

        if result.rows_affected() == 0 {
            return Err(SnippetError::NotFound(format!(
                "snippet '{snippet_id}' not found"
            )));
        }

        Ok(())
    }
}

async fn upsert_snippet_tags(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    snippet_id: &str,
    tags: &[String],
) -> Result<()> {
    sqlx::query("DELETE FROM snippet_tag_map WHERE snippet_id = ?")
        .bind(snippet_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| SnippetError::Database(error.to_string()))?;

    for tag in tags {
        let tag_norm = tag.to_lowercase();

        sqlx::query("INSERT OR IGNORE INTO snippet_tags (name, name_norm) VALUES (?, ?)")
            .bind(tag)
            .bind(&tag_norm)
            .execute(&mut **tx)
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;

        let tag_id: i64 = query_as::<_, (i64,)>("SELECT id FROM snippet_tags WHERE name_norm = ?")
            .bind(&tag_norm)
            .fetch_one(&mut **tx)
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?
            .0;

        sqlx::query("INSERT OR IGNORE INTO snippet_tag_map (snippet_id, tag_id) VALUES (?, ?)")
            .bind(snippet_id)
            .bind(tag_id)
            .execute(&mut **tx)
            .await
            .map_err(|error| SnippetError::Database(error.to_string()))?;
    }

    prune_orphan_tags(tx).await
}

async fn prune_orphan_tags(tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>) -> Result<()> {
    sqlx::query(
        r#"
        DELETE FROM snippet_tags
        WHERE id NOT IN (SELECT DISTINCT tag_id FROM snippet_tag_map)
        "#,
    )
    .execute(&mut **tx)
    .await
    .map_err(|error| SnippetError::Database(error.to_string()))?;

    Ok(())
}
