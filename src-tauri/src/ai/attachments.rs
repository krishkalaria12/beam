use base64::{engine::general_purpose::STANDARD, Engine as _};
use rig::message::{
    Document, DocumentMediaType, DocumentSourceKind, Image, ImageDetail, ImageMediaType, Message,
    UserContent,
};
use rig::OneOrMany;

use crate::config::config;

use super::error::{AiError, Result};
use super::key_store::AiProvider;
use super::model::AskAttachment;

struct ParsedAttachment {
    name: String,
    mime_type: Option<String>,
    base64_data: String,
    decoded_bytes: Vec<u8>,
}

fn attachment_label(attachment: &AskAttachment, index: usize) -> String {
    if let Some(name) = attachment
        .name
        .as_ref()
        .map(|v| v.trim())
        .filter(|v| !v.is_empty())
    {
        return name.to_string();
    }
    if let Some(id) = attachment
        .id
        .as_ref()
        .map(|v| v.trim())
        .filter(|v| !v.is_empty())
    {
        return format!("attachment-{id}");
    }
    format!("attachment-{}", index + 1)
}

fn parse_data_url(input: &str) -> Option<(Option<String>, String, bool)> {
    let body = input.strip_prefix("data:")?;
    let (meta, payload) = body.split_once(',')?;

    let mut mime_type: Option<String> = None;
    let mut is_base64 = false;

    for token in meta.split(';') {
        let cleaned = token.trim();
        if cleaned.is_empty() {
            continue;
        }
        if cleaned.eq_ignore_ascii_case("base64") {
            is_base64 = true;
            continue;
        }
        if mime_type.is_none() && cleaned.contains('/') {
            mime_type = Some(cleaned.to_ascii_lowercase());
        }
    }

    Some((mime_type, payload.to_string(), is_base64))
}

fn normalize_base64(input: &str) -> String {
    input.chars().filter(|c| !c.is_ascii_whitespace()).collect()
}

fn parse_attachment(attachment: &AskAttachment, index: usize) -> Result<ParsedAttachment> {
    let name = attachment_label(attachment, index);
    let raw_data = attachment.data.trim();

    if raw_data.is_empty() {
        return Err(AiError::InvalidAttachment(format!("{name}: empty payload")));
    }

    let (mime_type, raw_base64, is_base64_data_url) = match parse_data_url(raw_data) {
        Some((detected_mime, payload, is_base64)) => {
            let fallback = attachment
                .mime_type
                .as_ref()
                .map(|v| v.trim())
                .filter(|v| !v.is_empty())
                .map(|v| v.to_ascii_lowercase());
            (detected_mime.or(fallback), payload, is_base64)
        }
        None => {
            let mime = attachment
                .mime_type
                .as_ref()
                .map(|v| v.trim())
                .filter(|v| !v.is_empty())
                .map(|v| v.to_ascii_lowercase());
            (mime, raw_data.to_string(), true)
        }
    };

    if !is_base64_data_url {
        return Err(AiError::InvalidAttachment(format!(
            "{name}: only base64 data URLs are supported"
        )));
    }

    let base64_data = normalize_base64(&raw_base64);
    if base64_data.is_empty() {
        return Err(AiError::InvalidAttachment(format!(
            "{name}: empty base64 payload"
        )));
    }

    if base64_data.len() > config().AI_MAX_ATTACHMENT_BASE64_BYTES {
        return Err(AiError::InvalidAttachment(format!(
            "{name}: attachment exceeds maximum size"
        )));
    }

    let decoded_bytes = STANDARD
        .decode(&base64_data)
        .map_err(|_| AiError::InvalidAttachment(format!("{name}: invalid base64 payload")))?;

    if let Some(expected_size) = attachment.size {
        let tolerance = 16usize;
        if decoded_bytes.len().abs_diff(expected_size) > tolerance {
            return Err(AiError::InvalidAttachment(format!(
                "{name}: declared size does not match payload"
            )));
        }
    }

    Ok(ParsedAttachment {
        name,
        mime_type,
        base64_data,
        decoded_bytes,
    })
}

fn map_image_media_type(mime_type: Option<&str>, name: &str) -> Option<ImageMediaType> {
    let normalized = mime_type
        .map(|v| v.trim().to_ascii_lowercase())
        .or_else(|| {
            let lowered = name.to_ascii_lowercase();
            if lowered.ends_with(".jpg") || lowered.ends_with(".jpeg") {
                Some("image/jpeg".to_string())
            } else if lowered.ends_with(".png") {
                Some("image/png".to_string())
            } else if lowered.ends_with(".gif") {
                Some("image/gif".to_string())
            } else if lowered.ends_with(".webp") {
                Some("image/webp".to_string())
            } else if lowered.ends_with(".heic") {
                Some("image/heic".to_string())
            } else if lowered.ends_with(".heif") {
                Some("image/heif".to_string())
            } else if lowered.ends_with(".svg") {
                Some("image/svg+xml".to_string())
            } else {
                None
            }
        })?;

    match normalized.as_str() {
        "image/jpeg" | "image/jpg" => Some(ImageMediaType::JPEG),
        "image/png" => Some(ImageMediaType::PNG),
        "image/gif" => Some(ImageMediaType::GIF),
        "image/webp" => Some(ImageMediaType::WEBP),
        "image/heic" => Some(ImageMediaType::HEIC),
        "image/heif" => Some(ImageMediaType::HEIF),
        "image/svg+xml" => Some(ImageMediaType::SVG),
        _ => None,
    }
}

fn map_document_media_type(mime_type: Option<&str>, name: &str) -> Option<DocumentMediaType> {
    let normalized = mime_type
        .map(|v| v.trim().to_ascii_lowercase())
        .or_else(|| {
            let lowered = name.to_ascii_lowercase();
            if lowered.ends_with(".pdf") {
                Some("application/pdf".to_string())
            } else if lowered.ends_with(".txt") {
                Some("text/plain".to_string())
            } else if lowered.ends_with(".rtf") {
                Some("application/rtf".to_string())
            } else if lowered.ends_with(".html") || lowered.ends_with(".htm") {
                Some("text/html".to_string())
            } else if lowered.ends_with(".css") {
                Some("text/css".to_string())
            } else if lowered.ends_with(".md") || lowered.ends_with(".markdown") {
                Some("text/markdown".to_string())
            } else if lowered.ends_with(".csv") {
                Some("text/csv".to_string())
            } else if lowered.ends_with(".xml") {
                Some("application/xml".to_string())
            } else if lowered.ends_with(".js") || lowered.ends_with(".mjs") {
                Some("application/javascript".to_string())
            } else if lowered.ends_with(".py") {
                Some("text/x-python".to_string())
            } else {
                None
            }
        })?;

    match normalized.as_str() {
        "application/pdf" => Some(DocumentMediaType::PDF),
        "text/plain" => Some(DocumentMediaType::TXT),
        "application/rtf" | "text/rtf" => Some(DocumentMediaType::RTF),
        "text/html" => Some(DocumentMediaType::HTML),
        "text/css" => Some(DocumentMediaType::CSS),
        "text/markdown" | "text/x-markdown" => Some(DocumentMediaType::MARKDOWN),
        "text/csv" => Some(DocumentMediaType::CSV),
        "application/xml" | "text/xml" => Some(DocumentMediaType::XML),
        "application/javascript" | "text/javascript" => Some(DocumentMediaType::Javascript),
        "text/x-python" | "text/python" | "application/x-python-code" => {
            Some(DocumentMediaType::Python)
        }
        _ => None,
    }
}

fn to_openai_document_content(
    name: &str,
    media_type: &DocumentMediaType,
    decoded_bytes: Vec<u8>,
) -> Result<UserContent> {
    if matches!(media_type, DocumentMediaType::PDF) {
        return Err(AiError::UnsupportedAttachmentType(format!(
            "{name}: OpenAI document upload via Rig supports text documents only; use OpenRouter/Gemini/Anthropic for PDFs"
        )));
    }

    let text = String::from_utf8(decoded_bytes).map_err(|_| {
        AiError::InvalidAttachment(format!(
            "{name}: document must be UTF-8 text for OpenAI provider"
        ))
    })?;

    Ok(UserContent::text(format!("Document ({name})\n{text}")))
}

fn to_anthropic_document_content(
    name: &str,
    media_type: DocumentMediaType,
    base64_data: String,
    decoded_bytes: Vec<u8>,
) -> Result<UserContent> {
    match media_type {
        DocumentMediaType::PDF => Ok(UserContent::Document(Document {
            data: DocumentSourceKind::Base64(base64_data),
            media_type: Some(DocumentMediaType::PDF),
            additional_params: None,
        })),
        _ => {
            let text = String::from_utf8(decoded_bytes).map_err(|_| {
                AiError::InvalidAttachment(format!(
                    "{name}: Anthropic text documents must be UTF-8"
                ))
            })?;
            Ok(UserContent::Document(Document {
                data: DocumentSourceKind::String(text),
                media_type: Some(DocumentMediaType::TXT),
                additional_params: None,
            }))
        }
    }
}

fn to_document_user_content(provider: AiProvider, parsed: ParsedAttachment) -> Result<UserContent> {
    let media_type = map_document_media_type(parsed.mime_type.as_deref(), &parsed.name)
        .ok_or_else(|| {
            AiError::UnsupportedAttachmentType(format!(
                "{}: unsupported document type",
                parsed.name
            ))
        })?;

    match provider {
        AiProvider::OpenAI => {
            to_openai_document_content(&parsed.name, &media_type, parsed.decoded_bytes)
        }
        AiProvider::Anthropic => to_anthropic_document_content(
            &parsed.name,
            media_type,
            parsed.base64_data,
            parsed.decoded_bytes,
        ),
        AiProvider::Gemini => {
            if media_type.is_code() {
                return Err(AiError::UnsupportedAttachmentType(format!(
                    "{}: Gemini does not support code document media types",
                    parsed.name
                )));
            }
            Ok(UserContent::Document(Document {
                data: DocumentSourceKind::Base64(parsed.base64_data),
                media_type: Some(media_type),
                additional_params: None,
            }))
        }
        AiProvider::OpenRouter => Ok(UserContent::Document(Document {
            data: DocumentSourceKind::Base64(parsed.base64_data),
            media_type: Some(media_type),
            additional_params: None,
        })),
    }
}

fn to_user_content(provider: AiProvider, parsed: ParsedAttachment) -> Result<UserContent> {
    if let Some(image_media_type) = map_image_media_type(parsed.mime_type.as_deref(), &parsed.name)
    {
        return Ok(UserContent::Image(Image {
            data: DocumentSourceKind::Base64(parsed.base64_data),
            media_type: Some(image_media_type),
            detail: Some(ImageDetail::Auto),
            additional_params: None,
        }));
    }

    if let Some(mime_type) = parsed.mime_type.as_ref() {
        if mime_type.starts_with("image/") {
            return Err(AiError::UnsupportedAttachmentType(format!(
                "{}: unsupported image type {mime_type}",
                parsed.name
            )));
        }
    }

    to_document_user_content(provider, parsed)
}

pub fn build_prompt_message(
    prompt: &str,
    attachments: Option<&Vec<AskAttachment>>,
    provider: AiProvider,
) -> Result<Message> {
    let Some(attachments) = attachments else {
        return Ok(Message::user(prompt.to_string()));
    };

    if attachments.is_empty() {
        return Ok(Message::user(prompt.to_string()));
    }

    if attachments.len() > config().AI_MAX_ATTACHMENTS {
        return Err(AiError::InvalidAttachment(format!(
            "Too many attachments. Maximum allowed is {}",
            config().AI_MAX_ATTACHMENTS
        )));
    }

    let mut content = vec![UserContent::text(prompt.to_string())];

    for (index, attachment) in attachments.iter().enumerate() {
        let parsed = parse_attachment(attachment, index)?;
        content.push(to_user_content(provider, parsed)?);
    }

    let content = OneOrMany::many(content).map_err(|_| {
        AiError::InvalidAttachment("Failed to build multimodal request content".to_string())
    })?;

    Ok(Message::User { content })
}
