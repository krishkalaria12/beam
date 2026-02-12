pub fn is_word_char(ch: char) -> bool {
    ch.is_alphanumeric()
}

pub fn collapse_spaces(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn normalize_alias_text(text: &str) -> String {
    let mut lowered = String::new();
    for ch in text.chars() {
        lowered.extend(ch.to_lowercase());
    }

    let mut normalized = String::new();
    let mut last_was_space = true;
    for ch in lowered.chars() {
        if ch.is_alphanumeric() {
            normalized.push(ch);
            last_was_space = false;
        } else if !last_was_space {
            normalized.push(' ');
            last_was_space = true;
        }
    }

    normalized.trim().to_string()
}

pub fn replace_phrase_with_boundaries(input: &str, phrase: &str, replacement: &str) -> String {
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
