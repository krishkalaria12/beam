use super::error::{DictionaryError, Result};
use super::language::detect_language_code;
use super::model::{ApiResponse, DictionaryResponse, Entry, Sense};
use crate::config::config;
use crate::http::get_async;

#[tauri::command]
pub async fn get_definition(
    word: String,
    language: Option<String>,
) -> Result<Option<DictionaryResponse>> {
    let lang = match language {
        Some(lang) => lang,
        None => detect_language_code(&word).unwrap_or("en").to_string(),
    };
    let url = format!("{}/{}/{}", config().DICTIONARY_API_URL, lang, word);

    let response_text = get_async(&url)
        .await
        .map_err(|e| DictionaryError::RequestError(e.to_string()))?;

    let api_response: ApiResponse = serde_json::from_str(&response_text)
        .map_err(|e| DictionaryError::ParseError(e.to_string()))?;

    let mut entries = Vec::new();

    for entry in api_response.entries {
        let pos = entry
            .part_of_speech
            .unwrap_or_else(|| "unknown".to_string());

        // Skip noun entries
        if pos.to_lowercase() == "noun" {
            continue;
        }

        let mut senses = Vec::new();

        for sense in entry.senses {
            if let Some(definition) = sense.definition {
                let mut all_synonyms = sense.synonyms.clone();
                let mut all_antonyms = sense.antonyms.clone();

                // Add entry-level synonyms/antonyms to each sense
                all_synonyms.extend(entry.synonyms.clone());
                all_antonyms.extend(entry.antonyms.clone());

                all_synonyms.sort();
                all_synonyms.dedup();
                all_antonyms.sort();
                all_antonyms.dedup();

                senses.push(Sense {
                    definition,
                    synonyms: all_synonyms,
                    antonyms: all_antonyms,
                    examples: sense.examples,
                });
            }
        }

        if !senses.is_empty() {
            entries.push(Entry {
                part_of_speech: pos,
                senses,
            });
        }
    }

    if entries.is_empty() {
        return Ok(None);
    }

    Ok(Some(DictionaryResponse {
        word: api_response.word,
        entries,
    }))
}
