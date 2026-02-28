use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::RngCore;
use reqwest::{Client, StatusCode};
use serde::de::DeserializeOwned;
use serde_json::Value;
use sha2::{Digest, Sha256};
use url::Url;

use crate::config::config;

use super::error::{Result, SpotifyError};
use super::model::{
    SpotifyCreateAuthSessionRequest, SpotifyCreateAuthSessionResponse, SpotifyExchangeCodeRequest,
    SpotifyPlaybackActionRequest, SpotifyRefreshTokenRequest, SpotifySearchRequest,
    SpotifyTokenResponse,
};

#[derive(Debug, Clone)]
struct ValidatedAuthSessionRequest {
    client_id: String,
    redirect_uri: String,
    scopes: Vec<String>,
    state: String,
    show_dialog: bool,
}

#[derive(Debug, Clone)]
struct ValidatedExchangeCodeRequest {
    client_id: String,
    code: String,
    redirect_uri: String,
    code_verifier: String,
}

#[derive(Debug, Clone)]
struct ValidatedRefreshRequest {
    client_id: String,
    refresh_token: String,
}

#[derive(Debug, Clone)]
struct ValidatedAccessToken {
    access_token: String,
}

#[derive(Debug, Clone)]
struct ValidatedSearchRequest {
    access_token: String,
    query: String,
    types: Vec<String>,
    market: Option<String>,
    limit: u8,
    offset: u32,
    include_external: Option<String>,
}

fn build_http_client() -> Result<Client> {
    Client::builder()
        .timeout(std::time::Duration::from_secs(
            config().SPOTIFY_HTTP_TIMEOUT_SECS,
        ))
        .build()
        .map_err(|error| SpotifyError::RequestError(error.to_string()))
}

fn build_endpoint(base_url: &str, endpoint: &str) -> String {
    let normalized_base = base_url.trim_end_matches('/');
    let normalized_endpoint = endpoint.trim_start_matches('/');
    format!("{normalized_base}/{normalized_endpoint}")
}

fn build_url_with_params(endpoint: &str, params: &[(&str, &str)]) -> Result<String> {
    let mut url = Url::parse(endpoint)
        .map_err(|error| SpotifyError::RequestError(format!("invalid endpoint URL: {error}")))?;

    {
        let mut query_pairs = url.query_pairs_mut();
        for (key, value) in params {
            query_pairs.append_pair(key, value);
        }
    }

    Ok(url.to_string())
}

fn encode_form_body(params: &[(&str, &str)]) -> String {
    let mut serializer = url::form_urlencoded::Serializer::new(String::new());
    for (key, value) in params {
        serializer.append_pair(key, value);
    }

    serializer.finish()
}

fn with_optional_device_id(endpoint: &str, device_id: Option<&str>) -> Result<String> {
    if let Some(device_id) = device_id {
        return build_url_with_params(endpoint, &[("device_id", device_id)]);
    }

    Ok(endpoint.to_string())
}

fn normalize_non_empty(value: &str, field_name: &str) -> Result<String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err(SpotifyError::InvalidInput(format!(
            "{field_name} cannot be empty"
        )));
    }

    Ok(normalized.to_string())
}

fn validate_redirect_uri(redirect_uri: &str) -> Result<String> {
    let normalized = normalize_non_empty(redirect_uri, "redirect_uri")?;
    Url::parse(&normalized)
        .map_err(|error| SpotifyError::InvalidInput(format!("redirect_uri is invalid: {error}")))?;

    Ok(normalized)
}

fn normalize_scope(scope: &str) -> Option<String> {
    let normalized = scope.trim();
    if normalized.is_empty() {
        return None;
    }

    Some(normalized.to_string())
}

fn normalize_scopes(scopes: Option<Vec<String>>) -> Vec<String> {
    let raw_scopes = scopes.unwrap_or_default();
    let mut normalized_scopes = Vec::new();

    if raw_scopes.is_empty() {
        normalized_scopes.extend(
            config()
                .SPOTIFY_DEFAULT_SCOPES
                .iter()
                .filter_map(|scope| normalize_scope(scope)),
        );
    } else {
        for scope in raw_scopes {
            if let Some(normalized_scope) = normalize_scope(&scope) {
                normalized_scopes.push(normalized_scope);
            }
        }
    }

    normalized_scopes.sort();
    normalized_scopes.dedup();
    normalized_scopes
}

fn generate_random_token(byte_len: usize) -> String {
    let mut bytes = vec![0_u8; byte_len];
    rand::rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn build_pkce_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}

fn parse_api_error_message(body: &str) -> String {
    let normalized_body = body.trim();

    if normalized_body.is_empty() {
        return "empty response body".to_string();
    }

    if let Ok(parsed) = serde_json::from_str::<Value>(normalized_body) {
        if let Some(error_description) = parsed.get("error_description").and_then(Value::as_str) {
            return error_description.to_string();
        }

        if let Some(error_value) = parsed.get("error") {
            if let Some(error_message) = error_value.get("message").and_then(Value::as_str) {
                return error_message.to_string();
            }

            if let Some(error_message) = error_value.as_str() {
                return error_message.to_string();
            }
        }

        if let Some(message) = parsed.get("message").and_then(Value::as_str) {
            return message.to_string();
        }
    }

    normalized_body.chars().take(220).collect::<String>()
}

fn to_api_status_error(status: StatusCode, url: String, body: String) -> SpotifyError {
    SpotifyError::ApiStatusError {
        url,
        status: status.as_u16(),
        status_text: status
            .canonical_reason()
            .unwrap_or("unknown http status")
            .to_string(),
        message: parse_api_error_message(&body),
    }
}

async fn parse_json_response<T: DeserializeOwned>(response: reqwest::Response) -> Result<T> {
    let status = response.status();
    let response_url = response.url().to_string();
    let body = response
        .text()
        .await
        .map_err(|error| SpotifyError::RequestError(error.to_string()))?;

    if !status.is_success() {
        return Err(to_api_status_error(status, response_url, body));
    }

    serde_json::from_str::<T>(&body).map_err(|error| {
        SpotifyError::ParseError(format!(
            "{} (response body: {})",
            error,
            body.chars().take(220).collect::<String>()
        ))
    })
}

async fn parse_optional_json_response(response: reqwest::Response) -> Result<Option<Value>> {
    let status = response.status();
    let response_url = response.url().to_string();

    if status == StatusCode::NO_CONTENT {
        return Ok(None);
    }

    let body = response
        .text()
        .await
        .map_err(|error| SpotifyError::RequestError(error.to_string()))?;

    if !status.is_success() {
        return Err(to_api_status_error(status, response_url, body));
    }

    let parsed = serde_json::from_str::<Value>(&body).map_err(|error| {
        SpotifyError::ParseError(format!(
            "{} (response body: {})",
            error,
            body.chars().take(220).collect::<String>()
        ))
    })?;

    Ok(Some(parsed))
}

async fn ensure_success_response(response: reqwest::Response) -> Result<()> {
    let status = response.status();
    let response_url = response.url().to_string();

    if status.is_success() {
        return Ok(());
    }

    let body = response
        .text()
        .await
        .map_err(|error| SpotifyError::RequestError(error.to_string()))?;

    Err(to_api_status_error(status, response_url, body))
}

fn validate_auth_session_request(
    request: SpotifyCreateAuthSessionRequest,
) -> Result<ValidatedAuthSessionRequest> {
    let client_id = normalize_non_empty(&request.client_id, "client_id")?;
    let redirect_uri = validate_redirect_uri(&request.redirect_uri)?;
    let scopes = normalize_scopes(request.scopes);

    let state = request
        .state
        .as_deref()
        .and_then(normalize_scope)
        .unwrap_or_else(|| generate_random_token(config().SPOTIFY_STATE_RANDOM_BYTES));

    Ok(ValidatedAuthSessionRequest {
        client_id,
        redirect_uri,
        scopes,
        state,
        show_dialog: request.show_dialog.unwrap_or(false),
    })
}

fn validate_exchange_code_request(
    request: SpotifyExchangeCodeRequest,
) -> Result<ValidatedExchangeCodeRequest> {
    let client_id = normalize_non_empty(&request.client_id, "client_id")?;
    let code = normalize_non_empty(&request.code, "code")?;
    let redirect_uri = validate_redirect_uri(&request.redirect_uri)?;
    let code_verifier = normalize_non_empty(&request.code_verifier, "code_verifier")?;

    Ok(ValidatedExchangeCodeRequest {
        client_id,
        code,
        redirect_uri,
        code_verifier,
    })
}

fn validate_refresh_token_request(
    request: SpotifyRefreshTokenRequest,
) -> Result<ValidatedRefreshRequest> {
    let client_id = normalize_non_empty(&request.client_id, "client_id")?;
    let refresh_token = normalize_non_empty(&request.refresh_token, "refresh_token")?;

    Ok(ValidatedRefreshRequest {
        client_id,
        refresh_token,
    })
}

fn validate_access_token(access_token: String) -> Result<ValidatedAccessToken> {
    let access_token = normalize_non_empty(&access_token, "access_token")?;
    Ok(ValidatedAccessToken { access_token })
}

fn validate_playback_request(
    request: SpotifyPlaybackActionRequest,
) -> Result<(ValidatedAccessToken, Option<String>)> {
    let access = validate_access_token(request.access_token)?;
    let device_id = request
        .device_id
        .as_deref()
        .and_then(normalize_scope)
        .filter(|value| !value.is_empty());

    Ok((access, device_id))
}

fn normalize_search_type(value: &str) -> Option<String> {
    let normalized = value.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        return None;
    }

    Some(normalized)
}

fn is_supported_search_type(search_type: &str) -> bool {
    matches!(
        search_type,
        "album" | "artist" | "playlist" | "track" | "show" | "episode" | "audiobook"
    )
}

fn validate_search_request(request: SpotifySearchRequest) -> Result<ValidatedSearchRequest> {
    let access_token = validate_access_token(request.access_token)?.access_token;
    let query = normalize_non_empty(&request.query, "query")?;

    let raw_types = request.types.unwrap_or_default();
    let mut types = if raw_types.is_empty() {
        config()
            .SPOTIFY_DEFAULT_SEARCH_TYPES
            .iter()
            .filter_map(|item| normalize_search_type(item))
            .collect::<Vec<_>>()
    } else {
        raw_types
            .iter()
            .filter_map(|item| normalize_search_type(item))
            .collect::<Vec<_>>()
    };

    types.sort();
    types.dedup();

    if types.is_empty() {
        return Err(SpotifyError::InvalidInput(
            "at least one search type must be provided".to_string(),
        ));
    }

    for search_type in &types {
        if !is_supported_search_type(search_type) {
            return Err(SpotifyError::InvalidInput(format!(
                "unsupported search type '{}'",
                search_type
            )));
        }
    }

    let limit = request
        .limit
        .unwrap_or(config().SPOTIFY_SEARCH_DEFAULT_LIMIT);
    let limit = limit.clamp(1, config().SPOTIFY_SEARCH_MAX_LIMIT);

    let offset = request.offset.unwrap_or(0);

    let market = request
        .market
        .as_deref()
        .and_then(normalize_scope)
        .map(|value| value.to_ascii_uppercase());

    let include_external = request
        .include_external
        .as_deref()
        .and_then(normalize_scope)
        .map(|value| value.to_ascii_lowercase());

    Ok(ValidatedSearchRequest {
        access_token,
        query,
        types,
        market,
        limit,
        offset,
        include_external,
    })
}

pub fn spotify_create_auth_session(
    request: SpotifyCreateAuthSessionRequest,
) -> Result<SpotifyCreateAuthSessionResponse> {
    let request = validate_auth_session_request(request)?;

    let authorize_endpoint = build_endpoint(
        config().SPOTIFY_ACCOUNTS_BASE_URL,
        config().SPOTIFY_AUTHORIZE_ENDPOINT,
    );

    let code_verifier = generate_random_token(config().SPOTIFY_PKCE_VERIFIER_RANDOM_BYTES);
    let code_challenge = build_pkce_challenge(&code_verifier);

    let mut url = Url::parse(&authorize_endpoint)
        .map_err(|error| SpotifyError::RequestError(error.to_string()))?;

    {
        let mut query = url.query_pairs_mut();
        query.append_pair("client_id", &request.client_id);
        query.append_pair("response_type", "code");
        query.append_pair("redirect_uri", &request.redirect_uri);
        query.append_pair("state", &request.state);
        query.append_pair(
            "code_challenge_method",
            config().SPOTIFY_PKCE_CHALLENGE_METHOD,
        );
        query.append_pair("code_challenge", &code_challenge);

        if !request.scopes.is_empty() {
            query.append_pair("scope", &request.scopes.join(" "));
        }

        if request.show_dialog {
            query.append_pair("show_dialog", "true");
        }
    }

    Ok(SpotifyCreateAuthSessionResponse {
        authorize_url: url.to_string(),
        state: request.state,
        code_verifier,
        code_challenge,
        code_challenge_method: config().SPOTIFY_PKCE_CHALLENGE_METHOD.to_string(),
    })
}

pub async fn spotify_exchange_code_for_tokens(
    request: SpotifyExchangeCodeRequest,
) -> Result<SpotifyTokenResponse> {
    let request = validate_exchange_code_request(request)?;

    let token_endpoint = build_endpoint(
        config().SPOTIFY_ACCOUNTS_BASE_URL,
        config().SPOTIFY_TOKEN_ENDPOINT,
    );

    let client = build_http_client()?;

    let form = [
        ("grant_type", "authorization_code"),
        ("code", request.code.as_str()),
        ("redirect_uri", request.redirect_uri.as_str()),
        ("client_id", request.client_id.as_str()),
        ("code_verifier", request.code_verifier.as_str()),
    ];

    let response = client
        .post(token_endpoint)
        .header("content-type", "application/x-www-form-urlencoded")
        .body(encode_form_body(&form))
        .send()
        .await
        .map_err(SpotifyError::from)?;

    parse_json_response(response).await
}

pub async fn spotify_refresh_access_token(
    request: SpotifyRefreshTokenRequest,
) -> Result<SpotifyTokenResponse> {
    let request = validate_refresh_token_request(request)?;

    let token_endpoint = build_endpoint(
        config().SPOTIFY_ACCOUNTS_BASE_URL,
        config().SPOTIFY_TOKEN_ENDPOINT,
    );

    let client = build_http_client()?;

    let form = [
        ("grant_type", "refresh_token"),
        ("refresh_token", request.refresh_token.as_str()),
        ("client_id", request.client_id.as_str()),
    ];

    let response = client
        .post(token_endpoint)
        .header("content-type", "application/x-www-form-urlencoded")
        .body(encode_form_body(&form))
        .send()
        .await
        .map_err(SpotifyError::from)?;

    parse_json_response(response).await
}

pub async fn spotify_get_current_user(access_token: String) -> Result<Value> {
    let access = validate_access_token(access_token)?;
    let endpoint = build_endpoint(config().SPOTIFY_API_BASE_URL, config().SPOTIFY_ME_ENDPOINT);

    let client = build_http_client()?;
    let response = client
        .get(endpoint)
        .bearer_auth(access.access_token)
        .send()
        .await
        .map_err(SpotifyError::from)?;

    parse_json_response(response).await
}

pub async fn spotify_get_current_playback(access_token: String) -> Result<Option<Value>> {
    let access = validate_access_token(access_token)?;
    let endpoint = build_endpoint(
        config().SPOTIFY_API_BASE_URL,
        config().SPOTIFY_PLAYER_ENDPOINT,
    );

    let client = build_http_client()?;
    let response = client
        .get(endpoint)
        .bearer_auth(access.access_token)
        .send()
        .await
        .map_err(SpotifyError::from)?;

    parse_optional_json_response(response).await
}

pub async fn spotify_get_devices(access_token: String) -> Result<Value> {
    let access = validate_access_token(access_token)?;
    let endpoint = build_endpoint(
        config().SPOTIFY_API_BASE_URL,
        config().SPOTIFY_PLAYER_DEVICES_ENDPOINT,
    );

    let client = build_http_client()?;
    let response = client
        .get(endpoint)
        .bearer_auth(access.access_token)
        .send()
        .await
        .map_err(SpotifyError::from)?;

    parse_json_response(response).await
}

pub async fn spotify_play(request: SpotifyPlaybackActionRequest) -> Result<()> {
    let (access, device_id) = validate_playback_request(request)?;
    let endpoint = build_endpoint(
        config().SPOTIFY_API_BASE_URL,
        config().SPOTIFY_PLAYER_PLAY_ENDPOINT,
    );
    let endpoint_with_device = with_optional_device_id(&endpoint, device_id.as_deref())?;

    let client = build_http_client()?;
    let response = client
        .put(endpoint_with_device)
        .bearer_auth(access.access_token)
        .send()
        .await
        .map_err(SpotifyError::from)?;

    ensure_success_response(response).await
}

pub async fn spotify_pause(request: SpotifyPlaybackActionRequest) -> Result<()> {
    let (access, device_id) = validate_playback_request(request)?;
    let endpoint = build_endpoint(
        config().SPOTIFY_API_BASE_URL,
        config().SPOTIFY_PLAYER_PAUSE_ENDPOINT,
    );
    let endpoint_with_device = with_optional_device_id(&endpoint, device_id.as_deref())?;

    let client = build_http_client()?;
    let response = client
        .put(endpoint_with_device)
        .bearer_auth(access.access_token)
        .send()
        .await
        .map_err(SpotifyError::from)?;

    ensure_success_response(response).await
}

pub async fn spotify_next_track(request: SpotifyPlaybackActionRequest) -> Result<()> {
    let (access, device_id) = validate_playback_request(request)?;
    let endpoint = build_endpoint(
        config().SPOTIFY_API_BASE_URL,
        config().SPOTIFY_PLAYER_NEXT_ENDPOINT,
    );
    let endpoint_with_device = with_optional_device_id(&endpoint, device_id.as_deref())?;

    let client = build_http_client()?;
    let response = client
        .post(endpoint_with_device)
        .bearer_auth(access.access_token)
        .send()
        .await
        .map_err(SpotifyError::from)?;

    ensure_success_response(response).await
}

pub async fn spotify_previous_track(request: SpotifyPlaybackActionRequest) -> Result<()> {
    let (access, device_id) = validate_playback_request(request)?;
    let endpoint = build_endpoint(
        config().SPOTIFY_API_BASE_URL,
        config().SPOTIFY_PLAYER_PREVIOUS_ENDPOINT,
    );
    let endpoint_with_device = with_optional_device_id(&endpoint, device_id.as_deref())?;

    let client = build_http_client()?;
    let response = client
        .post(endpoint_with_device)
        .bearer_auth(access.access_token)
        .send()
        .await
        .map_err(SpotifyError::from)?;

    ensure_success_response(response).await
}

pub async fn spotify_search(request: SpotifySearchRequest) -> Result<Value> {
    let request = validate_search_request(request)?;
    let endpoint = build_endpoint(
        config().SPOTIFY_API_BASE_URL,
        config().SPOTIFY_SEARCH_ENDPOINT,
    );

    let mut url =
        Url::parse(&endpoint).map_err(|error| SpotifyError::RequestError(error.to_string()))?;
    {
        let mut query = url.query_pairs_mut();
        query.append_pair("q", &request.query);
        query.append_pair("type", &request.types.join(","));
        query.append_pair("limit", &request.limit.to_string());
        query.append_pair("offset", &request.offset.to_string());

        if let Some(market) = request.market.as_deref() {
            query.append_pair("market", market);
        }

        if let Some(include_external) = request.include_external.as_deref() {
            query.append_pair("include_external", include_external);
        }
    }

    let client = build_http_client()?;
    let response = client
        .get(url)
        .bearer_auth(request.access_token)
        .send()
        .await
        .map_err(SpotifyError::from)?;

    parse_json_response(response).await
}
