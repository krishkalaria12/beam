pub mod error;
pub mod helper;
pub mod model;

use serde_json::Value;

use self::error::Result;
use self::model::{
    GithubAssignedIssuesRequest, GithubCreateAuthSessionRequest, GithubCreateAuthSessionResponse,
    GithubExchangeCodeRequest, GithubRefreshTokenRequest, GithubSearchIssuesRequest,
    GithubTokenResponse,
};

#[tauri::command]
pub fn github_create_auth_session(
    request: GithubCreateAuthSessionRequest,
) -> Result<GithubCreateAuthSessionResponse> {
    helper::github_create_auth_session(request)
}

#[tauri::command]
pub async fn github_exchange_code_for_tokens(
    request: GithubExchangeCodeRequest,
) -> Result<GithubTokenResponse> {
    helper::github_exchange_code_for_tokens(request).await
}

#[tauri::command]
pub async fn github_refresh_access_token(
    request: GithubRefreshTokenRequest,
) -> Result<GithubTokenResponse> {
    helper::github_refresh_access_token(request).await
}

#[tauri::command]
pub async fn github_get_current_user(access_token: String) -> Result<Value> {
    helper::github_get_current_user(access_token).await
}

#[tauri::command]
pub async fn github_get_assigned_issues(request: GithubAssignedIssuesRequest) -> Result<Value> {
    helper::github_get_assigned_issues(request).await
}

#[tauri::command]
pub async fn github_search_issues_and_pull_requests(
    request: GithubSearchIssuesRequest,
) -> Result<Value> {
    helper::github_search_issues_and_pull_requests(request).await
}
