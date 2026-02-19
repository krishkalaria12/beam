use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Invalid translation input: {0}")]
    InvalidInput(String),

    #[error("Translation request failed: {0}")]
    RequestError(String),

    #[error("Translation request timed out: {0}")]
    TimeoutError(String),

    #[error("Translation API returned status {status} ({status_text}) for {url}: {message}")]
    ApiStatusError {
        url: String,
        status: u16,
        status_text: String,
        message: String,
    },

    #[error("Failed to parse translation response: {0}")]
    ParseError(String),
}

impl From<reqwest::Error> for Error {
    fn from(error: reqwest::Error) -> Self {
        if error.is_timeout() {
            return Error::TimeoutError(error.to_string());
        }

        Error::RequestError(error.to_string())
    }
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
