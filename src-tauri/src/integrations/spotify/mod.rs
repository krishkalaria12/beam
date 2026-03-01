pub mod error;
pub mod helper;
pub mod model;

use serde_json::Value;

use self::error::Result;
use self::model::{
    SpotifyCreateAuthSessionRequest, SpotifyCreateAuthSessionResponse, SpotifyExchangeCodeRequest,
    SpotifyPlaybackActionRequest, SpotifyRefreshTokenRequest, SpotifySearchRequest,
    SpotifyTokenResponse,
};

#[tauri::command]
pub fn spotify_create_auth_session(
    request: SpotifyCreateAuthSessionRequest,
) -> Result<SpotifyCreateAuthSessionResponse> {
    helper::spotify_create_auth_session(request)
}

#[tauri::command]
pub async fn spotify_exchange_code_for_tokens(
    request: SpotifyExchangeCodeRequest,
) -> Result<SpotifyTokenResponse> {
    helper::spotify_exchange_code_for_tokens(request).await
}

#[tauri::command]
pub async fn spotify_refresh_access_token(
    request: SpotifyRefreshTokenRequest,
) -> Result<SpotifyTokenResponse> {
    helper::spotify_refresh_access_token(request).await
}

#[tauri::command]
pub async fn spotify_get_current_user(access_token: String) -> Result<Value> {
    helper::spotify_get_current_user(access_token).await
}

#[tauri::command]
pub async fn spotify_get_current_playback(access_token: String) -> Result<Option<Value>> {
    helper::spotify_get_current_playback(access_token).await
}

#[tauri::command]
pub async fn spotify_get_devices(access_token: String) -> Result<Value> {
    helper::spotify_get_devices(access_token).await
}

#[tauri::command]
pub async fn spotify_play(request: SpotifyPlaybackActionRequest) -> Result<()> {
    helper::spotify_play(request).await
}

#[tauri::command]
pub async fn spotify_pause(request: SpotifyPlaybackActionRequest) -> Result<()> {
    helper::spotify_pause(request).await
}

#[tauri::command]
pub async fn spotify_next_track(request: SpotifyPlaybackActionRequest) -> Result<()> {
    helper::spotify_next_track(request).await
}

#[tauri::command]
pub async fn spotify_previous_track(request: SpotifyPlaybackActionRequest) -> Result<()> {
    helper::spotify_previous_track(request).await
}

#[tauri::command]
pub async fn spotify_search(request: SpotifySearchRequest) -> Result<Value> {
    helper::spotify_search(request).await
}
