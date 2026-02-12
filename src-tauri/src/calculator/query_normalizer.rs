fn is_word_char(ch: char) -> bool {
    ch.is_alphanumeric()
}

fn collapse_spaces(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn replace_phrase_with_boundaries(input: &str, phrase: &str, replacement: &str) -> String {
    if phrase.is_empty() || phrase == replacement {
        return input.to_string();
    }

    let mut output = String::new();
    let mut index = 0;

    while let Some(found_at) = input[index..].find(phrase) {
        let start = index + found_at;
        let end = start + phrase.len();

        let prev = input[..start].chars().next_back();
        let next = input[end..].chars().next();
        let has_valid_boundary = !prev.is_some_and(is_word_char) && !next.is_some_and(is_word_char);

        if has_valid_boundary {
            output.push_str(&input[index..start]);
            output.push_str(replacement);
            index = end;
        } else {
            let step = input[start..]
                .chars()
                .next()
                .map(char::len_utf8)
                .unwrap_or(1);
            let next_index = start + step;
            output.push_str(&input[index..next_index]);
            index = next_index;
        }
    }

    output.push_str(&input[index..]);
    output
}

pub fn normalize_command_expression(expression: &str) -> String {
    let lowered = expression.to_lowercase();
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
