use base64::{engine::general_purpose::STANDARD, Engine as _};
use futures_util::StreamExt;
use rig::completion::{CompletionModel, GetTokenUsage, Usage};
use rig::prelude::CompletionClient;
use rig::providers::{anthropic, gemini, openai, openrouter};
use rig::streaming::StreamedAssistantContent;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};

use super::attachments;
use super::context::{ContextCompactionRequest, ContextManager};
use super::error::{AiError, Result};
use super::key_store::{
    clear_provider_api_key, get_provider_api_key, infer_provider_from_model, is_provider_key_set,
    providers, resolve_provider, set_provider_api_key, AiProvider,
};
use super::model::{
    AiChatHistoryMessage, AiConversationSummary, AiSettings, AiTokenUsageSummary, AskAttachment,
    AskOptions,
};
use super::repository::AiRepository;
use crate::config::config;

fn get_settings_path(app: &tauri::AppHandle) -> Result<PathBuf> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| AiError::AppDataDirUnavailable)?;

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)?;
    }

    Ok(data_dir.join(config().AI_SETTINGS_FILE))
}

fn read_settings(path: &Path) -> Result<AiSettings> {
    if !path.exists() {
        return Ok(AiSettings::default());
    }

    let content = fs::read_to_string(path)?;
    if content.trim().is_empty() {
        return Ok(AiSettings::default());
    }

    serde_json::from_str(&content).map_err(AiError::from)
}

fn write_settings(path: &Path, settings: &AiSettings) -> Result<()> {
    let content = serde_json::to_string_pretty(settings)?;
    fs::write(path, content)?;
    Ok(())
}

fn resolve_requested_model(options: &AskOptions, settings: &AiSettings) -> Option<String> {
    let provided = options.model.as_ref()?.trim();
    if provided.is_empty() {
        return None;
    }

    if let Some(mapped) = options
        .model_mappings
        .as_ref()
        .and_then(|mappings| mappings.get(provided))
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        return Some(mapped.to_string());
    }

    if let Some(mapped) = settings
        .model_associations
        .get(provided)
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        return Some(mapped.to_string());
    }

    Some(provided.to_string())
}

fn emit_stream_chunk(app_handle: &AppHandle, request_id: &str, text: &str) -> Result<()> {
    app_handle
        .emit(
            "ai-stream-chunk",
            serde_json::json!({
                "requestId": request_id,
                "text": text,
            }),
        )
        .map_err(|error| AiError::EventEmit(error.to_string()))
}

fn emit_stream_end(app_handle: &AppHandle, request_id: &str, full_text: &str) -> Result<()> {
    app_handle
        .emit(
            "ai-stream-end",
            serde_json::json!({
                "requestId": request_id,
                "fullText": full_text,
            }),
        )
        .map_err(|error| AiError::EventEmit(error.to_string()))
}

fn emit_stream_error(app_handle: &AppHandle, request_id: &str, error: &str) -> Result<()> {
    app_handle
        .emit(
            "ai-stream-error",
            serde_json::json!({
                "requestId": request_id,
                "error": error,
            }),
        )
        .map_err(|emit_error| AiError::EventEmit(emit_error.to_string()))
}

struct StreamOutcome {
    full_text: String,
    usage: Option<Usage>,
}

async fn collect_model_output<M: CompletionModel, FChunk>(
    prompt_message: rig::message::Message,
    model: M,
    additional_params: Option<serde_json::Value>,
    mut on_text_chunk: FChunk,
) -> Result<StreamOutcome>
where
    FChunk: FnMut(&str) -> Result<()>,
{
    let request_builder = model.completion_request(prompt_message);
    let request_builder = if let Some(params) = additional_params {
        request_builder.additional_params(params)
    } else {
        request_builder
    };

    let mut stream = request_builder
        .stream()
        .await
        .map_err(|error| AiError::Provider(error.to_string()))?;
    let mut full_text = String::new();
    let mut usage = None;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|error| AiError::Provider(error.to_string()))?;

        match chunk {
            StreamedAssistantContent::Text(text_chunk) => {
                let text = text_chunk.text;
                if text.is_empty() {
                    continue;
                }

                full_text.push_str(&text);
                on_text_chunk(&text)?;
            }
            StreamedAssistantContent::Final(final_response) => {
                usage = final_response.token_usage();
            }
            _ => {}
        }
    }

    Ok(StreamOutcome { full_text, usage })
}

fn openai_additional_params(model_name: &str) -> Option<serde_json::Value> {
    if model_name == config().AI_DEFAULT_OPENAI_MODEL {
        Some(serde_json::json!({
            "reasoning": {
                "effort": config().AI_DEFAULT_OPENAI_REASONING_EFFORT
            }
        }))
    } else {
        None
    }
}

async fn run_provider_completion<FChunk>(
    provider: AiProvider,
    api_key: &str,
    model_name: &str,
    prompt_message: rig::message::Message,
    on_text_chunk: FChunk,
) -> Result<StreamOutcome>
where
    FChunk: FnMut(&str) -> Result<()>,
{
    match provider {
        AiProvider::OpenRouter => {
            let client: openrouter::Client = openrouter::Client::new(api_key)
                .map_err(|error| AiError::Provider(error.to_string()))?;
            let model = client.completion_model(model_name);
            collect_model_output(prompt_message, model, None, on_text_chunk).await
        }
        AiProvider::OpenAI => {
            let client: openai::Client = openai::Client::new(api_key)
                .map_err(|error| AiError::Provider(error.to_string()))?;
            let model = client.completion_model(model_name);
            collect_model_output(
                prompt_message,
                model,
                openai_additional_params(model_name),
                on_text_chunk,
            )
            .await
        }
        AiProvider::Anthropic => {
            let client: anthropic::Client = anthropic::Client::new(api_key)
                .map_err(|error| AiError::Provider(error.to_string()))?;
            let model = client.completion_model(model_name);
            collect_model_output(prompt_message, model, None, on_text_chunk).await
        }
        AiProvider::Gemini => {
            let client: gemini::Client = gemini::Client::new(api_key)
                .map_err(|error| AiError::Provider(error.to_string()))?;
            let model = client.completion_model(model_name);
            collect_model_output(prompt_message, model, None, on_text_chunk).await
        }
    }
}

async fn maybe_compact_context(
    app_handle: &AppHandle,
    context_manager: &ContextManager,
    provider: AiProvider,
    model_name: &str,
    api_key: &str,
    conversation_id: &str,
    compaction_request: ContextCompactionRequest,
) -> Result<()> {
    let summary_message = rig::message::Message::user(compaction_request.summary_prompt);
    let summary_outcome =
        run_provider_completion(provider, api_key, model_name, summary_message, |_| Ok(())).await?;
    let summary_text = summary_outcome.full_text.trim();

    if summary_text.is_empty() {
        return Ok(());
    }

    context_manager
        .persist_compaction_summary(
            app_handle,
            conversation_id,
            summary_text,
            compaction_request.summarized_until_created_at,
        )
        .await?;

    if let Some(usage) = summary_outcome.usage {
        AiRepository::new()
            .save_usage_record(
                app_handle,
                &compaction_request.summary_request_id,
                Some(conversation_id),
                provider.id(),
                model_name,
                usage,
            )
            .await?;
    }

    Ok(())
}

pub fn get_ai_settings(app: tauri::AppHandle) -> Result<AiSettings> {
    let path = get_settings_path(&app)?;
    read_settings(&path)
}

pub fn set_ai_settings(app: tauri::AppHandle, settings: AiSettings) -> Result<()> {
    let path = get_settings_path(&app)?;
    write_settings(&path, &settings)
}

pub async fn get_ai_chat_history(
    app: tauri::AppHandle,
    conversation_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<AiChatHistoryMessage>> {
    let repository = AiRepository::new();
    let messages = repository
        .get_chat_history(&app, conversation_id.as_deref(), limit)
        .await?;

    if messages.is_empty() {
        return Ok(Vec::new());
    }

    let attachments = repository
        .get_message_attachments(&app, conversation_id.as_deref())
        .await?;
    let message_id_set: HashSet<&str> =
        messages.iter().map(|message| message.id.as_str()).collect();

    let mut attachments_by_message: HashMap<String, Vec<AskAttachment>> = HashMap::new();
    for attachment in attachments {
        if !message_id_set.contains(attachment.message_id.as_str()) {
            continue;
        }

        if let Some(data_url) =
            load_attachment_data_url(&app, &attachment.storage_path, &attachment.mime_type)
        {
            attachments_by_message
                .entry(attachment.message_id)
                .or_default()
                .push(AskAttachment {
                    id: Some(attachment.id),
                    name: Some(attachment.name),
                    mime_type: Some(attachment.mime_type),
                    size: Some(attachment.size_bytes.max(0) as usize),
                    data: data_url,
                });
        }
    }

    let history_messages = messages
        .into_iter()
        .map(|message| {
            let persisted_attachments = attachments_by_message.remove(&message.id);
            let attachments = if persisted_attachments.is_some() {
                persisted_attachments
            } else {
                parse_legacy_attachments_json(message.attachments_json.as_deref())
            };

            AiChatHistoryMessage {
                id: message.id,
                request_id: message.request_id,
                conversation_id: message.conversation_id,
                role: message.role,
                provider: message.provider,
                model: message.model,
                content: message.content,
                attachments_json: message.attachments_json,
                attachments,
                created_at: message.created_at,
            }
        })
        .collect();

    Ok(history_messages)
}

fn load_attachment_data_url(
    app: &tauri::AppHandle,
    storage_path: &str,
    mime_type: &str,
) -> Option<String> {
    let app_data_dir = app.path().app_local_data_dir().ok()?;
    let absolute_path = app_data_dir.join(storage_path);
    let bytes = fs::read(absolute_path).ok()?;
    let encoded = STANDARD.encode(bytes);
    Some(format!("data:{mime_type};base64,{encoded}"))
}

fn parse_legacy_attachments_json(raw: Option<&str>) -> Option<Vec<AskAttachment>> {
    let payload = raw?.trim();
    if payload.is_empty() {
        return None;
    }

    serde_json::from_str::<Vec<AskAttachment>>(payload)
        .ok()
        .filter(|attachments| !attachments.is_empty())
}

pub async fn get_ai_conversations(
    app: tauri::AppHandle,
    limit: Option<u32>,
) -> Result<Vec<AiConversationSummary>> {
    AiRepository::new().get_conversations(&app, limit).await
}

pub async fn clear_ai_chat_history(
    app: tauri::AppHandle,
    conversation_id: Option<String>,
) -> Result<()> {
    AiRepository::new()
        .clear_chat_history(&app, conversation_id.as_deref())
        .await
}

pub async fn get_ai_token_usage_summary(
    app: tauri::AppHandle,
    conversation_id: Option<String>,
) -> Result<AiTokenUsageSummary> {
    AiRepository::new()
        .get_token_usage_summary(&app, conversation_id.as_deref())
        .await
}

pub fn set_ai_api_key(key: String, provider_id: Option<String>) -> Result<()> {
    if key.trim().is_empty() {
        return Err(AiError::EmptyApiKey);
    }

    let provider = resolve_provider(provider_id.as_deref())?;
    set_provider_api_key(provider, &key)
}

pub fn is_ai_api_key_set(provider_id: Option<String>) -> Result<bool> {
    let provider = resolve_provider(provider_id.as_deref())?;
    is_provider_key_set(provider)
}

pub fn clear_ai_api_key(provider_id: Option<String>) -> Result<()> {
    let provider = resolve_provider(provider_id.as_deref())?;
    clear_provider_api_key(provider)
}

pub fn ai_can_access(app: tauri::AppHandle, provider_id: Option<String>) -> Result<bool> {
    let settings = get_ai_settings(app)?;
    if !settings.enabled {
        return Ok(false);
    }

    if let Some(provider) = provider_id {
        return is_ai_api_key_set(Some(provider));
    }

    for provider in providers() {
        if is_provider_key_set(provider)? {
            return Ok(true);
        }
    }

    Ok(false)
}

pub async fn ai_ask_stream(
    app_handle: AppHandle,
    request_id: String,
    prompt: String,
    options: AskOptions,
) -> Result<()> {
    let settings = get_ai_settings(app_handle.clone())?;
    if !settings.enabled {
        emit_stream_error(
            &app_handle,
            &request_id,
            &AiError::AccessDisabled.to_string(),
        )?;
        return Ok(());
    }

    let resolved_model = resolve_requested_model(&options, &settings);
    let provider = options
        .provider
        .as_deref()
        .and_then(AiProvider::from_raw)
        .or_else(|| resolved_model.as_deref().map(infer_provider_from_model))
        .unwrap_or(AiProvider::OpenRouter);
    let model_name = resolved_model.unwrap_or_else(|| provider.default_model().to_string());

    let api_key = match get_provider_api_key(provider) {
        Ok(value) => value,
        Err(error) => {
            emit_stream_error(&app_handle, &request_id, &error.to_string())?;
            return Ok(());
        }
    };

    let context_manager = ContextManager::new();
    let mut context_preparation = match context_manager
        .prepare_context_prompt(
            &app_handle,
            provider,
            options.conversation_id.as_deref(),
            &prompt,
        )
        .await
    {
        Ok(value) => value,
        Err(error) => {
            emit_stream_error(&app_handle, &request_id, &error.to_string())?;
            return Ok(());
        }
    };

    for _ in 0..config().AI_CONTEXT_MAX_COMPACTION_PASSES {
        let Some(compaction_request) = context_preparation.compaction_request.take() else {
            break;
        };

        if let Err(error) = maybe_compact_context(
            &app_handle,
            &context_manager,
            provider,
            &model_name,
            &api_key,
            &context_preparation.conversation_id,
            compaction_request,
        )
        .await
        {
            emit_stream_error(&app_handle, &request_id, &error.to_string())?;
            return Ok(());
        }

        context_preparation = match context_manager
            .prepare_context_prompt(
                &app_handle,
                provider,
                Some(&context_preparation.conversation_id),
                &prompt,
            )
            .await
        {
            Ok(value) => value,
            Err(error) => {
                emit_stream_error(&app_handle, &request_id, &error.to_string())?;
                return Ok(());
            }
        };
    }

    let prompt_message = match attachments::build_prompt_message(
        &context_preparation.prompt_text,
        options.attachments.as_ref(),
        provider,
    ) {
        Ok(message) => message,
        Err(error) => {
            emit_stream_error(&app_handle, &request_id, &error.to_string())?;
            return Ok(());
        }
    };

    if let Err(error) = AiRepository::new()
        .save_user_message(
            &app_handle,
            &request_id,
            Some(&context_preparation.conversation_id),
            provider.id(),
            &model_name,
            &prompt,
            options.attachments.as_deref(),
        )
        .await
    {
        emit_stream_error(&app_handle, &request_id, &error.to_string())?;
        return Ok(());
    }

    let stream_result =
        run_provider_completion(provider, &api_key, &model_name, prompt_message, |text| {
            emit_stream_chunk(&app_handle, &request_id, text)
        })
        .await;

    let stream_outcome = match stream_result {
        Ok(value) => value,
        Err(error) => {
            emit_stream_error(&app_handle, &request_id, &error.to_string())?;
            return Ok(());
        }
    };

    if let Err(error) = AiRepository::new()
        .save_assistant_message_and_usage(
            &app_handle,
            &request_id,
            Some(&context_preparation.conversation_id),
            provider.id(),
            &model_name,
            &stream_outcome.full_text,
            stream_outcome.usage,
        )
        .await
    {
        emit_stream_error(&app_handle, &request_id, &error.to_string())?;
        return Ok(());
    }

    emit_stream_end(&app_handle, &request_id, &stream_outcome.full_text)?;

    Ok(())
}
