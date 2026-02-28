pub mod db;
mod error;
pub mod helpers;
pub mod model;
pub mod repository;
pub mod runtime;

use tauri::AppHandle;

use self::error::Result;
use self::model::{
    CreateSnippetPayload, Snippet, SnippetRuntimeSettings, SnippetStatusUpdatePayload,
    UpdateSnippetPayload, UpdateSnippetRuntimeSettingsPayload,
};
use self::repository::SnippetsRepository;

#[tauri::command]
pub async fn get_snippets(app: AppHandle) -> Result<Vec<Snippet>> {
    SnippetsRepository::new().list_snippets(&app).await
}

#[tauri::command]
pub async fn get_snippet_by_id(app: AppHandle, id: String) -> Result<Option<Snippet>> {
    SnippetsRepository::new().get_snippet_by_id(&app, &id).await
}

#[tauri::command]
pub async fn create_snippet(app: AppHandle, payload: CreateSnippetPayload) -> Result<Snippet> {
    SnippetsRepository::new()
        .create_snippet(&app, payload)
        .await
}

#[tauri::command]
pub async fn update_snippet(app: AppHandle, payload: UpdateSnippetPayload) -> Result<Snippet> {
    SnippetsRepository::new()
        .update_snippet(&app, payload)
        .await
}

#[tauri::command]
pub async fn delete_snippet(app: AppHandle, id: String) -> Result<()> {
    SnippetsRepository::new().delete_snippet(&app, &id).await
}

#[tauri::command]
pub async fn set_snippet_enabled(
    app: AppHandle,
    payload: SnippetStatusUpdatePayload,
) -> Result<Snippet> {
    SnippetsRepository::new()
        .set_snippet_enabled(&app, payload)
        .await
}

#[tauri::command]
pub async fn increment_snippet_copied_count(app: AppHandle, snippet_id: String) -> Result<()> {
    SnippetsRepository::new()
        .increment_snippet_copied_count(&app, &snippet_id)
        .await
}

#[tauri::command]
pub async fn get_snippet_runtime_settings(app: AppHandle) -> Result<SnippetRuntimeSettings> {
    SnippetsRepository::new().get_runtime_settings(&app).await
}

#[tauri::command]
pub async fn update_snippet_runtime_settings(
    app: AppHandle,
    payload: UpdateSnippetRuntimeSettingsPayload,
) -> Result<()> {
    SnippetsRepository::new()
        .update_runtime_settings(&app, payload)
        .await
}
