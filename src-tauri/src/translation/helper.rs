use serde_json::Value;
use url::Url;

use crate::config::config;
use crate::http;

use crate::translation::error::{Error, Result};
use crate::translation::model::{
    DetectedLanguage, GoogleLanguagesResponse, TranslateTextRequest, TranslateTextResponse,
    TranslationLanguage,
};

#[derive(Debug, Clone)]
struct ValidatedTranslateRequest {
    q: String,
    source: String,
    target: String,
    format: String,
}

fn build_endpoint(base_url: &str, endpoint: &str) -> String {
    let normalized_base = base_url.trim_end_matches('/');
    let normalized_endpoint = endpoint.trim_start_matches('/');
    format!("{normalized_base}/{normalized_endpoint}")
}

fn build_url_with_params(endpoint: &str, params: &[(&str, &str)]) -> Result<String> {
    let mut url = Url::parse(endpoint).map_err(|error| {
        Error::RequestError(format!("invalid translation endpoint URL: {error}"))
    })?;

    {
        let mut query_pairs = url.query_pairs_mut();
        for (key, value) in params {
            query_pairs.append_pair(key, value);
        }
    }

    Ok(url.to_string())
}

fn truncate_for_error(input: &str, max_len: usize) -> String {
    if input.chars().count() <= max_len {
        return input.to_string();
    }

    input.chars().take(max_len).collect::<String>() + "..."
}

fn map_http_error(error: http::error::Error) -> Error {
    match error {
        http::error::Error::HttpRequestError(message) => {
            if message.to_ascii_lowercase().contains("timed out") {
                Error::TimeoutError(message)
            } else {
                Error::RequestError(message)
            }
        }
        http::error::Error::HttpResponseStatusError {
            url,
            status,
            status_text,
        } => Error::ApiStatusError {
            url,
            status,
            status_text,
            message: "unexpected upstream response status".to_string(),
        },
        http::error::Error::HttpResponseDecodeError(message) => Error::ParseError(message),
        http::error::Error::RequestTimeoutError(message) => Error::TimeoutError(message),
    }
}

fn parse_json_from_body<T: serde::de::DeserializeOwned>(body: &str) -> Result<T> {
    serde_json::from_str::<T>(body).map_err(|error| {
        Error::ParseError(format!(
            "{} (response body: {})",
            error,
            truncate_for_error(body, 220)
        ))
    })
}

fn is_auto_language(language_code: &str) -> bool {
    language_code
        .trim()
        .eq_ignore_ascii_case(config().TRANSLATION_AUTO_SOURCE_LANGUAGE)
}

fn normalize_language_code(language_code: &str) -> String {
    language_code.trim().to_string()
}

fn is_valid_language_code(language_code: &str) -> bool {
    let code = language_code.trim();

    if code.len() < 2 || code.len() > config().TRANSLATION_MAX_LANGUAGE_CODE_LENGTH {
        return false;
    }

    if code.starts_with('-') || code.ends_with('-') || code.contains("--") {
        return false;
    }

    code.chars()
        .all(|character| character.is_ascii_alphanumeric() || character == '-')
}

fn validate_translate_request(request: TranslateTextRequest) -> Result<ValidatedTranslateRequest> {
    let normalized_text = request.q.trim().to_string();
    if normalized_text.is_empty() {
        return Err(Error::InvalidInput("text (q) cannot be empty".to_string()));
    }

    let source = request
        .source
        .as_deref()
        .map(normalize_language_code)
        .filter(|source| !source.is_empty())
        .unwrap_or_else(|| config().TRANSLATION_AUTO_SOURCE_LANGUAGE.to_string());

    if !is_auto_language(&source) && !is_valid_language_code(&source) {
        return Err(Error::InvalidInput(format!(
            "source language code '{}' is invalid",
            source
        )));
    }

    let target = normalize_language_code(&request.target);
    if target.is_empty() {
        return Err(Error::InvalidInput(
            "target language code is required".to_string(),
        ));
    }

    if is_auto_language(&target) {
        return Err(Error::InvalidInput(
            "target language cannot be 'auto'".to_string(),
        ));
    }

    if !is_valid_language_code(&target) {
        return Err(Error::InvalidInput(format!(
            "target language code '{}' is invalid",
            target
        )));
    }

    let format = request
        .format
        .as_deref()
        .map(|format| format.trim().to_ascii_lowercase())
        .filter(|format| !format.is_empty())
        .unwrap_or_else(|| config().TRANSLATION_DEFAULT_FORMAT.to_string());

    if !matches!(format.as_str(), "text" | "html") {
        return Err(Error::InvalidInput(format!(
            "format '{}' is invalid. Supported values: text, html",
            format
        )));
    }

    Ok(ValidatedTranslateRequest {
        q: normalized_text,
        source,
        target,
        format,
    })
}

fn parse_google_translation_payload(
    payload: Value,
    source_language: &str,
) -> Result<TranslateTextResponse> {
    let Some(root) = payload.as_array() else {
        return Err(Error::ParseError(
            "google translation payload is not an array".to_string(),
        ));
    };

    let translated_text = root
        .first()
        .and_then(Value::as_array)
        .map(|segments| {
            segments
                .iter()
                .filter_map(|segment| segment.as_array())
                .filter_map(|segment| segment.first())
                .filter_map(Value::as_str)
                .collect::<String>()
        })
        .unwrap_or_default();

    if translated_text.trim().is_empty() {
        return Err(Error::ParseError(
            "google translation payload did not include translated text".to_string(),
        ));
    }

    let detected_language = if is_auto_language(source_language) {
        root.get(2)
            .and_then(Value::as_str)
            .map(normalize_language_code)
            .filter(|language| !language.is_empty())
            .map(|language| DetectedLanguage {
                language,
                confidence: None,
            })
    } else {
        None
    };

    Ok(TranslateTextResponse {
        translated_text,
        detected_language,
        alternatives: None,
    })
}

pub async fn get_translation_languages() -> Result<Vec<TranslationLanguage>> {
    let endpoint = build_endpoint(
        config().TRANSLATION_API_BASE_URL,
        config().TRANSLATION_LANGUAGES_ENDPOINT,
    );

    let url = build_url_with_params(&endpoint, &[("client", "webapp"), ("hl", "en")])?;

    let body = http::get_async_with_timeout(&url, config().TRANSLATION_HTTP_TIMEOUT_SECS)
        .await
        .map_err(map_http_error)?;

    let payload: GoogleLanguagesResponse = parse_json_from_body(&body)?;

    let mut languages = payload
        .sl
        .into_iter()
        .filter_map(|(code, name)| {
            let normalized_code = normalize_language_code(&code);
            let normalized_name = name.trim().to_string();

            if normalized_code.is_empty()
                || normalized_name.is_empty()
                || is_auto_language(&normalized_code)
                || !is_valid_language_code(&normalized_code)
            {
                return None;
            }

            Some(TranslationLanguage {
                code: normalized_code,
                name: normalized_name,
                targets: Vec::new(),
            })
        })
        .collect::<Vec<_>>();

    if languages.is_empty() {
        return Err(Error::ParseError(
            "google language list is empty".to_string(),
        ));
    }

    languages.sort_by(|left, right| {
        left.name
            .to_ascii_lowercase()
            .cmp(&right.name.to_ascii_lowercase())
    });

    Ok(languages)
}

pub async fn translate_text(request: TranslateTextRequest) -> Result<TranslateTextResponse> {
    let validated_request = validate_translate_request(request)?;

    let endpoint = build_endpoint(
        config().TRANSLATION_API_BASE_URL,
        config().TRANSLATION_TRANSLATE_ENDPOINT,
    );

    let url = build_url_with_params(
        &endpoint,
        &[
            ("client", "gtx"),
            ("sl", validated_request.source.as_str()),
            ("tl", validated_request.target.as_str()),
            ("dt", "t"),
            ("format", validated_request.format.as_str()),
            ("q", validated_request.q.as_str()),
        ],
    )?;

    let body = http::get_async_with_timeout(&url, config().TRANSLATION_HTTP_TIMEOUT_SECS)
        .await
        .map_err(map_http_error)?;

    let payload: Value = parse_json_from_body(&body)?;
    parse_google_translation_payload(payload, &validated_request.source)
}
