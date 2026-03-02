use chrono::Utc;
use rig::completion::Usage;
use tauri::AppHandle;

use crate::config::config;

use super::db::{get_ai_pool, AiDbPool};
use super::error::{AiError, Result};
use super::model::{
    AiConversationContextState, AiConversationSummary, AiPersistedMessage, AiTokenUsageSummary,
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
            SELECT id, request_id, conversation_id, role, provider, model, content, created_at
            FROM (
                SELECT id, request_id, conversation_id, role, provider, model, content, created_at
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

        let mut tx = pool
            .begin()
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
            SELECT id, request_id, conversation_id, role, provider, model, content, created_at
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
    ) -> Result<()> {
        let message_id = format!("{request_id}-user");
        let normalized_conversation_id = normalize_conversation_id(conversation_id);

        self.save_message(
            app,
            &message_id,
            request_id,
            &normalized_conversation_id,
            "user",
            provider,
            model,
            content,
            now_ts(),
        )
        .await
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
            (id, request_id, conversation_id, role, provider, model, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(format!("{request_id}-assistant"))
        .bind(request_id)
        .bind(&normalized_conversation_id)
        .bind("assistant")
        .bind(provider)
        .bind(model)
        .bind(content)
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

    async fn save_message(
        &self,
        app: &AppHandle,
        id: &str,
        request_id: &str,
        conversation_id: &str,
        role: &str,
        provider: &str,
        model: &str,
        content: &str,
        created_at: i64,
    ) -> Result<()> {
        let pool: AiDbPool = get_ai_pool(app).await?;

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO ai_chat_messages
            (id, request_id, conversation_id, role, provider, model, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(id)
        .bind(request_id)
        .bind(conversation_id)
        .bind(role)
        .bind(provider)
        .bind(model)
        .bind(content)
        .bind(created_at)
        .execute(pool.as_ref())
        .await
        .map_err(|error| AiError::Database(error.to_string()))?;

        Ok(())
    }
}

fn normalize_conversation_id(conversation_id: Option<&str>) -> String {
    let raw = conversation_id.unwrap_or(config().AI_DEFAULT_CONVERSATION_ID);
    let trimmed = raw.trim();

    if trimmed.is_empty() {
        config().AI_DEFAULT_CONVERSATION_ID.to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_history_limit(limit: Option<u32>) -> i64 {
    let raw = limit.unwrap_or(config().AI_CHAT_HISTORY_DEFAULT_LIMIT);
    let clamped = raw.max(1).min(config().AI_CHAT_HISTORY_MAX_LIMIT);

    i64::from(clamped)
}

fn now_ts() -> i64 {
    Utc::now().timestamp_millis()
}
