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

crate::impl_froms! {}

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
            Self::RequestTimeoutError(e) => write!(fmt, "request timeout: {e}"),
        }
    }
}

impl std::error::Error for Error {}
// endregion: --- Error Boilerplate
