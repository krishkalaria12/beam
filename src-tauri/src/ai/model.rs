use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiSettings {
    pub enabled: bool,
    pub model_associations: HashMap<String, String>,
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            model_associations: HashMap::new(),
        }
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AskOptions {
    pub model: Option<String>,
    pub provider: Option<String>,
    pub conversation_id: Option<String>,
    pub creativity: Option<String>,
    pub model_mappings: Option<HashMap<String, String>>,
    pub attachments: Option<Vec<AskAttachment>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AskAttachment {
    pub id: Option<String>,
    pub name: Option<String>,
    #[serde(rename = "type")]
    pub mime_type: Option<String>,
    pub size: Option<usize>,
    pub data: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AiPersistedMessage {
    pub id: String,
    pub request_id: String,
    pub conversation_id: String,
    pub role: String,
    pub provider: String,
    pub model: String,
    pub content: String,
    pub attachments_json: Option<String>,
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiChatHistoryMessage {
    pub id: String,
    pub request_id: String,
    pub conversation_id: String,
    pub role: String,
    pub provider: String,
    pub model: String,
    pub content: String,
    pub attachments_json: Option<String>,
    pub attachments: Option<Vec<AskAttachment>>,
    pub created_at: i64,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AiPersistedAttachmentRecord {
    pub id: String,
    pub message_id: String,
    pub conversation_id: String,
    pub request_id: String,
    pub name: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub storage_path: String,
    pub sha256: String,
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct AiTokenUsageSummary {
    pub request_count: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub total_tokens: i64,
    pub cached_input_tokens: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AiConversationSummary {
    pub id: String,
    pub title: String,
    pub last_message_preview: String,
    pub updated_at: i64,
    pub message_count: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AiConversationContextState {
    pub conversation_id: String,
    pub summary_text: String,
    pub summarized_until_created_at: i64,
    pub total_tokens_at_summary: i64,
    pub updated_at: i64,
}
