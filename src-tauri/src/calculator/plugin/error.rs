use serde::Serialize;

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Debug, Clone)]
pub enum Error {
    PluginInitializationError { plugin: String, reason: String },
    PluginHttpResultError { plugin: String, reason: String },
    PluginJsonParseError { plugin: String, reason: String },
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
            Self::PluginInitializationError { plugin, reason } => {
                write!(fmt, "plugin initialization failed for {plugin}: {reason}")
            }
            Self::PluginHttpResultError { plugin, reason } => {
                write!(fmt, "plugin http handling failed for {plugin}: {reason}")
            }
            Self::PluginJsonParseError { plugin, reason } => {
                write!(fmt, "plugin json parse failed for {plugin}: {reason}")
            }
        }
    }
}

impl std::error::Error for Error {}
// endregion: --- Error Boilerplate
