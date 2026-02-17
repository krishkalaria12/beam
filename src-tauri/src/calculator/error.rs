use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone, Error)]
pub enum Error {
    #[error("HTTP request failed: {0}")]
    HttpRequestError(String),

    #[error("HTTP request failed with status {status} ({status_text}) for {url}")]
    HttpResponseStatusError {
        url: String,
        status: u16,
        status_text: String,
    },

    #[error("HTTP response decode failed: {0}")]
    HttpResponseDecodeError(String),

    #[error("JSON parse failed: {0}")]
    JsonParseError(String),

    #[error("{0}")]
    PluginError(#[from] crate::calculator::plugin::error::Error),

    #[error("Configuration error: {0}")]
    ConfigurationError(String),

    #[error("Request timeout: {0}")]
    RequestTimeoutError(String),

    #[error("Failed to open store: {0}")]
    StoreOpeningError(String),

    #[error("Failed to save store: {0}")]
    StoreSaveError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<crate::http::error::Error> for Error {
    fn from(value: crate::http::error::Error) -> Self {
        match value {
            crate::http::error::Error::HttpRequestError(error) => Self::HttpRequestError(error),
            crate::http::error::Error::HttpResponseStatusError {
                url,
                status,
                status_text,
            } => Self::HttpResponseStatusError {
                url,
                status,
                status_text,
            },
            crate::http::error::Error::HttpResponseDecodeError(error) => {
                Self::HttpResponseDecodeError(error)
            }
            crate::http::error::Error::RequestTimeoutError(error) => {
                Self::RequestTimeoutError(error)
            }
        }
    }
}
