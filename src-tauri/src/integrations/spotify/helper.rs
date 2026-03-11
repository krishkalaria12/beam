use reqwest::{Client, StatusCode};
use serde::de::DeserializeOwned;
use serde_json::Value;
use url::Url;

use crate::integrations::config::CONFIG as INTEGRATIONS_CONFIG;
use crate::integrations::helper as integration_helper;
use crate::integrations::spotify::config::CONFIG as SPOTIFY_CONFIG;

use super::error::{Result, SpotifyError};
use super::model::{
    SpotifyCreateAuthSessionRequest, SpotifyCreateAuthSessionResponse, SpotifyExchangeCodeRequest,
    SpotifyPlaybackActionRequest, SpotifyRefreshTokenRequest, SpotifySearchRequest,
    SpotifyTokenResponse, ValidatedAccessToken, ValidatedAuthSessionRequest,
    ValidatedExchangeCodeRequest, ValidatedRefreshRequest, ValidatedSearchRequest,
};

fn build_http_client() -> Result<Client> {
    Client::builder()
        .timeout(std::time::Duration::from_secs(
            INTEGRATIONS_CONFIG.http_timeout_secs,
        ))
        .build()
        .map_err(|error| SpotifyError::RequestError(error.to_string()))
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
        return integration_helper::build_url_with_params(
            endpoint,
            &[("device_id".to_string(), device_id.to_string())],
        )
        .map_err(SpotifyError::RequestError);
    }

    Ok(endpoint.to_string())
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
    let client_id = integration_helper::normalize_non_empty(&request.client_id, "client_id")
        .map_err(SpotifyError::InvalidInput)?;
    let redirect_uri = integration_helper::validate_redirect_uri(&request.redirect_uri)
        .map_err(SpotifyError::InvalidInput)?;
    let scopes =
        integration_helper::normalize_scopes(request.scopes, &SPOTIFY_CONFIG.default_scopes);

    let state = request
        .state
        .as_deref()
        .and_then(integration_helper::normalize_scope)
        .unwrap_or_else(|| {
            integration_helper::generate_random_token(INTEGRATIONS_CONFIG.state_random_bytes)
        });

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
    let client_id = integration_helper::normalize_non_empty(&request.client_id, "client_id")
        .map_err(SpotifyError::InvalidInput)?;
    let code = integration_helper::normalize_non_empty(&request.code, "code")
        .map_err(SpotifyError::InvalidInput)?;
    let redirect_uri = integration_helper::validate_redirect_uri(&request.redirect_uri)
        .map_err(SpotifyError::InvalidInput)?;
    let code_verifier =
        integration_helper::normalize_non_empty(&request.code_verifier, "code_verifier")
            .map_err(SpotifyError::InvalidInput)?;

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
    let client_id = integration_helper::normalize_non_empty(&request.client_id, "client_id")
        .map_err(SpotifyError::InvalidInput)?;
    let refresh_token =
        integration_helper::normalize_non_empty(&request.refresh_token, "refresh_token")
            .map_err(SpotifyError::InvalidInput)?;

    Ok(ValidatedRefreshRequest {
        client_id,
        refresh_token,
    })
}

fn validate_access_token(access_token: String) -> Result<ValidatedAccessToken> {
    let access_token = integration_helper::normalize_non_empty(&access_token, "access_token")
        .map_err(SpotifyError::InvalidInput)?;
    Ok(ValidatedAccessToken { access_token })
}

fn validate_playback_request(
    request: SpotifyPlaybackActionRequest,
) -> Result<(ValidatedAccessToken, Option<String>)> {
    let access = validate_access_token(request.access_token)?;
    let device_id = request
        .device_id
        .as_deref()
        .and_then(integration_helper::normalize_scope)
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
    let query = integration_helper::normalize_non_empty(&request.query, "query")
        .map_err(SpotifyError::InvalidInput)?;

    let raw_types = request.types.unwrap_or_default();
    let mut types = if raw_types.is_empty() {
        SPOTIFY_CONFIG
            .default_search_types
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

    let limit = request.limit.unwrap_or(SPOTIFY_CONFIG.search_default_limit);
    let limit = limit.clamp(1, SPOTIFY_CONFIG.search_max_limit);

    let offset = request.offset.unwrap_or(0);

    let market = request
        .market
        .as_deref()
        .and_then(integration_helper::normalize_scope)
        .map(|value| value.to_ascii_uppercase());

    let include_external = request
        .include_external
        .as_deref()
        .and_then(integration_helper::normalize_scope)
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

    let authorize_endpoint = SPOTIFY_CONFIG.authorize_url.to_string();

    let code_verifier =
        integration_helper::generate_random_token(INTEGRATIONS_CONFIG.pkce_verifier_random_bytes);
    let code_challenge = integration_helper::build_pkce_challenge(&code_verifier);

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
            INTEGRATIONS_CONFIG.pkce_challenge_method,
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
        code_challenge_method: INTEGRATIONS_CONFIG.pkce_challenge_method.to_string(),
    })
}

pub async fn spotify_exchange_code_for_tokens(
    request: SpotifyExchangeCodeRequest,
) -> Result<SpotifyTokenResponse> {
    let request = validate_exchange_code_request(request)?;

    let token_endpoint = SPOTIFY_CONFIG.token_url.to_string();

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

    let token_endpoint = SPOTIFY_CONFIG.token_url.to_string();

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
    let endpoint = SPOTIFY_CONFIG.me_url.to_string();

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
    let endpoint = SPOTIFY_CONFIG.player_url.to_string();

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
    let endpoint = SPOTIFY_CONFIG.player_devices_url.to_string();

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
    let endpoint = SPOTIFY_CONFIG.player_play_url.to_string();
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
    let endpoint = SPOTIFY_CONFIG.player_pause_url.to_string();
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
    let endpoint = SPOTIFY_CONFIG.player_next_url.to_string();
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
    let endpoint = SPOTIFY_CONFIG.player_previous_url.to_string();
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
    let endpoint = SPOTIFY_CONFIG.search_url.to_string();

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
