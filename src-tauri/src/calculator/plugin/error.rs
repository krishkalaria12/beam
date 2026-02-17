use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone, Error)]
pub enum Error {
    #[error("Plugin initialization failed for {plugin}: {reason}")]
    PluginInitializationError { plugin: String, reason: String },

    #[error("Plugin HTTP handling failed for {plugin}: {reason}")]
    PluginHttpResultError { plugin: String, reason: String },

    #[error("Plugin JSON parse failed for {plugin}: {reason}")]
    PluginJsonParseError { plugin: String, reason: String },
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
