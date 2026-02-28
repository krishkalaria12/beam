use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{watch, RwLock};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SnippetContentType {
    Text,
    Markdown,
    Code,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub trigger: String,  // ";addr"
    pub template: String, // "Address: {{date}}"
    pub content_type: SnippetContentType,
    pub word_count: i64,
    pub copied_count: i64,
    pub tags: Vec<String>,
    pub enabled: bool,
    pub case_sensitive: bool,
    pub word_boundary: bool,
    pub use_count: i64,
    pub last_used_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(rename_all = "lowercase")]
pub enum TriggerMode {
    Delimiter,
    Instant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnippetRuntimeSettings {
    pub enabled: bool,
    pub trigger_mode: TriggerMode,
    pub cooldown_ms: u64,
    pub max_buffer_len: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RuntimeStatus {
    Starting,
    Running,
    Paused,
    Error(String),
}

#[derive(Debug, Default, Clone)]
pub struct TriggerIndex {
    pub by_trigger: HashMap<String, String>, // trigger -> snippet_id
    pub max_trigger_len: usize,
    pub ids: HashSet<String>,
}

#[derive(Debug)]
pub struct SnippetsState {
    pub settings: Arc<RwLock<SnippetRuntimeSettings>>,
    pub snippets_by_id: Arc<RwLock<HashMap<String, Snippet>>>,
    pub index: Arc<RwLock<TriggerIndex>>,
    pub status_tx: watch::Sender<RuntimeStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SnippetRow {
    pub id: String,
    pub name: String,
    pub trigger: String,
    pub trigger_norm: String,
    pub template: String,
    pub content_type: String,
    pub word_count: i64,
    pub copied_count: i64,
    pub enabled: i64,
    pub case_sensitive: i64,
    pub word_boundary: i64,
    pub instant_expand: i64,
    pub use_count: i64,
    pub last_used_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SnippetSettingsRow {
    pub id: i64,
    pub enabled: i64,
    pub trigger_mode: String,
    pub cooldown_ms: i64,
    pub max_buffer_len: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSnippetPayload {
    pub name: String,
    pub trigger: String,
    pub template: String,
    pub tags: Option<Vec<String>>,
    pub content_type: Option<SnippetContentType>,
    pub enabled: Option<bool>,
    pub case_sensitive: Option<bool>,
    pub word_boundary: Option<bool>,
    pub instant_expand: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSnippetPayload {
    pub id: String,
    pub name: Option<String>,
    pub trigger: Option<String>,
    pub template: Option<String>,
    pub tags: Option<Vec<String>>,
    pub content_type: Option<SnippetContentType>,
    pub enabled: Option<bool>,
    pub case_sensitive: Option<bool>,
    pub word_boundary: Option<bool>,
    pub instant_expand: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnippetStatusUpdatePayload {
    pub id: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSnippetRuntimeSettingsPayload {
    pub enabled: Option<bool>,
    pub trigger_mode: Option<TriggerMode>,
    pub cooldown_ms: Option<u64>,
    pub max_buffer_len: Option<usize>,
}
