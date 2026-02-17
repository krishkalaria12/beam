use serde::{Deserialize, Serialize};

/// Simplified dictionary response containing only meaning, synonyms, and antonyms
#[derive(Debug, Serialize, Clone)]
pub struct DictionaryResponse {
    pub word: String,
    pub meanings: Vec<Meaning>,
    pub synonyms: Vec<String>,
    pub antonyms: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct Meaning {
    pub part_of_speech: String,
    pub definitions: Vec<String>,
}

// API Response structs for deserialization
#[derive(Debug, Deserialize)]
pub struct ApiResponse {
    pub word: String,
    pub entries: Vec<ApiEntry>,
}

#[derive(Debug, Deserialize)]
pub struct ApiEntry {
    #[serde(rename = "partOfSpeech")]
    pub part_of_speech: Option<String>,
    pub senses: Vec<ApiSense>,
    #[serde(default)]
    pub synonyms: Vec<String>,
    #[serde(default)]
    pub antonyms: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApiSense {
    pub definition: Option<String>,
    #[serde(default)]
    pub synonyms: Vec<String>,
    #[serde(default)]
    pub antonyms: Vec<String>,
}
