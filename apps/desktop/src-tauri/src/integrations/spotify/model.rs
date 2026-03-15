use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyCreateAuthSessionRequest {
    pub client_id: String,
    pub redirect_uri: String,
    #[serde(default)]
    pub scopes: Option<Vec<String>>,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub show_dialog: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyCreateAuthSessionResponse {
    pub authorize_url: String,
    pub state: String,
    pub code_verifier: String,
    pub code_challenge: String,
    pub code_challenge_method: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyExchangeCodeRequest {
    pub client_id: String,
    pub code: String,
    pub redirect_uri: String,
    pub code_verifier: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyRefreshTokenRequest {
    pub client_id: String,
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct SpotifyTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub scope: Option<String>,
    pub expires_in: u64,
    pub refresh_token: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyAccessTokenRequest {
    pub access_token: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyPlaybackActionRequest {
    pub access_token: String,
    #[serde(default)]
    pub device_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifySearchRequest {
    pub access_token: String,
    pub query: String,
    #[serde(default)]
    pub types: Option<Vec<String>>,
    #[serde(default)]
    pub market: Option<String>,
    #[serde(default)]
    pub limit: Option<u8>,
    #[serde(default)]
    pub offset: Option<u32>,
    #[serde(default)]
    pub include_external: Option<String>,
}

#[derive(Debug, Clone)]
pub(crate) struct ValidatedAuthSessionRequest {
    pub client_id: String,
    pub redirect_uri: String,
    pub scopes: Vec<String>,
    pub state: String,
    pub show_dialog: bool,
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
pub(crate) struct ValidatedAccessToken {
    pub access_token: String,
}

#[derive(Debug, Clone)]
pub(crate) struct ValidatedSearchRequest {
    pub access_token: String,
    pub query: String,
    pub types: Vec<String>,
    pub market: Option<String>,
    pub limit: u8,
    pub offset: u32,
    pub include_external: Option<String>,
}
