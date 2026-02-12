use serde::Serialize;

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Debug, Clone)]
pub enum Error {
    HttpRequestError(String),
    HttpResponseStatusError {
        url: String,
        status: u16,
        status_text: String,
    },
    HttpResponseDecodeError(String),
    JsonParseError(String),
    PluginError(crate::calculator::plugin::error::Error),
    ConfigurationError(String),
    RequestTimeoutError(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

// region:    --- Froms

crate::impl_froms! { PluginError(crate::calculator::plugin::error::Error), }

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

// endregion: --- Froms

// region:    --- Error Boilerplate
impl core::fmt::Display for Error {
    fn fmt(&self, fmt: &mut core::fmt::Formatter) -> core::result::Result<(), core::fmt::Error> {
        match self {
            Self::HttpRequestError(e) => write!(fmt, "http request failed: {e}"),
            Self::HttpResponseStatusError {
                url,
                status,
                status_text,
            } => {
                write!(
                    fmt,
                    "http request failed with status {status} ({status_text}) for {url}"
                )
            }
            Self::HttpResponseDecodeError(e) => write!(fmt, "http response decode failed: {e}"),
            Self::JsonParseError(e) => write!(fmt, "json parse failed: {e}"),
            Self::PluginError(e) => write!(fmt, "{e}"),
            Self::ConfigurationError(e) => write!(fmt, "configuration error: {e}"),
            Self::RequestTimeoutError(e) => write!(fmt, "request timeout: {e}"),
        }
    }
}

impl std::error::Error for Error {}
// endregion: --- Error Boilerplate
