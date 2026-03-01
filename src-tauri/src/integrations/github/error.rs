use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, GithubError>;

#[derive(Debug, Error)]
pub enum GithubError {
    #[error("Invalid GitHub input: {0}")]
    InvalidInput(String),

    #[error("GitHub request failed: {0}")]
    RequestError(String),

    #[error("GitHub request timed out: {0}")]
    TimeoutError(String),

    #[error("GitHub API returned status {status} ({status_text}) for {url}: {message}")]
    ApiStatusError {
        url: String,
        status: u16,
        status_text: String,
        message: String,
    },

    #[error("Failed to parse GitHub response: {0}")]
    ParseError(String),
}

impl From<reqwest::Error> for GithubError {
    fn from(error: reqwest::Error) -> Self {
        if error.is_timeout() {
            return GithubError::TimeoutError(error.to_string());
        }

        GithubError::RequestError(error.to_string())
    }
}

impl Serialize for GithubError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
