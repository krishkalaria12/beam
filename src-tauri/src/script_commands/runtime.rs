use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

pub(super) fn read_shebang_args(path: &Path) -> Option<Vec<String>> {
    let file = File::open(path).ok()?;
    let mut reader = BufReader::new(file);
    let mut first_line = String::new();
    if reader.read_line(&mut first_line).is_err() {
        return None;
    }

    let trimmed = first_line.trim();
    if !trimmed.starts_with("#!") {
        return None;
    }

    let command_text = trimmed.trim_start_matches("#!").trim();
    if command_text.is_empty() {
        return None;
    }

    match shell_words::split(command_text) {
        Ok(parts) if !parts.is_empty() => Some(parts),
        _ => {
            let fallback = command_text
                .split_whitespace()
                .map(|part| part.to_string())
                .collect::<Vec<_>>();
            if fallback.is_empty() {
                None
            } else {
                Some(fallback)
            }
        }
    }
}

pub(super) fn has_shebang(path: &Path) -> bool {
    read_shebang_args(path).is_some()
}

#[cfg(unix)]
pub(super) fn is_executable(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;

    std::fs::metadata(path)
        .map(|metadata| metadata.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

#[cfg(not(unix))]
pub(super) fn is_executable(_path: &Path) -> bool {
    false
}
