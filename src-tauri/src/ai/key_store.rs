use crate::config::config;

use super::error::{AiError, Result};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AiProvider {
    OpenRouter,
    OpenAI,
    Anthropic,
    Gemini,
}

impl AiProvider {
    pub fn from_raw(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "openrouter" => Some(Self::OpenRouter),
            "openai" => Some(Self::OpenAI),
            "anthropic" | "antrhopic" => Some(Self::Anthropic),
            "gemini" | "google" | "google-gemini" => Some(Self::Gemini),
            _ => None,
        }
    }

    pub fn id(self) -> &'static str {
        match self {
            Self::OpenRouter => "openrouter",
            Self::OpenAI => "openai",
            Self::Anthropic => "anthropic",
            Self::Gemini => "gemini",
        }
    }

    pub fn default_model(self) -> &'static str {
        match self {
            Self::OpenRouter => config().AI_DEFAULT_OPENROUTER_MODEL,
            Self::OpenAI => config().AI_DEFAULT_OPENAI_MODEL,
            Self::Anthropic => config().AI_DEFAULT_ANTHROPIC_MODEL,
            Self::Gemini => config().AI_DEFAULT_GEMINI_MODEL,
        }
    }

    fn keyring_username(self) -> &'static str {
        match self {
            Self::OpenRouter => config().AI_OPENROUTER_KEYRING_USERNAME,
            Self::OpenAI => config().AI_OPENAI_KEYRING_USERNAME,
            Self::Anthropic => config().AI_ANTHROPIC_KEYRING_USERNAME,
            Self::Gemini => config().AI_GEMINI_KEYRING_USERNAME,
        }
    }
}

fn get_keyring_entry(provider: AiProvider) -> Result<keyring::Entry> {
    keyring::Entry::new(config().AI_KEYRING_SERVICE, provider.keyring_username())
        .map_err(AiError::from)
}

pub fn resolve_provider(provider_id: Option<&str>) -> Result<AiProvider> {
    let Some(raw) = provider_id else {
        return Ok(AiProvider::OpenRouter);
    };

    if raw.trim().is_empty() {
        return Ok(AiProvider::OpenRouter);
    }

    AiProvider::from_raw(raw).ok_or_else(|| AiError::UnsupportedProvider(raw.trim().to_string()))
}

pub fn infer_provider_from_model(model: &str) -> AiProvider {
    let lowered = model.trim().to_ascii_lowercase();
    if lowered.contains('/') {
        return AiProvider::OpenRouter;
    }
    if lowered.contains("claude") {
        return AiProvider::Anthropic;
    }
    if lowered.contains("gemini") {
        return AiProvider::Gemini;
    }
    if lowered.contains("gpt") || lowered.starts_with("o1") || lowered.starts_with("o3") {
        return AiProvider::OpenAI;
    }
    AiProvider::OpenRouter
}

pub fn providers() -> [AiProvider; 4] {
    [
        AiProvider::OpenRouter,
        AiProvider::OpenAI,
        AiProvider::Anthropic,
        AiProvider::Gemini,
    ]
}

pub fn set_provider_api_key(provider: AiProvider, key: &str) -> Result<()> {
    let entry = get_keyring_entry(provider)?;
    match entry.set_password(key) {
        Ok(_) => {
            // Verify roundtrip so frontend gets a clear error if the platform keyring backend
            // accepted the write call but cannot read it back.
            let verify = entry.get_password().map_err(AiError::from)?;
            if verify.is_empty() {
                return Err(AiError::Keyring(
                    "Keyring write verification failed: stored value is empty".to_string(),
                ));
            }
            Ok(())
        }
        Err(error) => Err(AiError::from(error)),
    }
}

pub fn get_provider_api_key(provider: AiProvider) -> Result<String> {
    let entry = get_keyring_entry(provider)?;
    match entry.get_password() {
        Ok(key) => Ok(key),
        Err(error) => match error {
            keyring::Error::NoEntry => Err(AiError::MissingApiKey(provider.id().to_string())),
            other => Err(AiError::from(other)),
        },
    }
}

pub fn is_provider_key_set(provider: AiProvider) -> Result<bool> {
    let entry = get_keyring_entry(provider)?;
    match entry.get_password() {
        Ok(key) => Ok(!key.trim().is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(AiError::from(error)),
    }
}

pub fn clear_provider_api_key(provider: AiProvider) -> Result<()> {
    let entry = get_keyring_entry(provider)?;
    match entry.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(AiError::from(error)),
    }
}
