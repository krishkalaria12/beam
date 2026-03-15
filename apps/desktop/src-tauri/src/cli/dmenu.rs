use std::fs;
use std::io::{self, Read};

use nucleo::pattern::{CaseMatching, Normalization, Pattern};
use nucleo::{Config, Matcher, Utf32Str};
use regex::Regex;
use scraper::Html;
use serde::{Deserialize, Serialize};

use crate::cli::error::{CliError, Result};

const MATCH_CONFIG: Config = Config::DEFAULT;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum DmenuSearchMode {
    #[default]
    BeamFuzzy,
    Compat,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DmenuRow {
    pub id: String,
    pub index: usize,
    pub raw_text: String,
    pub display_text: String,
    pub plain_text: String,
    pub icon: Option<String>,
    pub meta: String,
    pub info: Option<String>,
    pub nonselectable: bool,
    pub active: bool,
    pub urgent: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DmenuOptions {
    pub prompt: Option<String>,
    pub lines: usize,
    pub case_insensitive: bool,
    pub separator: String,
    pub output_format: String,
    pub select_text: Option<String>,
    pub message: Option<String>,
    pub only_match: bool,
    pub no_custom: bool,
    pub password: bool,
    pub markup_rows: bool,
    pub input_path: Option<String>,
    pub active_row_spec: Option<String>,
    pub urgent_row_spec: Option<String>,
    pub display_columns: Vec<usize>,
    pub display_column_separator: Option<String>,
    pub initial_query: String,
    pub dump: bool,
    pub ignored_options: Vec<String>,
    pub search_mode: DmenuSearchMode,
}

impl Default for DmenuOptions {
    fn default() -> Self {
        Self {
            prompt: None,
            lines: 15,
            case_insensitive: false,
            separator: "\n".to_string(),
            output_format: "s".to_string(),
            select_text: None,
            message: None,
            only_match: false,
            no_custom: false,
            password: false,
            markup_rows: false,
            input_path: None,
            active_row_spec: None,
            urgent_row_spec: None,
            display_columns: Vec::new(),
            display_column_separator: None,
            initial_query: String::new(),
            dump: false,
            ignored_options: Vec::new(),
            search_mode: DmenuSearchMode::BeamFuzzy,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DmenuRequest {
    pub request_id: String,
    pub prompt: Option<String>,
    pub message: Option<String>,
    pub lines: usize,
    pub password: bool,
    pub only_match: bool,
    pub no_custom: bool,
    pub markup_rows: bool,
    pub case_insensitive: bool,
    pub select_text: Option<String>,
    pub initial_query: String,
    pub search_mode: DmenuSearchMode,
    pub rows: Vec<DmenuRow>,
    pub restore_window_hidden: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DmenuResponse {
    pub request_id: String,
    pub accepted: bool,
    pub selected_index: Option<usize>,
    pub selected_text: Option<String>,
    pub filter_text: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DmenuClientExit {
    Success = 0,
    Cancelled = 1,
    Unsupported = 2,
}

impl DmenuClientExit {
    pub fn code(self) -> i32 {
        self as i32
    }
}

pub fn parse_dmenu_args(args: &[String], rofi_mode: bool) -> Result<DmenuOptions> {
    let mut options = DmenuOptions::default();
    let mut search_mode_from_flag: Option<DmenuSearchMode> = None;
    let mut search_mode_from_alias: Option<DmenuSearchMode> = None;
    let mut saw_rofi_dmenu_mode = false;
    let mut index = 0usize;

    while index < args.len() {
        let arg = args[index].trim();
        match arg {
            "-dmenu" => {
                if rofi_mode {
                    saw_rofi_dmenu_mode = true;
                } else {
                    options.ignored_options.push(arg.to_string());
                }
            }
            "-show" => {
                let value = args.get(index + 1).cloned().unwrap_or_default();
                return Err(CliError::UnsupportedRofiShow {
                    mode: value.trim().to_string(),
                });
            }
            "-multi-select" => {
                return Err(CliError::UnsupportedRofiMultiSelect);
            }
            "-p" => {
                options.prompt = Some(take_value(args, &mut index, arg)?);
            }
            "-l" => {
                let value = take_value(args, &mut index, arg)?;
                options.lines = value
                    .trim()
                    .parse::<usize>()
                    .map_err(|_| CliError::InvalidFlagValue {
                        flag: arg.to_string(),
                        value: value.clone(),
                    })?
                    .max(1);
            }
            "-i" => {
                options.case_insensitive = true;
            }
            "-sep" => {
                options.separator = take_value(args, &mut index, arg)?;
            }
            "-format" => {
                options.output_format = take_value(args, &mut index, arg)?;
            }
            "-select" => {
                options.select_text = Some(take_value(args, &mut index, arg)?);
            }
            "-mesg" => {
                options.message = Some(take_value(args, &mut index, arg)?);
            }
            "-only-match" => {
                options.only_match = true;
            }
            "-no-custom" => {
                options.no_custom = true;
            }
            "-a" => {
                options.active_row_spec = Some(take_value(args, &mut index, arg)?);
            }
            "-u" => {
                options.urgent_row_spec = Some(take_value(args, &mut index, arg)?);
            }
            "-password" => {
                options.password = true;
            }
            "-markup-rows" => {
                options.markup_rows = true;
            }
            "-display-columns" => {
                let raw = take_value(args, &mut index, arg)?;
                options.display_columns = raw
                    .split(',')
                    .map(str::trim)
                    .filter(|part| !part.is_empty())
                    .map(|part| {
                        part.parse::<usize>()
                            .map_err(|_| CliError::InvalidDisplayColumn {
                                value: part.to_string(),
                            })
                    })
                    .collect::<Result<Vec<_>>>()?;
            }
            "-display-column-separator" => {
                options.display_column_separator = Some(take_value(args, &mut index, arg)?);
            }
            "-input" => {
                options.input_path = Some(take_value(args, &mut index, arg)?);
            }
            "-filter" => {
                options.initial_query = take_value(args, &mut index, arg)?;
            }
            "-dump" => {
                options.dump = true;
            }
            "--search-mode" => {
                search_mode_from_flag =
                    Some(parse_search_mode(&take_value(args, &mut index, arg)?)?);
            }
            "--beam-fuzzy" => {
                search_mode_from_alias = Some(DmenuSearchMode::BeamFuzzy);
            }
            "--compat-match" => {
                search_mode_from_alias = Some(DmenuSearchMode::Compat);
            }
            "-b" | "-f" | "-sync" | "-keep-right" => {
                options.ignored_options.push(arg.to_string());
            }
            "-fn" | "-nb" | "-nf" | "-sb" | "-sf" | "-m" | "-theme" | "-theme-str" | "-monitor"
            | "-location" | "-xoffset" | "-yoffset" | "-width" | "-window-title" | "-w" => {
                let ignored = take_value(args, &mut index, arg)?;
                options.ignored_options.push(format!("{arg}={ignored}"));
            }
            _ if arg.starts_with('-') => {
                return Err(CliError::UnsupportedCompatibilityFlag {
                    flag: arg.to_string(),
                });
            }
            _ => {
                options.ignored_options.push(arg.to_string());
            }
        }

        index += 1;
    }

    if rofi_mode && !saw_rofi_dmenu_mode {
        return Err(CliError::RofiRequiresDmenuMode);
    }

    options.search_mode = search_mode_from_flag
        .or(search_mode_from_alias)
        .unwrap_or(DmenuSearchMode::BeamFuzzy);

    Ok(options)
}

pub fn read_rows(options: &DmenuOptions) -> Result<Vec<DmenuRow>> {
    let raw_input = if let Some(path) = &options.input_path {
        fs::read_to_string(path).map_err(|source| CliError::InputFileRead {
            path: path.clone(),
            source,
        })?
    } else {
        let mut buffer = String::new();
        io::stdin()
            .read_to_string(&mut buffer)
            .map_err(|source| CliError::StdinRead { source })?;
        buffer
    };

    parse_rows_from_input(&raw_input, options)
}

pub fn parse_rows_from_input(input: &str, options: &DmenuOptions) -> Result<Vec<DmenuRow>> {
    let entries = split_entries(input, &options.separator);
    let active_rows = parse_row_spec(options.active_row_spec.as_deref(), entries.len())?;
    let urgent_rows = parse_row_spec(options.urgent_row_spec.as_deref(), entries.len())?;
    let column_regex = if let Some(separator) = options.display_column_separator.as_deref() {
        Some(
            Regex::new(separator).map_err(|source| CliError::InvalidDisplayColumnSeparator {
                value: separator.to_string(),
                source,
            })?,
        )
    } else {
        None
    };

    let mut rows = Vec::with_capacity(entries.len());
    for (index, entry) in entries.into_iter().enumerate() {
        let (label, metadata) = split_metadata(entry);
        let parsed_metadata = parse_row_metadata(metadata);
        let display_text =
            build_display_text(label, column_regex.as_ref(), &options.display_columns);
        let plain_text = strip_markup(&display_text);

        rows.push(DmenuRow {
            id: format!("row-{index}"),
            index,
            raw_text: label.to_string(),
            display_text,
            plain_text,
            icon: parsed_metadata.icon,
            meta: parsed_metadata.meta,
            info: parsed_metadata.info,
            nonselectable: parsed_metadata.nonselectable,
            active: active_rows.contains(&index),
            urgent: urgent_rows.contains(&index),
        });
    }

    Ok(rows)
}

pub fn rank_rows(rows: &[DmenuRow], options: &DmenuOptions, query: &str) -> Vec<String> {
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return rows.iter().map(|row| row.id.clone()).collect();
    }

    match options.search_mode {
        DmenuSearchMode::Compat => {
            compat_match_rows(rows, normalized_query, options.case_insensitive)
        }
        DmenuSearchMode::BeamFuzzy => {
            beam_fuzzy_rows(rows, normalized_query, options.case_insensitive)
        }
    }
}

pub fn format_dmenu_output(
    rows: &[DmenuRow],
    options: &DmenuOptions,
    response: &DmenuResponse,
) -> Result<String> {
    let selected_row = response
        .selected_index
        .and_then(|selected_index| rows.iter().find(|row| row.index == selected_index));
    let selected_text = response
        .selected_text
        .clone()
        .or_else(|| selected_row.map(|row| row.raw_text.clone()))
        .unwrap_or_default();

    let mut output = String::new();
    for token in options.output_format.chars() {
        match token {
            's' => output.push_str(&selected_text),
            'i' => {
                if let Some(row) = selected_row {
                    output.push_str(&row.index.to_string());
                }
            }
            'd' => {
                if let Some(row) = selected_row {
                    output.push_str(&(row.index + 1).to_string());
                }
            }
            'q' => output.push_str(shell_words::quote(&selected_text).as_ref()),
            'p' => output.push_str(&strip_markup(&selected_text)),
            'f' => output.push_str(&response.filter_text),
            'F' => output.push_str(shell_words::quote(&response.filter_text).as_ref()),
            _ => return Err(CliError::UnsupportedOutputFormatToken { token }),
        }
    }
    Ok(output)
}

#[derive(Debug, Clone, Default)]
struct ParsedRowMetadata {
    icon: Option<String>,
    meta: String,
    info: Option<String>,
    nonselectable: bool,
}

fn take_value(args: &[String], index: &mut usize, flag: &str) -> Result<String> {
    let value = args
        .get(*index + 1)
        .cloned()
        .ok_or_else(|| CliError::MissingFlagValue {
            flag: flag.to_string(),
        })?;
    *index += 1;
    Ok(value)
}

fn parse_search_mode(value: &str) -> Result<DmenuSearchMode> {
    match value.trim() {
        "beam-fuzzy" => Ok(DmenuSearchMode::BeamFuzzy),
        "compat" => Ok(DmenuSearchMode::Compat),
        other => Err(CliError::UnsupportedSearchMode {
            value: other.to_string(),
        }),
    }
}

fn split_entries<'a>(input: &'a str, separator: &str) -> Vec<&'a str> {
    let mut parts: Vec<&str> = if separator == "\n" {
        input.lines().collect()
    } else if separator.is_empty() {
        vec![input]
    } else {
        input.split(separator).collect()
    };

    while matches!(parts.last(), Some(last) if last.is_empty()) {
        parts.pop();
    }

    parts
}

fn split_metadata(entry: &str) -> (&str, Option<&str>) {
    if let Some((label, metadata)) = entry.split_once('\0') {
        (label, Some(metadata))
    } else {
        (entry, None)
    }
}

fn parse_row_metadata(metadata: Option<&str>) -> ParsedRowMetadata {
    let Some(metadata) = metadata else {
        return ParsedRowMetadata::default();
    };

    let mut parsed = ParsedRowMetadata::default();
    let mut parts = metadata.split('\x1f');
    while let Some(key) = parts.next() {
        let Some(value) = parts.next() else {
            break;
        };

        match key.trim() {
            "icon" => {
                let normalized = value.trim();
                if !normalized.is_empty() {
                    parsed.icon = Some(normalized.to_string());
                }
            }
            "meta" => {
                if !parsed.meta.is_empty() {
                    parsed.meta.push(' ');
                }
                parsed.meta.push_str(value.trim());
            }
            "info" => {
                let normalized = value.trim();
                if !normalized.is_empty() {
                    parsed.info = Some(normalized.to_string());
                }
            }
            "nonselectable" => {
                parsed.nonselectable = matches!(value.trim(), "true" | "1" | "yes");
            }
            _ => {}
        }
    }

    parsed
}

fn build_display_text(label: &str, separator: Option<&Regex>, display_columns: &[usize]) -> String {
    if display_columns.is_empty() {
        return label.to_string();
    }

    let columns = if let Some(separator) = separator {
        separator.split(label).collect::<Vec<_>>()
    } else {
        label.split('\t').collect::<Vec<_>>()
    };

    let rendered = display_columns
        .iter()
        .filter_map(|column| columns.get(column.saturating_sub(1)))
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();

    if rendered.is_empty() {
        label.to_string()
    } else {
        rendered.join(" ")
    }
}

fn parse_row_spec(
    spec: Option<&str>,
    total_rows: usize,
) -> Result<std::collections::HashSet<usize>> {
    let mut indices = std::collections::HashSet::new();
    let Some(spec) = spec.map(str::trim).filter(|spec| !spec.is_empty()) else {
        return Ok(indices);
    };

    for part in spec
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
    {
        if let Some((start, end)) = part.split_once(':') {
            let start_index = parse_signed_index(start, total_rows)?.unwrap_or(0);
            let end_index = parse_signed_index(end, total_rows)?.unwrap_or(total_rows);
            let start_index = start_index.min(total_rows);
            let end_index = end_index.min(total_rows);
            for value in start_index.min(end_index)..start_index.max(end_index) {
                indices.insert(value);
            }
            continue;
        }

        if let Some((start, end)) = part.split_once('-') {
            if !start.is_empty() && !end.is_empty() {
                let start_index = parse_signed_index(start, total_rows)?.ok_or_else(|| {
                    CliError::InvalidRowRange {
                        value: part.to_string(),
                    }
                })?;
                let end_index = parse_signed_index(end, total_rows)?.ok_or_else(|| {
                    CliError::InvalidRowRange {
                        value: part.to_string(),
                    }
                })?;
                for value in start_index.min(end_index)..=start_index.max(end_index) {
                    if value < total_rows {
                        indices.insert(value);
                    }
                }
                continue;
            }
        }

        if let Some(index) = parse_signed_index(part, total_rows)? {
            if index < total_rows {
                indices.insert(index);
            }
        }
    }

    Ok(indices)
}

fn parse_signed_index(value: &str, total_rows: usize) -> Result<Option<usize>> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let parsed = trimmed
        .parse::<isize>()
        .map_err(|_| CliError::InvalidRowIndex {
            value: trimmed.to_string(),
        })?;
    if parsed >= 0 {
        return Ok(Some(parsed as usize));
    }

    let translated = total_rows as isize + parsed;
    if translated < 0 {
        return Ok(Some(0));
    }

    Ok(Some(translated as usize))
}

fn compat_match_rows(rows: &[DmenuRow], query: &str, case_insensitive: bool) -> Vec<String> {
    let tokens = tokenize(query, case_insensitive);
    rows.iter()
        .filter(|row| {
            let corpus = build_search_corpus(row, case_insensitive);
            tokens.iter().all(|token| corpus.contains(token))
        })
        .map(|row| row.id.clone())
        .collect()
}

fn beam_fuzzy_rows(rows: &[DmenuRow], query: &str, case_insensitive: bool) -> Vec<String> {
    let pattern = Pattern::parse(
        query,
        if case_insensitive {
            CaseMatching::Ignore
        } else {
            CaseMatching::Respect
        },
        Normalization::Smart,
    );

    let mut matches = rows
        .iter()
        .filter_map(|row| {
            let mut matcher = Matcher::new(MATCH_CONFIG);
            let mut scratch = Vec::new();
            let search_text = format!("{} {} {}", row.display_text, row.plain_text, row.meta);
            let score = pattern.score(Utf32Str::new(&search_text, &mut scratch), &mut matcher)?;
            Some((score, row.index, row.id.clone()))
        })
        .collect::<Vec<_>>();

    matches.sort_by(|left, right| right.0.cmp(&left.0).then_with(|| left.1.cmp(&right.1)));
    matches.into_iter().map(|(_, _, id)| id).collect()
}

fn tokenize(query: &str, case_insensitive: bool) -> Vec<String> {
    let normalized = if case_insensitive {
        query.to_lowercase()
    } else {
        query.to_string()
    };

    normalized
        .split_whitespace()
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

fn build_search_corpus(row: &DmenuRow, case_insensitive: bool) -> String {
    let corpus = format!("{} {} {}", row.display_text, row.plain_text, row.meta);
    if case_insensitive {
        corpus.to_lowercase()
    } else {
        corpus
    }
}

fn strip_markup(value: &str) -> String {
    let fragment = Html::parse_fragment(value);
    let text = fragment.root_element().text().collect::<Vec<_>>().join("");
    if text.trim().is_empty() {
        value.to_string()
    } else {
        text
    }
}
