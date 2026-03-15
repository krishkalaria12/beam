pub(crate) mod config;
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

async fn sync_runtime(app: &AppHandle) {
    if let Err(error) = runtime::refresh_runtime_state(app).await {
        log::warn!("[snippets-runtime] failed to refresh runtime state: {error}");
    }
}

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
    let snippet = SnippetsRepository::new()
        .create_snippet(&app, payload)
        .await?;
    sync_runtime(&app).await;
    Ok(snippet)
}

#[tauri::command]
pub async fn update_snippet(app: AppHandle, payload: UpdateSnippetPayload) -> Result<Snippet> {
    let snippet = SnippetsRepository::new()
        .update_snippet(&app, payload)
        .await?;
    sync_runtime(&app).await;
    Ok(snippet)
}

#[tauri::command]
pub async fn delete_snippet(app: AppHandle, id: String) -> Result<()> {
    SnippetsRepository::new().delete_snippet(&app, &id).await?;
    sync_runtime(&app).await;
    Ok(())
}

#[tauri::command]
pub async fn set_snippet_enabled(
    app: AppHandle,
    payload: SnippetStatusUpdatePayload,
) -> Result<Snippet> {
    let snippet = SnippetsRepository::new()
        .set_snippet_enabled(&app, payload)
        .await?;
    sync_runtime(&app).await;
    Ok(snippet)
}

#[tauri::command]
pub async fn increment_snippet_copied_count(app: AppHandle, snippet_id: String) -> Result<()> {
    SnippetsRepository::new()
        .increment_snippet_copied_count(&app, &snippet_id)
        .await?;
    sync_runtime(&app).await;
    Ok(())
}

#[tauri::command]
pub async fn paste_snippet(app: AppHandle, snippet_id: String) -> Result<()> {
    runtime::paste_snippet(&app, &snippet_id).await?;
    sync_runtime(&app).await;
    Ok(())
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
        .await?;
    sync_runtime(&app).await;
    Ok(())
}
