use papaya::HashMap;

use crate::config::config;
use crate::dictionary::error::{Error, Result};
use crate::dictionary::language::detect_language_code;
use crate::dictionary::model::{ApiResponse, DictionaryResponse, Meaning};
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
        .map_err(|e| Error::RequestError(e.to_string()))?;

    let api_response: ApiResponse =
        serde_json::from_str(&response_text).map_err(|e| Error::ParseError(e.to_string()))?;

    let meanings_map: HashMap<String, Vec<String>> = HashMap::new();
    let meanings_pin = meanings_map.pin();

    let mut all_synonyms = Vec::new();
    let mut all_antonyms = Vec::new();

    for entry in api_response.entries {
        let pos = entry
            .part_of_speech
            .unwrap_or_else(|| "unknown".to_string());

        all_synonyms.extend(entry.synonyms);
        all_antonyms.extend(entry.antonyms);

        for sense in entry.senses {
            if let Some(def) = sense.definition {
                let mut definitions = meanings_pin.get(&pos).cloned().unwrap_or_default();
                definitions.push(def);
                meanings_pin.insert(pos.clone(), definitions);
            }

            all_synonyms.extend(sense.synonyms);
            all_antonyms.extend(sense.antonyms);
        }
    }

    let meanings: Vec<Meaning> = meanings_pin
        .iter()
        .map(|(part_of_speech, definitions)| Meaning {
            part_of_speech: part_of_speech.clone(),
            definitions: definitions.clone(),
        })
        .collect();

    all_synonyms.sort();
    all_synonyms.dedup();
    all_antonyms.sort();
    all_antonyms.dedup();

    if meanings.is_empty() && all_synonyms.is_empty() && all_antonyms.is_empty() {
        return Ok(None);
    }

    Ok(Some(DictionaryResponse {
        word: api_response.word,
        meanings,
        synonyms: all_synonyms,
        antonyms: all_antonyms,
    }))
}
