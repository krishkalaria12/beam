use serde_json::Value;
use std::collections::HashMap;

use crate::http;
use crate::integrations::config::CONFIG as INTEGRATIONS_CONFIG;
use crate::integrations::github::config::CONFIG as GITHUB_CONFIG;
use crate::integrations::helper as integration_helper;

use super::error::{GithubError, Result};
use super::model::{
    GithubAssignedIssuesRequest, GithubCreateAuthSessionRequest, GithubCreateAuthSessionResponse,
    GithubExchangeCodeRequest, GithubRefreshTokenRequest, GithubSearchIssuesRequest,
    GithubTokenResponse, ValidatedAssignedIssuesRequest, ValidatedAuthSessionRequest,
    ValidatedExchangeCodeRequest, ValidatedRefreshRequest, ValidatedSearchIssuesRequest,
};

fn truncate_for_error(input: &str, max_len: usize) -> String {
    if input.chars().count() <= max_len {
        return input.to_string();
    }

    input.chars().take(max_len).collect::<String>() + "..."
}

fn parse_json_from_body<T: serde::de::DeserializeOwned>(body: &str) -> Result<T> {
    serde_json::from_str::<T>(body).map_err(|error| {
        GithubError::ParseError(format!(
            "{} (response body: {})",
            error,
            truncate_for_error(body, 220)
        ))
    })
}

fn map_http_error(error: http::error::HttpError) -> GithubError {
    match error {
        http::error::HttpError::HttpRequestError(message) => {
            if message.to_ascii_lowercase().contains("timed out") {
                GithubError::TimeoutError(message)
            } else {
                GithubError::RequestError(message)
            }
        }
        http::error::HttpError::HttpResponseStatusError {
            url,
            status,
            status_text,
        } => GithubError::ApiStatusError {
            url,
            status,
            status_text,
            message: "unexpected upstream response status".to_string(),
        },
        http::error::HttpError::HttpResponseDecodeError(message) => {
            GithubError::ParseError(message)
        }
        http::error::HttpError::RequestTimeoutError(message) => GithubError::TimeoutError(message),
    }
}

fn build_api_headers(access_token: &str) -> Vec<(String, String)> {
    vec![
        (
            "Accept".to_string(),
            "application/vnd.github+json".to_string(),
        ),
        (
            "X-GitHub-Api-Version".to_string(),
            GITHUB_CONFIG.api_version.to_string(),
        ),
        (
            "User-Agent".to_string(),
            GITHUB_CONFIG.user_agent.to_string(),
        ),
        (
            "Authorization".to_string(),
            format!("Bearer {access_token}"),
        ),
    ]
}

fn parse_token_response_from_form(body: &str) -> Result<GithubTokenResponse> {
    let values: HashMap<String, String> = url::form_urlencoded::parse(body.as_bytes())
        .into_owned()
        .collect();

    let access_token = values
        .get("access_token")
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            GithubError::ParseError(
                "token response did not include an access_token value".to_string(),
            )
        })?;

    let token_type = values
        .get("token_type")
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "bearer".to_string());

    let scope = values
        .get("scope")
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    let refresh_token = values
        .get("refresh_token")
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    let expires_in = values
        .get("expires_in")
        .and_then(|value| value.trim().parse::<u64>().ok());

    let refresh_token_expires_in = values
        .get("refresh_token_expires_in")
        .and_then(|value| value.trim().parse::<u64>().ok());

    Ok(GithubTokenResponse {
        access_token,
        token_type,
        scope,
        refresh_token,
        expires_in,
        refresh_token_expires_in,
    })
}

fn parse_token_response(body: &str) -> Result<GithubTokenResponse> {
    if let Ok(parsed) = serde_json::from_str::<GithubTokenResponse>(body) {
        return Ok(parsed);
    }

    parse_token_response_from_form(body)
}

fn normalize_lowercase_non_empty(value: &str) -> Option<String> {
    let normalized = value.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        return None;
    }

    Some(normalized)
}

fn validate_assigned_issues_request(
    request: GithubAssignedIssuesRequest,
) -> Result<ValidatedAssignedIssuesRequest> {
    let access_token =
        integration_helper::normalize_non_empty(&request.access_token, "access_token")
            .map_err(GithubError::InvalidInput)?;
    let filter = request
        .filter
        .as_deref()
        .and_then(normalize_lowercase_non_empty)
        .unwrap_or_else(|| GITHUB_CONFIG.default_issues_filter.to_string());
    let state = request
        .state
        .as_deref()
        .and_then(normalize_lowercase_non_empty)
        .unwrap_or_else(|| GITHUB_CONFIG.default_issues_state.to_string());
    let sort = request
        .sort
        .as_deref()
        .and_then(normalize_lowercase_non_empty)
        .unwrap_or_else(|| GITHUB_CONFIG.default_issues_sort.to_string());
    let direction = request
        .direction
        .as_deref()
        .and_then(normalize_lowercase_non_empty)
        .unwrap_or_else(|| GITHUB_CONFIG.default_issues_direction.to_string());
    let per_page = request
        .per_page
        .unwrap_or(GITHUB_CONFIG.default_issues_per_page)
        .clamp(1, GITHUB_CONFIG.max_issues_per_page);
    let page = request.page.unwrap_or(1).max(1);

    let valid_filters = [
        "assigned",
        "created",
        "mentioned",
        "subscribed",
        "repos",
        "all",
    ];
    if !valid_filters.contains(&filter.as_str()) {
        return Err(GithubError::InvalidInput(format!(
            "issues filter '{}' is invalid",
            filter
        )));
    }

    let valid_states = ["open", "closed", "all"];
    if !valid_states.contains(&state.as_str()) {
        return Err(GithubError::InvalidInput(format!(
            "issues state '{}' is invalid",
            state
        )));
    }

    let valid_sorts = ["created", "updated", "comments"];
    if !valid_sorts.contains(&sort.as_str()) {
        return Err(GithubError::InvalidInput(format!(
            "issues sort '{}' is invalid",
            sort
        )));
    }

    let valid_directions = ["asc", "desc"];
    if !valid_directions.contains(&direction.as_str()) {
        return Err(GithubError::InvalidInput(format!(
            "issues direction '{}' is invalid",
            direction
        )));
    }

    Ok(ValidatedAssignedIssuesRequest {
        access_token,
        filter,
        state,
        sort,
        direction,
        per_page,
        page,
    })
}

fn validate_search_issues_request(
    request: GithubSearchIssuesRequest,
) -> Result<ValidatedSearchIssuesRequest> {
    let access_token =
        integration_helper::normalize_non_empty(&request.access_token, "access_token")
            .map_err(GithubError::InvalidInput)?;
    let query = integration_helper::normalize_non_empty(&request.query, "query")
        .map_err(GithubError::InvalidInput)?;
    let per_page = request
        .per_page
        .unwrap_or(GITHUB_CONFIG.default_issues_per_page)
        .clamp(1, GITHUB_CONFIG.max_issues_per_page);
    let page = request.page.unwrap_or(1).max(1);

    let sort = request
        .sort
        .as_deref()
        .and_then(normalize_lowercase_non_empty);
    let order = request
        .order
        .as_deref()
        .and_then(normalize_lowercase_non_empty);

    if let Some(sort_value) = sort.as_deref() {
        let valid_sorts = ["comments", "reactions", "created", "updated"];
        if !valid_sorts.contains(&sort_value) {
            return Err(GithubError::InvalidInput(format!(
                "search sort '{}' is invalid",
                sort_value
            )));
        }
    }

    if let Some(order_value) = order.as_deref() {
        let valid_orders = ["asc", "desc"];
        if !valid_orders.contains(&order_value) {
            return Err(GithubError::InvalidInput(format!(
                "search order '{}' is invalid",
                order_value
            )));
        }
    }

    Ok(ValidatedSearchIssuesRequest {
        access_token,
        query,
        sort,
        order,
        per_page,
        page,
    })
}

fn validate_auth_session_request(
    request: GithubCreateAuthSessionRequest,
) -> Result<ValidatedAuthSessionRequest> {
    let client_id = integration_helper::normalize_non_empty(&request.client_id, "client_id")
        .map_err(GithubError::InvalidInput)?;
    let redirect_uri = integration_helper::validate_redirect_uri(&request.redirect_uri)
        .map_err(GithubError::InvalidInput)?;
    let scopes =
        integration_helper::normalize_scopes(request.scopes, &GITHUB_CONFIG.default_scopes);
    let state = request
        .state
        .as_deref()
        .and_then(integration_helper::normalize_scope)
        .unwrap_or_else(|| {
            integration_helper::generate_random_token(INTEGRATIONS_CONFIG.state_random_bytes)
        });
    let allow_signup = request.allow_signup.unwrap_or(false);

    Ok(ValidatedAuthSessionRequest {
        client_id,
        redirect_uri,
        scopes,
        state,
        allow_signup,
    })
}

fn validate_exchange_code_request(
    request: GithubExchangeCodeRequest,
) -> Result<ValidatedExchangeCodeRequest> {
    Ok(ValidatedExchangeCodeRequest {
        client_id: integration_helper::normalize_non_empty(&request.client_id, "client_id")
            .map_err(GithubError::InvalidInput)?,
        code: integration_helper::normalize_non_empty(&request.code, "code")
            .map_err(GithubError::InvalidInput)?,
        redirect_uri: integration_helper::validate_redirect_uri(&request.redirect_uri)
            .map_err(GithubError::InvalidInput)?,
        code_verifier: integration_helper::normalize_non_empty(
            &request.code_verifier,
            "code_verifier",
        )
        .map_err(GithubError::InvalidInput)?,
    })
}

fn validate_refresh_token_request(
    request: GithubRefreshTokenRequest,
) -> Result<ValidatedRefreshRequest> {
    Ok(ValidatedRefreshRequest {
        client_id: integration_helper::normalize_non_empty(&request.client_id, "client_id")
            .map_err(GithubError::InvalidInput)?,
        refresh_token: integration_helper::normalize_non_empty(
            &request.refresh_token,
            "refresh_token",
        )
        .map_err(GithubError::InvalidInput)?,
    })
}

pub fn github_create_auth_session(
    request: GithubCreateAuthSessionRequest,
) -> Result<GithubCreateAuthSessionResponse> {
    let validated = validate_auth_session_request(request)?;

    let code_verifier =
        integration_helper::generate_random_token(INTEGRATIONS_CONFIG.pkce_verifier_random_bytes);
    let code_challenge = integration_helper::build_pkce_challenge(&code_verifier);
    let authorize_endpoint = GITHUB_CONFIG.authorize_url.to_string();

    let mut params = vec![
        ("client_id".to_string(), validated.client_id),
        ("redirect_uri".to_string(), validated.redirect_uri),
        ("state".to_string(), validated.state.clone()),
        ("code_challenge".to_string(), code_challenge.clone()),
        (
            "code_challenge_method".to_string(),
            INTEGRATIONS_CONFIG.pkce_challenge_method.to_string(),
        ),
        (
            "allow_signup".to_string(),
            validated.allow_signup.to_string(),
        ),
    ];

    if !validated.scopes.is_empty() {
        params.push(("scope".to_string(), validated.scopes.join(" ")));
    }

    let authorize_url = integration_helper::build_url_with_params(&authorize_endpoint, &params)
        .map_err(GithubError::RequestError)?;

    Ok(GithubCreateAuthSessionResponse {
        authorize_url,
        state: validated.state,
        code_verifier,
        code_challenge,
        code_challenge_method: INTEGRATIONS_CONFIG.pkce_challenge_method.to_string(),
    })
}

pub async fn github_exchange_code_for_tokens(
    request: GithubExchangeCodeRequest,
) -> Result<GithubTokenResponse> {
    let validated = validate_exchange_code_request(request)?;
    let token_endpoint = GITHUB_CONFIG.token_url.to_string();
    let headers = vec![
        ("Accept".to_string(), "application/json".to_string()),
        (
            "User-Agent".to_string(),
            GITHUB_CONFIG.user_agent.to_string(),
        ),
    ];
    let form = vec![
        ("client_id".to_string(), validated.client_id),
        ("code".to_string(), validated.code),
        ("redirect_uri".to_string(), validated.redirect_uri),
        ("code_verifier".to_string(), validated.code_verifier),
    ];

    let body = http::post_form_async_with_headers_and_timeout(
        &token_endpoint,
        &headers,
        &form,
        INTEGRATIONS_CONFIG.http_timeout_secs,
    )
    .await
    .map_err(map_http_error)?;

    parse_token_response(&body)
}

pub async fn github_refresh_access_token(
    request: GithubRefreshTokenRequest,
) -> Result<GithubTokenResponse> {
    let validated = validate_refresh_token_request(request)?;
    let token_endpoint = GITHUB_CONFIG.token_url.to_string();
    let headers = vec![
        ("Accept".to_string(), "application/json".to_string()),
        (
            "User-Agent".to_string(),
            GITHUB_CONFIG.user_agent.to_string(),
        ),
    ];
    let form = vec![
        ("client_id".to_string(), validated.client_id),
        ("grant_type".to_string(), "refresh_token".to_string()),
        ("refresh_token".to_string(), validated.refresh_token),
    ];

    let body = http::post_form_async_with_headers_and_timeout(
        &token_endpoint,
        &headers,
        &form,
        INTEGRATIONS_CONFIG.http_timeout_secs,
    )
    .await
    .map_err(map_http_error)?;

    parse_token_response(&body)
}

pub async fn github_get_current_user(access_token: String) -> Result<Value> {
    let access_token = integration_helper::normalize_non_empty(&access_token, "access_token")
        .map_err(GithubError::InvalidInput)?;
    let endpoint = GITHUB_CONFIG.user_url.to_string();
    let headers = build_api_headers(&access_token);

    let body = http::get_async_with_headers_and_timeout(
        &endpoint,
        &headers,
        INTEGRATIONS_CONFIG.http_timeout_secs,
    )
    .await
    .map_err(map_http_error)?;

    parse_json_from_body(&body)
}

pub async fn github_get_assigned_issues(request: GithubAssignedIssuesRequest) -> Result<Value> {
    let validated = validate_assigned_issues_request(request)?;
    let endpoint = GITHUB_CONFIG.issues_url.to_string();
    let query_params = vec![
        ("filter".to_string(), validated.filter),
        ("state".to_string(), validated.state),
        ("sort".to_string(), validated.sort),
        ("direction".to_string(), validated.direction),
        ("per_page".to_string(), validated.per_page.to_string()),
        ("page".to_string(), validated.page.to_string()),
    ];
    let url = integration_helper::build_url_with_params(&endpoint, &query_params)
        .map_err(GithubError::RequestError)?;
    let headers = build_api_headers(&validated.access_token);

    let body = http::get_async_with_headers_and_timeout(
        &url,
        &headers,
        INTEGRATIONS_CONFIG.http_timeout_secs,
    )
    .await
    .map_err(map_http_error)?;

    parse_json_from_body(&body)
}

pub async fn github_search_issues_and_pull_requests(
    request: GithubSearchIssuesRequest,
) -> Result<Value> {
    let validated = validate_search_issues_request(request)?;
    let endpoint = GITHUB_CONFIG.search_issues_url.to_string();

    let mut query_params = vec![
        ("q".to_string(), validated.query),
        ("per_page".to_string(), validated.per_page.to_string()),
        ("page".to_string(), validated.page.to_string()),
    ];
    if let Some(sort) = validated.sort {
        query_params.push(("sort".to_string(), sort));
    }
    if let Some(order) = validated.order {
        query_params.push(("order".to_string(), order));
    }

    let url = integration_helper::build_url_with_params(&endpoint, &query_params)
        .map_err(GithubError::RequestError)?;
    let headers = build_api_headers(&validated.access_token);

    let body = http::get_async_with_headers_and_timeout(
        &url,
        &headers,
        INTEGRATIONS_CONFIG.http_timeout_secs,
    )
    .await
    .map_err(map_http_error)?;

    parse_json_from_body(&body)
}
