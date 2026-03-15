use std::fs;
use std::path::{Path, PathBuf};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use chrono::Utc;
use rig::completion::Usage;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

use super::config::CONFIG as AI_CONFIG;

use super::db::{get_ai_pool, AiDbPool};
use super::error::{AiError, Result};
use super::model::{
    AiConversationContextState, AiConversationSummary, AiPersistedAttachmentRecord,
    AiPersistedMessage, AiTokenUsageSummary, AskAttachment,
};

pub struct AiRepository;

impl AiRepository {
    pub fn new() -> Self {
        Self
    }

    pub async fn get_chat_history(
        &self,
        app: &AppHandle,
        conversation_id: Option<&str>,
        limit: Option<u32>,
    ) -> Result<Vec<AiPersistedMessage>> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_conversation_id = normalize_conversation_id(conversation_id);
        let normalized_limit = normalize_history_limit(limit);

        sqlx::query_as::<_, AiPersistedMessage>(
            r#"
            SELECT id, request_id, conversation_id, role, provider, model, content, attachments_json, created_at
            FROM (
                SELECT id, request_id, conversation_id, role, provider, model, content, attachments_json, created_at
                FROM ai_chat_messages
                WHERE conversation_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            ) h
            ORDER BY created_at ASC
            "#,
        )
        .bind(normalized_conversation_id)
        .bind(normalized_limit)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))
    }

    pub async fn get_message_attachments(
        &self,
        app: &AppHandle,
        conversation_id: Option<&str>,
    ) -> Result<Vec<AiPersistedAttachmentRecord>> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_conversation_id = normalize_conversation_id(conversation_id);

        sqlx::query_as::<_, AiPersistedAttachmentRecord>(
            r#"
            SELECT id, message_id, conversation_id, request_id, name, mime_type, size_bytes, storage_path, sha256, created_at
            FROM ai_message_attachments
            WHERE conversation_id = ?
            ORDER BY created_at ASC
            "#,
        )
        .bind(normalized_conversation_id)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))
    }

    pub async fn get_conversations(
        &self,
        app: &AppHandle,
        limit: Option<u32>,
    ) -> Result<Vec<AiConversationSummary>> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_limit = normalize_history_limit(limit);

        sqlx::query_as::<_, AiConversationSummary>(
            r#"
            SELECT
                m.conversation_id as id,
                COALESCE(
                    (
                        SELECT substr(trim(mu.content), 1, 80)
                        FROM ai_chat_messages mu
                        WHERE mu.conversation_id = m.conversation_id
                          AND mu.role = 'user'
                        ORDER BY mu.created_at ASC
                        LIMIT 1
                    ),
                    'New Chat'
                ) as title,
                COALESCE(
                    (
                        SELECT substr(trim(ml.content), 1, 120)
                        FROM ai_chat_messages ml
                        WHERE ml.conversation_id = m.conversation_id
                        ORDER BY ml.created_at DESC
                        LIMIT 1
                    ),
                    ''
                ) as last_message_preview,
                MAX(m.created_at) as updated_at,
                COUNT(*) as message_count
            FROM ai_chat_messages m
            GROUP BY m.conversation_id
            ORDER BY updated_at DESC
            LIMIT ?
            "#,
        )
        .bind(normalized_limit)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))
    }

    pub async fn clear_chat_history(
        &self,
        app: &AppHandle,
        conversation_id: Option<&str>,
    ) -> Result<()> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_conversation_id = normalize_conversation_id(conversation_id);

        let attachment_paths = sqlx::query_as::<_, (String,)>(
            "SELECT storage_path FROM ai_message_attachments WHERE conversation_id = ?",
        )
        .bind(&normalized_conversation_id)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))?;

        for (relative_path,) in attachment_paths {
            let _ = remove_attachment_file(app, &relative_path);
        }

        let mut tx = pool
            .begin()
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        sqlx::query("DELETE FROM ai_message_attachments WHERE conversation_id = ?")
            .bind(&normalized_conversation_id)
            .execute(&mut *tx)
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        sqlx::query("DELETE FROM ai_chat_messages WHERE conversation_id = ?")
            .bind(&normalized_conversation_id)
            .execute(&mut *tx)
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        sqlx::query("DELETE FROM ai_token_usage WHERE conversation_id = ?")
            .bind(&normalized_conversation_id)
            .execute(&mut *tx)
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        sqlx::query("DELETE FROM ai_conversation_context WHERE conversation_id = ?")
            .bind(&normalized_conversation_id)
            .execute(&mut *tx)
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        tx.commit()
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        Ok(())
    }

    pub async fn get_context_state(
        &self,
        app: &AppHandle,
        conversation_id: Option<&str>,
    ) -> Result<Option<AiConversationContextState>> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_conversation_id = normalize_conversation_id(conversation_id);

        sqlx::query_as::<_, AiConversationContextState>(
            r#"
            SELECT conversation_id, summary_text, summarized_until_created_at, total_tokens_at_summary, updated_at
            FROM ai_conversation_context
            WHERE conversation_id = ?
            "#,
        )
        .bind(normalized_conversation_id)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))
    }

    pub async fn upsert_context_state(
        &self,
        app: &AppHandle,
        conversation_id: Option<&str>,
        summary_text: &str,
        summarized_until_created_at: i64,
        total_tokens_at_summary: i64,
    ) -> Result<()> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_conversation_id = normalize_conversation_id(conversation_id);

        sqlx::query(
            r#"
            INSERT INTO ai_conversation_context
            (conversation_id, summary_text, summarized_until_created_at, total_tokens_at_summary, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(conversation_id)
            DO UPDATE SET
                summary_text = excluded.summary_text,
                summarized_until_created_at = excluded.summarized_until_created_at,
                total_tokens_at_summary = excluded.total_tokens_at_summary,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(normalized_conversation_id)
        .bind(summary_text)
        .bind(summarized_until_created_at)
        .bind(total_tokens_at_summary)
        .bind(now_ts())
        .execute(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))?;

        Ok(())
    }

    pub async fn get_context_messages(
        &self,
        app: &AppHandle,
        conversation_id: Option<&str>,
        after_created_at: Option<i64>,
        limit: Option<u32>,
    ) -> Result<Vec<AiPersistedMessage>> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_conversation_id = normalize_conversation_id(conversation_id);
        let normalized_limit = normalize_history_limit(limit);
        let normalized_after = after_created_at.unwrap_or(0);

        sqlx::query_as::<_, AiPersistedMessage>(
            r#"
            SELECT id, request_id, conversation_id, role, provider, model, content, attachments_json, created_at
            FROM ai_chat_messages
            WHERE conversation_id = ?
              AND created_at > ?
            ORDER BY created_at ASC
            LIMIT ?
            "#,
        )
        .bind(normalized_conversation_id)
        .bind(normalized_after)
        .bind(normalized_limit)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))
    }

    pub async fn get_total_tokens(
        &self,
        app: &AppHandle,
        conversation_id: Option<&str>,
    ) -> Result<i64> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_conversation_id = normalize_conversation_id(conversation_id);

        let row = sqlx::query_as::<_, (i64,)>(
            r#"
            SELECT COALESCE(SUM(total_tokens), 0)
            FROM ai_token_usage
            WHERE conversation_id = ?
            "#,
        )
        .bind(normalized_conversation_id)
        .fetch_one(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))?;

        Ok(row.0)
    }

    pub async fn save_usage_record(
        &self,
        app: &AppHandle,
        request_id: &str,
        conversation_id: Option<&str>,
        provider: &str,
        model: &str,
        usage: Usage,
    ) -> Result<()> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_conversation_id = normalize_conversation_id(conversation_id);
        let timestamp = now_ts();

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO ai_token_usage
            (request_id, conversation_id, provider, model, input_tokens, output_tokens, total_tokens, cached_input_tokens, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(request_id)
        .bind(normalized_conversation_id)
        .bind(provider)
        .bind(model)
        .bind(usage.input_tokens as i64)
        .bind(usage.output_tokens as i64)
        .bind(usage.total_tokens as i64)
        .bind(usage.cached_input_tokens as i64)
        .bind(timestamp)
        .execute(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))?;

        Ok(())
    }

    pub async fn get_token_usage_summary(
        &self,
        app: &AppHandle,
        conversation_id: Option<&str>,
    ) -> Result<AiTokenUsageSummary> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_conversation_id = normalize_conversation_id(conversation_id);

        let row = sqlx::query_as::<_, (i64, i64, i64, i64, i64)>(
            r#"
            SELECT
                COUNT(*) as request_count,
                COALESCE(SUM(input_tokens), 0) as input_tokens,
                COALESCE(SUM(output_tokens), 0) as output_tokens,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                COALESCE(SUM(cached_input_tokens), 0) as cached_input_tokens
            FROM ai_token_usage
            WHERE conversation_id = ?
            "#,
        )
        .bind(normalized_conversation_id)
        .fetch_one(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))?;

        Ok(AiTokenUsageSummary {
            request_count: row.0,
            input_tokens: row.1,
            output_tokens: row.2,
            total_tokens: row.3,
            cached_input_tokens: row.4,
        })
    }

    pub async fn save_user_message(
        &self,
        app: &AppHandle,
        request_id: &str,
        conversation_id: Option<&str>,
        provider: &str,
        model: &str,
        content: &str,
        attachments: Option<&[AskAttachment]>,
    ) -> Result<()> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let message_id = format!("{request_id}-user");
        let normalized_conversation_id = normalize_conversation_id(conversation_id);
        let timestamp = now_ts();

        let mut tx = pool
            .begin()
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        let stale_attachment_paths = sqlx::query_as::<_, (String,)>(
            "SELECT storage_path FROM ai_message_attachments WHERE message_id = ?",
        )
        .bind(&message_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|error| AiError::Database(error.to_string()))?;

        for (relative_path,) in stale_attachment_paths {
            let _ = remove_attachment_file(app, &relative_path);
        }

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO ai_chat_messages
            (id, request_id, conversation_id, role, provider, model, content, attachments_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&message_id)
        .bind(request_id)
        .bind(&normalized_conversation_id)
        .bind("user")
        .bind(provider)
        .bind(model)
        .bind(content)
        .bind::<Option<String>>(None)
        .bind(timestamp)
        .execute(&mut *tx)
        .await
        .map_err(|error| AiError::Database(error.to_string()))?;

        sqlx::query("DELETE FROM ai_message_attachments WHERE message_id = ?")
            .bind(&message_id)
            .execute(&mut *tx)
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        if let Some(attachments) = attachments {
            for (index, attachment) in attachments.iter().enumerate() {
                let attachment_row = prepare_attachment_row(
                    app,
                    &message_id,
                    &normalized_conversation_id,
                    request_id,
                    index,
                    attachment,
                )?;

                sqlx::query(
                    r#"
                    INSERT OR REPLACE INTO ai_message_attachments
                    (id, message_id, conversation_id, request_id, name, mime_type, size_bytes, storage_path, sha256, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#,
                )
                .bind(attachment_row.id)
                .bind(&message_id)
                .bind(&normalized_conversation_id)
                .bind(request_id)
                .bind(attachment_row.name)
                .bind(attachment_row.mime_type)
                .bind(attachment_row.size_bytes)
                .bind(attachment_row.storage_path)
                .bind(attachment_row.sha256)
                .bind(timestamp)
                .execute(&mut *tx)
                .await
                .map_err(|error| AiError::Database(error.to_string()))?;
            }
        }

        tx.commit()
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        Ok(())
    }

    pub async fn save_assistant_message_and_usage(
        &self,
        app: &AppHandle,
        request_id: &str,
        conversation_id: Option<&str>,
        provider: &str,
        model: &str,
        content: &str,
        usage: Option<Usage>,
    ) -> Result<()> {
        let pool: AiDbPool = get_ai_pool(app).await?;
        let normalized_conversation_id = normalize_conversation_id(conversation_id);
        let timestamp = now_ts();
        let usage = usage.unwrap_or_default();

        let mut tx = pool
            .begin()
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO ai_chat_messages
            (id, request_id, conversation_id, role, provider, model, content, attachments_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(format!("{request_id}-assistant"))
        .bind(request_id)
        .bind(&normalized_conversation_id)
        .bind("assistant")
        .bind(provider)
        .bind(model)
        .bind(content)
        .bind::<Option<String>>(None)
        .bind(timestamp)
        .execute(&mut *tx)
        .await
        .map_err(|error| AiError::Database(error.to_string()))?;

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO ai_token_usage
            (request_id, conversation_id, provider, model, input_tokens, output_tokens, total_tokens, cached_input_tokens, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(request_id)
        .bind(&normalized_conversation_id)
        .bind(provider)
        .bind(model)
        .bind(usage.input_tokens as i64)
        .bind(usage.output_tokens as i64)
        .bind(usage.total_tokens as i64)
        .bind(usage.cached_input_tokens as i64)
        .bind(timestamp)
        .execute(&mut *tx)
        .await
        .map_err(|error| AiError::Database(error.to_string()))?;

        tx.commit()
            .await
            .map_err(|error| AiError::Database(error.to_string()))?;

        Ok(())
    }
}

struct PreparedAttachmentRow {
    id: String,
    name: String,
    mime_type: String,
    size_bytes: i64,
    storage_path: String,
    sha256: String,
}

fn prepare_attachment_row(
    app: &AppHandle,
    message_id: &str,
    conversation_id: &str,
    request_id: &str,
    index: usize,
    attachment: &AskAttachment,
) -> Result<PreparedAttachmentRow> {
    let data = attachment.data.trim();
    if data.is_empty() {
        return Err(AiError::InvalidAttachment(
            "Attachment payload is empty".to_string(),
        ));
    }

    let (decoded_bytes, detected_mime_type) = decode_attachment_data(data)?;
    let mime_type = attachment
        .mime_type
        .as_deref()
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty())
        .or(detected_mime_type)
        .unwrap_or_else(|| "application/octet-stream".to_string());

    let name = attachment
        .name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .unwrap_or_else(|| format!("attachment-{}", index + 1));

    let row_id = attachment
        .id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| sanitize_path_segment(value))
        .unwrap_or_else(|| format!("att-{}", index + 1));
    let message_segment = sanitize_path_segment(message_id);
    let file_name = format!(
        "{}-{}-{}.bin",
        sanitize_path_segment(conversation_id),
        sanitize_path_segment(request_id),
        row_id
    );
    let storage_path = Path::new(AI_CONFIG.directory)
        .join(AI_CONFIG.attachments_directory)
        .join(message_segment)
        .join(file_name)
        .to_string_lossy()
        .to_string();

    let absolute_path = resolve_storage_absolute_path(app, &storage_path)?;
    if let Some(parent) = absolute_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&absolute_path, &decoded_bytes)?;

    let sha256 = format!("{:x}", Sha256::digest(&decoded_bytes));
    let size_bytes = i64::try_from(decoded_bytes.len()).unwrap_or(i64::MAX);
    let record_id = format!("{}-{}", message_id, row_id);

    Ok(PreparedAttachmentRow {
        id: record_id,
        name,
        mime_type,
        size_bytes,
        storage_path,
        sha256,
    })
}

fn decode_attachment_data(data: &str) -> Result<(Vec<u8>, Option<String>)> {
    if let Some(body) = data.strip_prefix("data:") {
        let (meta, payload) = body
            .split_once(',')
            .ok_or_else(|| AiError::InvalidAttachment("Invalid data URL payload".to_string()))?;

        let mut mime_type: Option<String> = None;
        let mut is_base64 = false;
        for token in meta.split(';').map(str::trim) {
            if token.eq_ignore_ascii_case("base64") {
                is_base64 = true;
            } else if token.contains('/') && !token.is_empty() {
                mime_type = Some(token.to_ascii_lowercase());
            }
        }

        if !is_base64 {
            return Err(AiError::InvalidAttachment(
                "Only base64 data URLs are supported".to_string(),
            ));
        }

        let normalized_payload: String = payload
            .chars()
            .filter(|c| !c.is_ascii_whitespace())
            .collect();
        let decoded_bytes = STANDARD.decode(normalized_payload).map_err(|_| {
            AiError::InvalidAttachment("Invalid base64 attachment data".to_string())
        })?;

        return Ok((decoded_bytes, mime_type));
    }

    let normalized_payload: String = data.chars().filter(|c| !c.is_ascii_whitespace()).collect();
    let decoded_bytes = STANDARD
        .decode(normalized_payload)
        .map_err(|_| AiError::InvalidAttachment("Invalid base64 attachment data".to_string()))?;
    Ok((decoded_bytes, None))
}

fn sanitize_path_segment(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    for ch in raw.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
            out.push(ch);
        } else {
            out.push('-');
        }
    }

    if out.is_empty() {
        "file".to_string()
    } else {
        out
    }
}

fn resolve_storage_absolute_path(app: &AppHandle, relative_path: &str) -> Result<PathBuf> {
    let app_local_data = app
        .path()
        .app_local_data_dir()
        .map_err(|_| AiError::AppDataDirUnavailable)?;
    Ok(app_local_data.join(relative_path))
}

fn remove_attachment_file(app: &AppHandle, relative_path: &str) -> Result<()> {
    let absolute_path = resolve_storage_absolute_path(app, relative_path)?;
    if absolute_path.exists() {
        fs::remove_file(&absolute_path)?;
    }
    Ok(())
}

fn normalize_conversation_id(conversation_id: Option<&str>) -> String {
    let raw = conversation_id.unwrap_or(AI_CONFIG.default_conversation_id);
    let trimmed = raw.trim();

    if trimmed.is_empty() {
        AI_CONFIG.default_conversation_id.to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_history_limit(limit: Option<u32>) -> i64 {
    let raw = limit.unwrap_or(AI_CONFIG.chat_history_default_limit);
    let clamped = raw.max(1).min(AI_CONFIG.chat_history_max_limit);

    i64::from(clamped)
}

fn now_ts() -> i64 {
    Utc::now().timestamp_millis()
}
