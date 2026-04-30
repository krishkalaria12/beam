use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FocusCategoryKind {
    BuiltIn,
    Custom,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FocusSessionMode {
    Block,
    Allow,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FocusSessionStatus {
    Running,
    Paused,
    Completed,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FocusSnoozeTargetType {
    App,
    Website,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusCategory {
    pub id: String,
    pub title: String,
    pub apps: Vec<String>,
    pub websites: Vec<String>,
    pub kind: FocusCategoryKind,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusSessionDraft {
    pub goal: String,
    pub duration_seconds: Option<u64>,
    pub mode: FocusSessionMode,
    pub category_ids: Vec<String>,
    pub apps: Vec<String>,
    pub websites: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusSnooze {
    pub id: String,
    pub target_type: FocusSnoozeTargetType,
    pub target: String,
    pub expires_at: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusSession {
    pub id: String,
    pub goal: String,
    pub duration_seconds: Option<u64>,
    pub mode: FocusSessionMode,
    pub category_ids: Vec<String>,
    pub direct_apps: Vec<String>,
    pub direct_websites: Vec<String>,
    pub resolved_apps: Vec<String>,
    pub resolved_websites: Vec<String>,
    pub status: FocusSessionStatus,
    pub started_at: i64,
    pub ends_at: Option<i64>,
    pub paused_at: Option<i64>,
    pub total_paused_ms: i64,
    pub snoozes: Vec<FocusSnooze>,
    pub completed_at: Option<i64>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusCapabilityReport {
    pub app_blocking_supported: bool,
    pub website_blocking_supported: bool,
    pub backend: String,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusStatus {
    pub categories: Vec<FocusCategory>,
    pub last_draft: FocusSessionDraft,
    pub session: Option<FocusSession>,
    pub now: i64,
    pub capabilities: FocusCapabilityReport,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusCategoryInput {
    pub id: Option<String>,
    pub title: String,
    pub apps: Vec<String>,
    pub websites: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusCategoryImportItem {
    pub title: String,
    #[serde(default)]
    pub apps: Vec<String>,
    #[serde(default)]
    pub websites: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusBrowserPolicy {
    pub active: bool,
    pub paused: bool,
    pub goal: Option<String>,
    pub mode: FocusSessionMode,
    pub websites: Vec<String>,
    pub snoozed_websites: Vec<FocusSnooze>,
    pub ends_at: Option<i64>,
    pub now: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FocusSnoozeInput {
    pub target_type: FocusSnoozeTargetType,
    pub target: String,
    pub duration_seconds: u64,
}

pub fn default_focus_draft() -> FocusSessionDraft {
    FocusSessionDraft {
        goal: "Deep work".to_string(),
        duration_seconds: Some(25 * 60),
        mode: FocusSessionMode::Block,
        category_ids: Vec::new(),
        apps: Vec::new(),
        websites: Vec::new(),
    }
}
