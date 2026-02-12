use super::helpers::{collapse_spaces, replace_phrase_with_boundaries};

pub fn normalize_conversion_query(query: &str) -> String {
    let lowered = query.to_lowercase();
    let normalized_spaces = collapse_spaces(&lowered);
    let mut normalized = normalized_spaces.replace(" into ", " to ");

    let generic_currency_aliases = [
        ("dollars", "usd"),
        ("dollar", "usd"),
        ("rupees", "inr"),
        ("rupee", "inr"),
        ("euros", "eur"),
        ("euro", "eur"),
        ("pounds", "gbp"),
        ("pound", "gbp"),
        ("yen", "jpy"),
    ];

    for (alias, code) in generic_currency_aliases {
        normalized = replace_phrase_with_boundaries(&normalized, alias, code);
    }

    if normalized.contains(" in ") && normalized.chars().any(|ch| ch.is_ascii_digit()) {
        normalized.replace(" in ", " to ")
    } else {
        normalized
    }
}
