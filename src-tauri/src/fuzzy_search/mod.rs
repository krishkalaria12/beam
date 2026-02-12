use nucleo::pattern::{CaseMatching, Normalization, Pattern};
use nucleo::{Config, Matcher, Utf32Str};

use crate::applications::app_entry::AppEntry;

pub mod error;

pub fn fuzzy_match_applications(
    applications: Vec<AppEntry>,
    query: &str,
    limit: usize,
) -> Vec<AppEntry> {
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return Vec::new();
    }

    let pattern = Pattern::parse(normalized_query, CaseMatching::Ignore, Normalization::Smart);

    let mut matcher = Matcher::new(Config::DEFAULT.match_paths());
    let mut scratch = Vec::new();
    let mut matches: Vec<(u32, AppEntry)> = Vec::new();

    for application in applications {
        scratch.clear();
        let name_score =
            pattern.score(Utf32Str::new(&application.name, &mut scratch), &mut matcher);

        scratch.clear();
        let description_score = pattern.score(
            Utf32Str::new(&application.description, &mut scratch),
            &mut matcher,
        );

        let Some(score) = name_score
            .map(|value| value * 4 + description_score.unwrap_or(0))
            .or(description_score)
        else {
            continue;
        };

        matches.push((score, application));
    }

    matches.sort_by(|(first_score, first_app), (second_score, second_app)| {
        second_score
            .cmp(first_score)
            .then_with(|| first_app.name.cmp(&second_app.name))
    });

    matches.truncate(limit);
    matches.into_iter().map(|(_, app)| app).collect()
}
