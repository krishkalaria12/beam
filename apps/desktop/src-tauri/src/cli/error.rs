use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, CliError>;

#[derive(Debug, Error)]
pub enum CliError {
    #[error("missing value for {flag}")]
    MissingFlagValue { flag: String },
    #[error("invalid value for {flag}: {value}")]
    InvalidFlagValue { flag: String, value: String },
    #[error("invalid display column index: {value}")]
    InvalidDisplayColumn { value: String },
    #[error("invalid display column separator regex: {value}")]
    InvalidDisplayColumnSeparator {
        value: String,
        #[source]
        source: regex::Error,
    },
    #[error("unsupported compatibility flag: {flag}")]
    UnsupportedCompatibilityFlag { flag: String },
    #[error("unsupported search mode: {value}")]
    UnsupportedSearchMode { value: String },
    #[error("unsupported output format token: {token}")]
    UnsupportedOutputFormatToken { token: char },
    #[error("invalid row index: {value}")]
    InvalidRowIndex { value: String },
    #[error("invalid row range: {value}")]
    InvalidRowRange { value: String },
    #[error("failed to read input file: {path}")]
    InputFileRead {
        path: String,
        #[source]
        source: std::io::Error,
    },
    #[error("failed to read dmenu input from stdin")]
    StdinRead {
        #[source]
        source: std::io::Error,
    },
    #[error("rofi compatibility only supports -dmenu mode")]
    RofiRequiresDmenuMode,
    #[error("rofi -show {mode} is unsupported; use rofi -dmenu")]
    UnsupportedRofiShow { mode: String },
    #[error("rofi -multi-select is unsupported in Beam dmenu mode")]
    UnsupportedRofiMultiSelect,
    #[error("dmenu request channel closed before a response was returned")]
    RequestChannelClosed,
    #[error("failed to send dmenu response to waiting CLI client")]
    ResponseChannelSendFailed,
    #[error("no active dmenu request")]
    NoActiveDmenuRequest,
    #[error("no active dmenu request options")]
    NoActiveDmenuRequestOptions,
    #[error("active request mismatch: expected {expected}, got {got}")]
    ActiveRequestMismatch { expected: String, got: String },
    #[error("active dmenu request does not match {request_id}")]
    ActiveRequestNotFound { request_id: String },
    #[error("failed to start cli bridge server on {address}: {details}")]
    CliBridgeServerStart { address: String, details: String },
    #[error("failed to request cli bridge health")]
    CliBridgeHealthRequest {
        #[source]
        source: reqwest::Error,
    },
    #[error("cli bridge health request returned non-success status")]
    CliBridgeHealthStatus {
        #[source]
        source: reqwest::Error,
    },
    #[error("failed to decode cli bridge health response")]
    CliBridgeHealthDecode {
        #[source]
        source: reqwest::Error,
    },
    #[error("failed to submit dmenu request to cli bridge")]
    CliBridgeSubmitRequest {
        #[source]
        source: reqwest::Error,
    },
    #[error("cli bridge dmenu request returned non-success status")]
    CliBridgeSubmitStatus {
        #[source]
        source: reqwest::Error,
    },
    #[error("failed to decode cli bridge dmenu response")]
    CliBridgeSubmitDecode {
        #[source]
        source: reqwest::Error,
    },
    #[error("failed to resolve current executable")]
    CurrentExecutable {
        #[source]
        source: std::io::Error,
    },
    #[error("failed to spawn Beam background app")]
    SpawnBackgroundApp {
        #[source]
        source: std::io::Error,
    },
    #[error("failed to create async runtime")]
    RuntimeCreation {
        #[source]
        source: std::io::Error,
    },
    #[error("failed to build cli bridge http client")]
    CliHttpClientBuild {
        #[source]
        source: reqwest::Error,
    },
    #[error("Beam cli bridge did not become ready in time; start Beam and try again")]
    CliBridgeTimeout,
}

impl Serialize for CliError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
