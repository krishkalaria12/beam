use std::collections::HashSet;

use super::error::{FocusError, Result};
use super::types::{FocusCategory, FocusCategoryInput, FocusCategoryKind, FocusSessionDraft};

pub fn normalize_text(value: &str) -> Option<String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized.to_string())
    }
}

pub fn normalize_rule(value: &str) -> Option<String> {
    let normalized = value.trim().trim_start_matches('@').to_ascii_lowercase();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

pub fn normalize_rules(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();
    for value in values {
        let Some(rule) = normalize_rule(&value) else {
            continue;
        };
        if seen.insert(rule.clone()) {
            normalized.push(rule);
        }
    }
    normalized.sort();
    normalized
}

pub fn normalize_website_rules(values: Vec<String>) -> Vec<String> {
    let mut expanded = Vec::new();
    for value in values {
        expanded.extend(
            value
                .split(|character: char| character.is_whitespace() || character == ',')
                .map(str::to_string),
        );
    }
    normalize_rules(expanded)
}

pub fn normalize_identifiers(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();
    for value in values {
        let Some(identifier) = normalize_text(&value) else {
            continue;
        };
        if seen.insert(identifier.clone()) {
            normalized.push(identifier);
        }
    }
    normalized
}

pub fn normalize_category_input(input: FocusCategoryInput, now: i64) -> Result<FocusCategory> {
    let title = normalize_text(&input.title).ok_or(FocusError::MissingCategoryTitle)?;
    let id = input
        .id
        .and_then(|value| normalize_text(&value))
        .unwrap_or_else(|| nanoid::nanoid!());

    Ok(FocusCategory {
        id,
        title,
        apps: normalize_rules(input.apps),
        websites: normalize_website_rules(input.websites),
        kind: FocusCategoryKind::Custom,
        created_at: now,
        updated_at: now,
    })
}

pub fn normalize_draft(mut draft: FocusSessionDraft) -> Result<FocusSessionDraft> {
    draft.goal = normalize_text(&draft.goal).ok_or(FocusError::MissingGoal)?;
    draft.category_ids = normalize_identifiers(draft.category_ids);
    draft.apps = normalize_rules(draft.apps);
    draft.websites = normalize_website_rules(draft.websites);
    if matches!(draft.duration_seconds, Some(0)) {
        draft.duration_seconds = None;
    }
    Ok(draft)
}

fn active_categories<'a>(
    categories: &'a [FocusCategory],
    category_ids: &[String],
) -> Vec<&'a FocusCategory> {
    let selected: HashSet<&str> = category_ids.iter().map(String::as_str).collect();
    categories
        .iter()
        .filter(|category| selected.contains(category.id.as_str()))
        .collect()
}

pub fn resolve_rules(
    categories: &[FocusCategory],
    category_ids: &[String],
    direct_apps: &[String],
    direct_websites: &[String],
) -> (Vec<String>, Vec<String>) {
    let mut apps = direct_apps.to_vec();
    let mut websites = direct_websites.to_vec();
    for category in active_categories(categories, category_ids) {
        apps.extend(category.apps.clone());
        websites.extend(category.websites.clone());
    }

    (normalize_rules(apps), normalize_website_rules(websites))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::focus::types::FocusSessionMode;

    #[test]
    fn resolves_category_and_direct_rules_without_duplicates() {
        let categories = vec![FocusCategory {
            id: "work".to_string(),
            title: "Work".to_string(),
            apps: vec!["slack".to_string(), "discord".to_string()],
            websites: vec!["x.com".to_string()],
            kind: FocusCategoryKind::Custom,
            created_at: 0,
            updated_at: 0,
        }];

        let (apps, websites) = resolve_rules(
            &categories,
            &["work".to_string()],
            &["Slack".to_string(), "Steam".to_string()],
            &["X.com".to_string(), "reddit.com".to_string()],
        );

        assert_eq!(apps, vec!["discord", "slack", "steam"]);
        assert_eq!(websites, vec!["reddit.com", "x.com"]);
    }

    #[test]
    fn zero_duration_becomes_untimed() {
        let draft = normalize_draft(FocusSessionDraft {
            goal: "Write".to_string(),
            duration_seconds: Some(0),
            mode: FocusSessionMode::Block,
            category_ids: Vec::new(),
            apps: Vec::new(),
            websites: Vec::new(),
        })
        .expect("draft");

        assert_eq!(draft.duration_seconds, None);
    }

    #[test]
    fn category_ids_preserve_case_and_are_deduplicated() {
        let draft = normalize_draft(FocusSessionDraft {
            goal: "Write".to_string(),
            duration_seconds: Some(25 * 60),
            mode: FocusSessionMode::Block,
            category_ids: vec![
                "AbC123".to_string(),
                " AbC123 ".to_string(),
                "xyz".to_string(),
            ],
            apps: Vec::new(),
            websites: Vec::new(),
        })
        .expect("draft");

        assert_eq!(draft.category_ids, vec!["AbC123", "xyz"]);
    }

    #[test]
    fn website_rules_accept_spaces_commas_and_newlines() {
        let rules = normalize_website_rules(vec![
            "x.com hotstar.com".to_string(),
            "reddit.com,\nyoutube.com".to_string(),
            "X.com".to_string(),
        ]);

        assert_eq!(
            rules,
            vec!["hotstar.com", "reddit.com", "x.com", "youtube.com"]
        );
    }
}
