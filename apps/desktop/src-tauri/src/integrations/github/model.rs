use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubCreateAuthSessionRequest {
    pub client_id: String,
    pub redirect_uri: String,
    #[serde(default)]
    pub scopes: Option<Vec<String>>,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub allow_signup: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubCreateAuthSessionResponse {
    pub authorize_url: String,
    pub state: String,
    pub code_verifier: String,
    pub code_challenge: String,
    pub code_challenge_method: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubExchangeCodeRequest {
    pub client_id: String,
    pub code: String,
    pub redirect_uri: String,
    pub code_verifier: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubRefreshTokenRequest {
    pub client_id: String,
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct GithubTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub scope: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_in: Option<u64>,
    pub refresh_token_expires_in: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubAssignedIssuesRequest {
    pub access_token: String,
    #[serde(default)]
    pub filter: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub sort: Option<String>,
    #[serde(default)]
    pub direction: Option<String>,
    #[serde(default)]
    pub per_page: Option<u8>,
    #[serde(default)]
    pub page: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubSearchIssuesRequest {
    pub access_token: String,
    pub query: String,
    #[serde(default)]
    pub sort: Option<String>,
    #[serde(default)]
    pub order: Option<String>,
    #[serde(default)]
    pub per_page: Option<u8>,
    #[serde(default)]
    pub page: Option<u32>,
}

#[derive(Debug, Clone)]
pub(crate) struct ValidatedAuthSessionRequest {
    pub client_id: String,
    pub redirect_uri: String,
    pub scopes: Vec<String>,
    pub state: String,
    pub allow_signup: bool,
}

#[derive(Debug, Clone)]
pub(crate) struct ValidatedExchangeCodeRequest {
    pub client_id: String,
    pub code: String,
    pub redirect_uri: String,
    pub code_verifier: String,
}

#[derive(Debug, Clone)]
pub(crate) struct ValidatedRefreshRequest {
    pub client_id: String,
    pub refresh_token: String,
}

#[derive(Debug, Clone)]
pub(crate) struct ValidatedAssignedIssuesRequest {
    pub access_token: String,
    pub filter: String,
    pub state: String,
    pub sort: String,
    pub direction: String,
    pub per_page: u8,
    pub page: u32,
}

#[derive(Debug, Clone)]
pub(crate) struct ValidatedSearchIssuesRequest {
    pub access_token: String,
    pub query: String,
    pub sort: Option<String>,
    pub order: Option<String>,
    pub per_page: u8,
    pub page: u32,
}
