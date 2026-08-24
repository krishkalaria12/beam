use serde::{Deserialize, Serialize};

/// Dictionary response with detailed definitions
#[derive(Debug, Serialize, Clone)]
pub struct DictionaryResponse {
    pub word: String,
    pub entries: Vec<Entry>,
}

#[derive(Debug, Serialize, Clone)]
pub struct Entry {
    pub part_of_speech: String,
    pub senses: Vec<Sense>,
}

#[derive(Debug, Serialize, Clone)]
pub struct Sense {
    pub definition: String,
    pub synonyms: Vec<String>,
    pub antonyms: Vec<String>,
    pub examples: Vec<String>,
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
    #[serde(default)]
    pub examples: Vec<String>,
}
