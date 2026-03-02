pub mod attachments;
pub mod context;
pub mod db;
pub mod error;
pub mod helper;
pub mod key_store;
pub mod model;
pub mod repository;

pub use error::{AiError, Result};
pub use model::{
    AiChatHistoryMessage, AiConversationSummary, AiPersistedMessage, AiSettings,
    AiTokenUsageSummary, AskOptions,
};

#[allow(non_snake_case)]
fn resolve_provider_arg(provider_id: Option<String>, providerId: Option<String>) -> Option<String> {
    provider_id.or(providerId)
}

#[tauri::command]
pub fn get_ai_settings(app: tauri::AppHandle) -> Result<AiSettings> {
    helper::get_ai_settings(app)
}

#[tauri::command]
pub fn set_ai_settings(app: tauri::AppHandle, settings: AiSettings) -> Result<()> {
    helper::set_ai_settings(app, settings)
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_ai_chat_history(
    app: tauri::AppHandle,
    conversation_id: Option<String>,
    conversationId: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<AiChatHistoryMessage>> {
    helper::get_ai_chat_history(app, conversation_id.or(conversationId), limit).await
}

#[tauri::command]
pub async fn get_ai_conversations(
    app: tauri::AppHandle,
    limit: Option<u32>,
) -> Result<Vec<AiConversationSummary>> {
    helper::get_ai_conversations(app, limit).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn clear_ai_chat_history(
    app: tauri::AppHandle,
    conversation_id: Option<String>,
    conversationId: Option<String>,
) -> Result<()> {
    helper::clear_ai_chat_history(app, conversation_id.or(conversationId)).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_ai_token_usage_summary(
    app: tauri::AppHandle,
    conversation_id: Option<String>,
    conversationId: Option<String>,
) -> Result<AiTokenUsageSummary> {
    helper::get_ai_token_usage_summary(app, conversation_id.or(conversationId)).await
}

#[tauri::command]
#[allow(non_snake_case)]
pub fn set_ai_api_key(
    key: String,
    provider_id: Option<String>,
    providerId: Option<String>,
) -> Result<()> {
    helper::set_ai_api_key(key, resolve_provider_arg(provider_id, providerId))
}

#[tauri::command]
#[allow(non_snake_case)]
pub fn is_ai_api_key_set(provider_id: Option<String>, providerId: Option<String>) -> Result<bool> {
    helper::is_ai_api_key_set(resolve_provider_arg(provider_id, providerId))
}

#[tauri::command]
#[allow(non_snake_case)]
pub fn clear_ai_api_key(provider_id: Option<String>, providerId: Option<String>) -> Result<()> {
    helper::clear_ai_api_key(resolve_provider_arg(provider_id, providerId))
}

#[tauri::command]
pub fn ai_can_access(app: tauri::AppHandle, provider_id: Option<String>) -> Result<bool> {
    helper::ai_can_access(app, provider_id)
}

#[tauri::command]
pub async fn ai_ask_stream(
    app_handle: tauri::AppHandle,
    request_id: String,
    prompt: String,
    options: AskOptions,
) -> Result<()> {
    helper::ai_ask_stream(app_handle, request_id, prompt, options).await
}
