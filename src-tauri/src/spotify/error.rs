use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, SpotifyError>;

#[derive(Debug, Error)]
pub enum SpotifyError {
    #[error("Invalid Spotify input: {0}")]
    InvalidInput(String),

    #[error("Spotify request failed: {0}")]
    RequestError(String),

    #[error("Spotify request timed out: {0}")]
    TimeoutError(String),

    #[error("Spotify API returned status {status} ({status_text}) for {url}: {message}")]
    ApiStatusError {
        url: String,
        status: u16,
        status_text: String,
        message: String,
    },

    #[error("Failed to parse Spotify response: {0}")]
    ParseError(String),
}

impl From<reqwest::Error> for SpotifyError {
    fn from(error: reqwest::Error) -> Self {
        if error.is_timeout() {
            return SpotifyError::TimeoutError(error.to_string());
        }

        SpotifyError::RequestError(error.to_string())
    }
}

impl Serialize for SpotifyError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
