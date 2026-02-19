use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationLanguage {
    pub code: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub targets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedLanguage {
    pub language: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct TranslateTextRequest {
    pub q: String,
    #[serde(default)]
    pub source: Option<String>,
    pub target: String,
    #[serde(default)]
    pub format: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TranslateTextResponse {
    pub translated_text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detected_language: Option<DetectedLanguage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alternatives: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct GoogleLanguagesResponse {
    pub sl: HashMap<String, String>,
}
