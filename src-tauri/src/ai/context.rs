use crate::config::config;

use super::error::Result;
use super::key_store::AiProvider;
use super::model::AiPersistedMessage;
use super::repository::AiRepository;

#[derive(Debug, Clone, Copy)]
pub struct ProviderContextLimits {
    pub context_window_tokens: u64,
    pub max_output_tokens: u64,
}

#[derive(Debug, Clone)]
pub struct ContextCompactionRequest {
    pub summary_request_id: String,
    pub summarized_until_created_at: i64,
    pub summary_prompt: String,
}

#[derive(Debug, Clone)]
pub struct ContextPreparation {
    pub conversation_id: String,
    pub prompt_text: String,
    pub compaction_request: Option<ContextCompactionRequest>,
}

pub struct ContextManager {
    repository: AiRepository,
}

impl ContextManager {
    pub fn new() -> Self {
        Self {
            repository: AiRepository::new(),
        }
    }

    pub fn limits_for_provider(provider: AiProvider) -> ProviderContextLimits {
        match provider {
            AiProvider::OpenAI => ProviderContextLimits {
                context_window_tokens: config().AI_OPENAI_CONTEXT_WINDOW_TOKENS,
                max_output_tokens: config().AI_OPENAI_MAX_OUTPUT_TOKENS,
            },
            AiProvider::Gemini => ProviderContextLimits {
                context_window_tokens: config().AI_GEMINI_CONTEXT_WINDOW_TOKENS,
                max_output_tokens: config().AI_GEMINI_MAX_OUTPUT_TOKENS,
            },
            AiProvider::Anthropic => ProviderContextLimits {
                context_window_tokens: config().AI_ANTHROPIC_CONTEXT_WINDOW_TOKENS,
                max_output_tokens: config().AI_ANTHROPIC_MAX_OUTPUT_TOKENS,
            },
            AiProvider::OpenRouter => ProviderContextLimits {
                context_window_tokens: config().AI_OPENROUTER_CONTEXT_WINDOW_TOKENS,
                max_output_tokens: config().AI_OPENROUTER_MAX_OUTPUT_TOKENS,
            },
        }
    }

    pub async fn prepare_context_prompt(
        &self,
        app: &tauri::AppHandle,
        provider: AiProvider,
        conversation_id: Option<&str>,
        user_prompt: &str,
    ) -> Result<ContextPreparation> {
        let normalized_conversation_id = normalize_conversation_id(conversation_id);
        let context_state = self
            .repository
            .get_context_state(app, Some(&normalized_conversation_id))
            .await?;

        let summary_text = context_state
            .as_ref()
            .map(|state| state.summary_text.trim())
            .filter(|summary| !summary.is_empty())
            .map(ToString::to_string);
        let summarized_until_created_at = context_state
            .as_ref()
            .map(|state| state.summarized_until_created_at)
            .unwrap_or(0);
        let token_baseline_at_summary = context_state
            .as_ref()
            .map(|state| state.total_tokens_at_summary.max(0) as u64)
            .unwrap_or(0);

        let mut messages = self
            .repository
            .get_context_messages(
                app,
                Some(&normalized_conversation_id),
                Some(summarized_until_created_at),
                Some(config().AI_CONTEXT_MESSAGES_LIMIT),
            )
            .await?;
        messages.retain(|message| message.role == "user" || message.role == "assistant");

        let limits = Self::limits_for_provider(provider);
        let input_budget = limits
            .context_window_tokens
            .saturating_sub(limits.max_output_tokens)
            .saturating_sub(config().AI_CONTEXT_INPUT_HEADROOM_TOKENS);
        let total_tokens_so_far = self
            .repository
            .get_total_tokens(app, Some(&normalized_conversation_id))
            .await?
            .max(0) as u64;
        let tokens_since_summary = total_tokens_so_far.saturating_sub(token_baseline_at_summary);
        let token_limit_reached = tokens_since_summary >= limits.context_window_tokens;

        let estimated_tokens =
            estimate_prompt_tokens(summary_text.as_deref(), &messages, user_prompt);
        if estimated_tokens <= input_budget && !token_limit_reached {
            return Ok(ContextPreparation {
                conversation_id: normalized_conversation_id,
                prompt_text: build_chat_prompt(summary_text.as_deref(), &messages, user_prompt),
                compaction_request: None,
            });
        }

        let keep_recent = config().AI_CONTEXT_KEEP_RECENT_MESSAGES as usize;
        let min_compact = config().AI_CONTEXT_MIN_MESSAGES_TO_COMPACT as usize;

        if messages.len() >= keep_recent + min_compact {
            let compact_end = messages.len().saturating_sub(keep_recent);
            let compact_messages = &messages[..compact_end];
            let recent_messages = &messages[compact_end..];
            let summarized_until_created_at = compact_messages
                .last()
                .map(|message| message.created_at)
                .unwrap_or(summarized_until_created_at);

            return Ok(ContextPreparation {
                conversation_id: normalized_conversation_id,
                prompt_text: build_chat_prompt(
                    summary_text.as_deref(),
                    recent_messages,
                    user_prompt,
                ),
                compaction_request: Some(ContextCompactionRequest {
                    summary_request_id: format!("summary-{}", nanoid::nanoid!()),
                    summarized_until_created_at,
                    summary_prompt: build_summary_prompt(summary_text.as_deref(), compact_messages),
                }),
            });
        }

        trim_messages_to_budget(
            &mut messages,
            summary_text.as_deref(),
            user_prompt,
            input_budget,
        );

        Ok(ContextPreparation {
            conversation_id: normalized_conversation_id,
            prompt_text: build_chat_prompt(summary_text.as_deref(), &messages, user_prompt),
            compaction_request: None,
        })
    }

    pub async fn persist_compaction_summary(
        &self,
        app: &tauri::AppHandle,
        conversation_id: &str,
        summary_text: &str,
        summarized_until_created_at: i64,
    ) -> Result<()> {
        let current_total_tokens = self
            .repository
            .get_total_tokens(app, Some(conversation_id))
            .await?;

        self.repository
            .upsert_context_state(
                app,
                Some(conversation_id),
                summary_text,
                summarized_until_created_at,
                current_total_tokens,
            )
            .await
    }
}

fn build_chat_prompt(
    summary_text: Option<&str>,
    messages: &[AiPersistedMessage],
    user_prompt: &str,
) -> String {
    let mut parts: Vec<String> = vec![
        "You are Beam AI. Continue the conversation naturally.".to_string(),
        "Use the prior context below when relevant, but prioritize the current user message."
            .to_string(),
    ];

    if let Some(summary) = summary_text.filter(|value| !value.trim().is_empty()) {
        parts.push("Conversation summary:".to_string());
        parts.push(summary.trim().to_string());
    }

    if !messages.is_empty() {
        parts.push("Recent conversation turns:".to_string());
        for message in messages {
            let role = if message.role == "assistant" {
                "assistant"
            } else {
                "user"
            };
            parts.push(format!("[{role}] {}", message.content.trim()));
        }
    }

    parts.push("Current user message:".to_string());
    parts.push(user_prompt.trim().to_string());

    parts.join("\n\n")
}

fn build_summary_prompt(summary_text: Option<&str>, messages: &[AiPersistedMessage]) -> String {
    let mut lines: Vec<String> = vec![
        "Summarize this conversation segment for future context-window compaction.".to_string(),
        "Keep critical facts, user preferences, decisions, unresolved tasks, and constraints."
            .to_string(),
        "Do not add information that was not present.".to_string(),
        "Return concise markdown with sections: Preferences, Facts, Active Tasks, Open Questions."
            .to_string(),
    ];

    if let Some(existing_summary) = summary_text.filter(|value| !value.trim().is_empty()) {
        lines.push("Existing summary:".to_string());
        lines.push(existing_summary.trim().to_string());
    }

    lines.push("Conversation segment to summarize:".to_string());
    for message in messages {
        let role = if message.role == "assistant" {
            "assistant"
        } else {
            "user"
        };
        lines.push(format!("[{role}] {}", message.content.trim()));
    }

    lines.join("\n\n")
}

fn estimate_prompt_tokens(
    summary_text: Option<&str>,
    messages: &[AiPersistedMessage],
    user_prompt: &str,
) -> u64 {
    let mut total = estimate_text_tokens(user_prompt);

    if let Some(summary) = summary_text {
        total = total.saturating_add(estimate_text_tokens(summary));
    }

    for message in messages {
        total = total.saturating_add(estimate_message_tokens(message));
    }

    total.saturating_add(128)
}

fn estimate_message_tokens(message: &AiPersistedMessage) -> u64 {
    estimate_text_tokens(&message.content)
        .saturating_add(config().AI_CONTEXT_MESSAGE_OVERHEAD_TOKENS)
}

fn estimate_text_tokens(text: &str) -> u64 {
    let chars = text.chars().count();
    let chars_per_token = config().AI_CONTEXT_ESTIMATED_CHARS_PER_TOKEN.max(1);
    let tokens = chars.div_ceil(chars_per_token);
    u64::try_from(tokens).unwrap_or(u64::MAX)
}

fn trim_messages_to_budget(
    messages: &mut Vec<AiPersistedMessage>,
    summary_text: Option<&str>,
    user_prompt: &str,
    budget_tokens: u64,
) {
    if messages.is_empty() {
        return;
    }

    let mut total_tokens = estimate_prompt_tokens(summary_text, messages, user_prompt);
    if total_tokens <= budget_tokens {
        return;
    }

    let mut trim_count = 0usize;
    while trim_count < messages.len() && total_tokens > budget_tokens {
        total_tokens = total_tokens.saturating_sub(estimate_message_tokens(&messages[trim_count]));
        trim_count += 1;
    }

    if trim_count > 0 {
        messages.drain(..trim_count);
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
