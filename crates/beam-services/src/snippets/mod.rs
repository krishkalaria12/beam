// PORT: apps/desktop/src-tauri/src/snippets/mod.rs
// Command attributes deleted; AppHandle became &BeamContext. The snippets
// state handle reaches the runtime through initialize_runtime instead of
// tauri managed state.

pub(crate) mod config;
pub mod db;
pub mod error;
pub mod helpers;
pub mod model;
pub mod repository;
pub mod runtime;

use beam_core::BeamContext;

use self::error::Result;
use self::model::{
    CreateSnippetPayload, Snippet, SnippetRuntimeSettings, SnippetStatusUpdatePayload,
    UpdateSnippetPayload, UpdateSnippetRuntimeSettingsPayload,
};
use self::repository::SnippetsRepository;

async fn sync_runtime(cx: &BeamContext) {
    if let Err(error) = runtime::refresh_runtime_state(cx).await {
        log::warn!("[snippets-runtime] failed to refresh runtime state: {error}");
    }
}

pub async fn get_snippets(cx: &BeamContext) -> Result<Vec<Snippet>> {
    SnippetsRepository::new().list_snippets(cx).await
}

pub async fn get_snippet_by_id(cx: &BeamContext, id: String) -> Result<Option<Snippet>> {
    SnippetsRepository::new().get_snippet_by_id(cx, &id).await
}

pub async fn create_snippet(cx: &BeamContext, payload: CreateSnippetPayload) -> Result<Snippet> {
    let snippet = SnippetsRepository::new()
        .create_snippet(cx, payload)
        .await?;
    sync_runtime(cx).await;
    Ok(snippet)
}

pub async fn update_snippet(cx: &BeamContext, payload: UpdateSnippetPayload) -> Result<Snippet> {
    let snippet = SnippetsRepository::new()
        .update_snippet(cx, payload)
        .await?;
    sync_runtime(cx).await;
    Ok(snippet)
}

pub async fn delete_snippet(cx: &BeamContext, id: String) -> Result<()> {
    SnippetsRepository::new().delete_snippet(cx, &id).await?;
    sync_runtime(cx).await;
    Ok(())
}

pub async fn set_snippet_enabled(
    cx: &BeamContext,
    payload: SnippetStatusUpdatePayload,
) -> Result<Snippet> {
    let snippet = SnippetsRepository::new()
        .set_snippet_enabled(cx, payload)
        .await?;
    sync_runtime(cx).await;
    Ok(snippet)
}

pub async fn increment_snippet_copied_count(cx: &BeamContext, snippet_id: String) -> Result<()> {
    SnippetsRepository::new()
        .increment_snippet_copied_count(cx, &snippet_id)
        .await?;
    sync_runtime(cx).await;
    Ok(())
}

pub async fn paste_snippet(cx: &BeamContext, snippet_id: String) -> Result<()> {
    runtime::paste_snippet(cx, &snippet_id).await?;
    sync_runtime(cx).await;
    Ok(())
}

pub async fn get_snippet_runtime_settings(cx: &BeamContext) -> Result<SnippetRuntimeSettings> {
    SnippetsRepository::new().get_runtime_settings(cx).await
}

pub async fn update_snippet_runtime_settings(
    cx: &BeamContext,
    payload: UpdateSnippetRuntimeSettingsPayload,
) -> Result<()> {
    SnippetsRepository::new()
        .update_runtime_settings(cx, payload)
        .await?;
    sync_runtime(cx).await;
    Ok(())
}
