use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use serde_json::Value;

use super::types::{
    ScriptCommandArgumentDefinition, ScriptCommandArgumentOption, ScriptCommandArgumentType,
};

const MAX_METADATA_LINES: usize = 120;

fn parse_boolean(value: &Value) -> Option<bool> {
    match value {
        Value::Bool(value) => Some(*value),
        Value::Number(number) => Some(number.as_i64().unwrap_or_default() != 0),
        Value::String(value) => {
            let normalized = value.trim().to_lowercase();
            Some(normalized == "1" || normalized == "true" || normalized == "yes")
        }
        _ => None,
    }
}

fn parse_argument_type(value: Option<&str>) -> ScriptCommandArgumentType {
    match value.unwrap_or("text").trim().to_lowercase().as_str() {
        "password" => ScriptCommandArgumentType::Password,
        "dropdown" => ScriptCommandArgumentType::Dropdown,
        _ => ScriptCommandArgumentType::Text,
    }
}

fn parse_metadata_line(line: &str) -> Option<(String, String)> {
    let trimmed = line.trim_start();
    let body = if let Some(rest) = trimmed.strip_prefix('#') {
        rest.trim_start()
    } else if let Some(rest) = trimmed.strip_prefix("//") {
        rest.trim_start()
    } else if let Some(rest) = trimmed.strip_prefix("--") {
        rest.trim_start()
    } else {
        return None;
    };

    let meta = body.strip_prefix("@raycast.")?.trim_start();
    if meta.is_empty() {
        return None;
    }

    let mut key_end = 0usize;
    for (index, ch) in meta.char_indices() {
        if ch.is_whitespace() {
            break;
        }
        key_end = index + ch.len_utf8();
    }

    if key_end == 0 {
        return None;
    }

    let key = meta[..key_end].trim().to_string();
    let value = meta[key_end..].trim().to_string();
    Some((key, value))
}

fn parse_argument_definition(raw: &str, index: u8) -> Option<ScriptCommandArgumentDefinition> {
    let parsed: Value = serde_json::from_str(raw.trim()).ok()?;
    let argument_type = parse_argument_type(parsed.get("type").and_then(Value::as_str));
    let placeholder = parsed
        .get("placeholder")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .unwrap_or_else(|| format!("Argument {index}"));

    let required = parsed
        .get("required")
        .and_then(parse_boolean)
        .or_else(|| {
            parsed
                .get("optional")
                .and_then(parse_boolean)
                .map(|optional| !optional)
        })
        .unwrap_or(true);

    let percent_encoded = parsed
        .get("percentEncoded")
        .and_then(parse_boolean)
        .unwrap_or(false);

    let title = parsed
        .get("title")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string);

    let data = if argument_type == ScriptCommandArgumentType::Dropdown {
        parsed
            .get("data")
            .and_then(Value::as_array)
            .map(|entries| {
                entries
                    .iter()
                    .filter_map(|entry| {
                        let title = entry
                            .get("title")
                            .and_then(Value::as_str)
                            .map(str::trim)
                            .filter(|value| !value.is_empty())
                            .map(ToString::to_string);
                        let value = entry
                            .get("value")
                            .and_then(Value::as_str)
                            .map(str::trim)
                            .filter(|value| !value.is_empty())
                            .map(ToString::to_string);
                        if title.is_none() && value.is_none() {
                            return None;
                        }
                        Some(ScriptCommandArgumentOption { title, value })
                    })
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default()
    } else {
        Vec::new()
    };

    Some(ScriptCommandArgumentDefinition {
        name: format!("argument{index}"),
        index,
        argument_type,
        title,
        placeholder,
        required,
        percent_encoded,
        data,
    })
}

pub(super) fn read_argument_definitions(path: &Path) -> Vec<ScriptCommandArgumentDefinition> {
    let file = match File::open(path) {
        Ok(file) => file,
        Err(_) => return Vec::new(),
    };

    let reader = BufReader::new(file);
    let mut definitions: Vec<ScriptCommandArgumentDefinition> = Vec::new();

    for line_result in reader.lines().take(MAX_METADATA_LINES) {
        let line = match line_result {
            Ok(line) => line,
            Err(_) => continue,
        };

        let (key, value) = match parse_metadata_line(&line) {
            Some(parts) => parts,
            None => continue,
        };

        let index_text = match key.strip_prefix("argument") {
            Some(index_text) => index_text,
            None => continue,
        };
        let index = match index_text.parse::<u8>() {
            Ok(index) if index > 0 => index,
            _ => continue,
        };

        if let Some(parsed) = parse_argument_definition(&value, index) {
            if let Some(existing_index) = definitions.iter().position(|entry| entry.index == index)
            {
                definitions[existing_index] = parsed;
            } else {
                definitions.push(parsed);
            }
        }
    }

    definitions.sort_by_key(|entry| entry.index);
    definitions
}
