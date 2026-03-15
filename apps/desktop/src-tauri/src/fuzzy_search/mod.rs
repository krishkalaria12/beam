use nucleo::pattern::{CaseMatching, Normalization, Pattern};
use nucleo::{Config, Matcher, Utf32Str};
use rayon::prelude::*;

use crate::applications::app_entry::AppEntry;

pub mod error;

const MATCH_CONFIG: Config = Config::DEFAULT;

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

    // Parallel score calculation using rayon
    let mut matches: Vec<(u32, AppEntry)> = applications
        .into_par_iter()
        .filter_map(|application| {
            let mut matcher = Matcher::new(MATCH_CONFIG);
            let mut scratch = Vec::new();

            // Score the application name
            let name_score =
                pattern.score(Utf32Str::new(&application.name, &mut scratch), &mut matcher);

            // Score the application description
            scratch.clear();
            let description_score = pattern.score(
                Utf32Str::new(&application.description, &mut scratch),
                &mut matcher,
            );

            // Combine scores: name match is weighted higher (4x)
            let combined_score = match (name_score, description_score) {
                (Some(name), Some(desc)) => Some(name * 4 + desc),
                (Some(name), None) => Some(name * 4),
                (None, Some(desc)) => Some(desc),
                (None, None) => None,
            }?;

            Some((combined_score, application))
        })
        .collect();

    // Sort by score (highest first), then by name for stable ordering
    matches.par_sort_unstable_by(|(first_score, first_app), (second_score, second_app)| {
        second_score
            .cmp(first_score)
            .then_with(|| first_app.name.cmp(&second_app.name))
    });

    // Truncate to limit and return applications
    matches.truncate(limit);
    matches.into_iter().map(|(_, app)| app).collect()
}
