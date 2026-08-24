use std::collections::HashSet;

use beam_core::BeamContext;

// PORT: apps/desktop/src-tauri/src/emoji.rs
// The tauri_plugin_store handle became the shared settings store on
// BeamContext — same settings.json, same keys.

const PINNED_EMOJI_HEXCODES_KEY: &str = "emoji_pinned_hexcodes";

pub fn get_pinned_emoji_hexcodes(cx: &BeamContext) -> Result<Vec<String>, String> {
    read_pinned_emoji_hexcodes(cx.settings())
}

pub fn set_emoji_pinned(
    cx: &BeamContext,
    hexcode: String,
    pinned: bool,
) -> Result<Vec<String>, String> {
    let normalized =
        normalize_hexcode(&hexcode).ok_or_else(|| "hexcode cannot be empty".to_string())?;
    let store = cx.settings();
    let mut hexcodes = read_pinned_emoji_hexcodes(store)?;

    if pinned {
        if !hexcodes.iter().any(|existing| existing == &normalized) {
            hexcodes.push(normalized);
        }
    } else {
        hexcodes.retain(|existing| existing != &normalized);
    }

    dedupe_keep_order(&mut hexcodes);
    save_pinned_emoji_hexcodes(store, &hexcodes)?;
    Ok(hexcodes)
}

fn read_pinned_emoji_hexcodes(store: &beam_core::JsonStore) -> Result<Vec<String>, String> {
    let Some(value) = store.get(PINNED_EMOJI_HEXCODES_KEY) else {
        return Ok(Vec::new());
    };

    let mut hexcodes =
        serde_json::from_value::<Vec<String>>(value).map_err(|error| error.to_string())?;
    hexcodes = hexcodes
        .into_iter()
        .filter_map(|hexcode| normalize_hexcode(&hexcode))
        .collect();
    dedupe_keep_order(&mut hexcodes);
    Ok(hexcodes)
}

fn save_pinned_emoji_hexcodes(
    store: &beam_core::JsonStore,
    hexcodes: &[String],
) -> Result<(), String> {
    store
        .set(PINNED_EMOJI_HEXCODES_KEY, &hexcodes.to_vec())
        .map_err(|error| error.to_string())
}

fn normalize_hexcode(hexcode: &str) -> Option<String> {
    let normalized = hexcode.trim().to_uppercase();
    if normalized.is_empty() {
        return None;
    }

    Some(normalized)
}

fn dedupe_keep_order(values: &mut Vec<String>) {
    let mut seen = HashSet::new();
    values.retain(|value| seen.insert(value.clone()));
}

#[cfg(test)]
mod tests {
    use super::*;
    use beam_core::BeamPaths;

    fn test_context() -> BeamContext {
        let dir = std::env::temp_dir().join(format!("beam-emoji-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let paths = BeamPaths::from_platform(
            beam_core::HostPlatform::Linux,
            Some(dir.into_os_string()),
            None,
            None,
            None,
            None,
            None,
        )
        .unwrap();
        BeamContext::with_paths(paths).unwrap()
    }

    #[test]
    fn pinned_emoji_round_trip_and_dedupe() {
        let cx = test_context();
        assert!(get_pinned_emoji_hexcodes(&cx).unwrap().is_empty());

        let pinned = set_emoji_pinned(&cx, "1f600".into(), true).unwrap();
        assert_eq!(pinned, vec!["1F600".to_string()]);

        // Normalised to uppercase, deduped, order preserved.
        set_emoji_pinned(&cx, " 1f600 ".into(), true).unwrap();
        set_emoji_pinned(&cx, "1F601".into(), true).unwrap();
        let pinned = get_pinned_emoji_hexcodes(&cx).unwrap();
        assert_eq!(pinned, vec!["1F600".to_string(), "1F601".to_string()]);

        let pinned = set_emoji_pinned(&cx, "1F600".into(), false).unwrap();
        assert_eq!(pinned, vec!["1F601".to_string()]);
    }

    #[test]
    fn empty_hexcodes_are_rejected() {
        let cx = test_context();
        assert!(set_emoji_pinned(&cx, "  ".into(), true).is_err());
    }
}
