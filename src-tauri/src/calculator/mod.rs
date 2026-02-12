pub mod calculation;
pub mod error;
pub mod plugin;
pub mod settings;
pub mod timezone;

use std::collections::{BTreeMap, HashMap};
use std::thread;
use std::time::{Duration, Instant};

use chrono_tz::Tz;
use serde_derive::{Deserialize, Serialize};
use serde_json::from_str;
use tauri::command;

use crate::calculator::calculation::Calculation;
use crate::calculator::error::{Error, Result};
use crate::calculator::plugin::PluginManager;
use crate::calculator::settings::Settings;
use crate::calculator::timezone::{update_current_timezone, TIMEZONE_LIST, UTC_TIMEZONE};
use crate::config::config;
use crate::http::Request;

#[derive(Default, Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct Currency {
    pub rate: f64,

    #[serde(default)]
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CalculationOutput {
    pub value: String,
    pub is_error: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct CalculatorCommandResponse {
    pub outputs: Vec<CalculationOutput>,
    pub pending_requests: bool,
}

fn is_word_char(ch: char) -> bool {
    ch.is_alphanumeric()
}

fn collapse_spaces(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn normalize_alias_text(text: &str) -> String {
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

#[derive(Deserialize, Serialize)]
#[serde(default)]
pub struct CalculatorEngine {
    pub calculation: Calculation,

    #[serde(skip)]
    fetch_currencies: Option<Request>,

    #[serde(skip)]
    plugins: PluginManager,

    #[serde(skip)]
    currency_alias_rules: Vec<(String, String)>,

    pub settings: Settings,
}

impl Default for CalculatorEngine {
    fn default() -> Self {
        let timezone = match localzone::get_local_zone() {
            Some(tz) => match tz.parse::<Tz>() {
                Ok(tz) => {
                    let search_timezone = tz.to_string();
                    match TIMEZONE_LIST
                        .iter()
                        .find(|timezone| timezone.name == search_timezone)
                    {
                        Some(timezone) => timezone.clone(),
                        None => UTC_TIMEZONE.clone(),
                    }
                }
                Err(_) => UTC_TIMEZONE.clone(),
            },
            None => UTC_TIMEZONE.clone(),
        };

        let mut settings = Settings::default();
        settings.timezone = timezone;

        let mut calculation = Calculation::new();
        if let Err(error) = calculation.configure(&settings) {
            log::warn!("{error}");
        }

        Self {
            calculation,
            fetch_currencies: None,
            plugins: PluginManager::default(),
            currency_alias_rules: Vec::new(),
            settings,
        }
    }
}

impl CalculatorEngine {
    pub fn new() -> Self {
        Self::default()
    }

    fn register_alias(aliases: &mut HashMap<String, String>, alias: &str, code: &str) {
        let cleaned = collapse_spaces(alias.trim());
        if cleaned.is_empty() {
            return;
        }

        aliases.entry(cleaned).or_insert_with(|| code.to_string());
    }

    fn register_alias_variants(aliases: &mut HashMap<String, String>, alias: &str, code: &str) {
        let lowered = collapse_spaces(&alias.to_lowercase());
        Self::register_alias(aliases, &lowered, code);

        let normalized = normalize_alias_text(alias);
        Self::register_alias(aliases, &normalized, code);

        let compact = normalized.replace(' ', "");
        if compact.len() >= 3 && compact.len() <= 8 {
            Self::register_alias(aliases, &compact, code);
        }
    }

    fn rebuild_currency_aliases(&mut self, rates: &BTreeMap<String, Currency>) {
        let mut aliases = HashMap::<String, String>::new();

        for (code, currency) in rates {
            let code = code.to_lowercase();
            if !self
                .calculation
                .smartcalc
                .update_currency(&code, currency.rate)
            {
                continue;
            }

            Self::register_alias_variants(&mut aliases, &code, &code);
            Self::register_alias_variants(&mut aliases, &currency.name, &code);

            if currency.name.ends_with(" Dollar") {
                Self::register_alias_variants(&mut aliases, &format!("{}s", currency.name), &code);
            }
            if currency.name.ends_with(" Rupee") {
                Self::register_alias_variants(&mut aliases, &format!("{}s", currency.name), &code);
            }
        }

        let mut rules = aliases
            .into_iter()
            .filter(|(alias, code)| alias != code)
            .collect::<Vec<_>>();
        rules.sort_by(|left, right| {
            right
                .0
                .len()
                .cmp(&left.0.len())
                .then_with(|| left.0.cmp(&right.0))
        });

        self.currency_alias_rules = rules;
    }

    fn normalize_currency_expression(&self, expression: &str) -> String {
        let mut normalized = expression.to_lowercase();

        for (alias, code) in &self.currency_alias_rules {
            normalized = replace_phrase_with_boundaries(&normalized, alias, code);
        }

        normalized
    }

    pub fn setup(&mut self) -> Result<()> {
        update_current_timezone(&self.settings.timezone);
        self.calculation.configure(&self.settings)?;
        self.fetch_currencies = Some(Request::get(config().CALCULATOR_CURRENCY_URL));

        self.plugins.build(
            &mut self.calculation.smartcalc,
            &mut self.settings.enabled_plugins,
        )?;

        Ok(())
    }

    pub fn refresh_currencies(&mut self) {
        if self.fetch_currencies.is_none() {
            self.fetch_currencies = Some(Request::get(config().CALCULATOR_CURRENCY_URL));
        }
    }

    pub fn process(&mut self) -> Result<()> {
        self.plugins.process()?;

        let response = self
            .fetch_currencies
            .as_ref()
            .and_then(|request| request.get_data().cloned());

        let Some(response) = response else {
            return Ok(());
        };

        self.fetch_currencies = None;

        let body = response.map_err(Error::from)?;
        let parsed = from_str::<BTreeMap<String, Currency>>(&body)
            .map_err(|error| Error::JsonParseError(error.to_string()))?;
        self.rebuild_currency_aliases(&parsed);

        Ok(())
    }

    pub fn wait_for_requests(&mut self, timeout: Duration) -> Result<()> {
        let started_at = Instant::now();

        loop {
            self.process()?;

            if !self.ongoing_request() {
                return Ok(());
            }

            if started_at.elapsed() >= timeout {
                return Err(Error::RequestTimeoutError(
                    "calculator dependencies did not load in time".to_string(),
                ));
            }

            thread::sleep(Duration::from_millis(
                config().CALCULATOR_REQUEST_POLL_INTERVAL_MS,
            ));
        }
    }

    pub fn evaluate_expression(&mut self, expression: &str) -> CalculatorCommandResponse {
        self.calculation.code = self.normalize_currency_expression(expression);
        self.calculation.calculate();

        let outputs = self
            .calculation
            .outputs
            .iter()
            .map(|line| match line {
                Ok(value) => CalculationOutput {
                    value: value.clone(),
                    is_error: false,
                },
                Err(value) => CalculationOutput {
                    value: value.clone(),
                    is_error: true,
                },
            })
            .collect();

        CalculatorCommandResponse {
            outputs,
            pending_requests: self.ongoing_request(),
        }
    }

    pub fn ongoing_request(&self) -> bool {
        self.plugins.ongoing_request() || self.fetch_currencies.is_some()
    }
}

#[command]
pub fn calculate_expression(query: String) -> Result<CalculatorCommandResponse> {
    let mut engine = CalculatorEngine::new();
    engine.setup()?;
    engine.wait_for_requests(Duration::from_secs(
        config().CALCULATOR_REQUEST_WAIT_TIMEOUT_SECS,
    ))?;

    Ok(engine.evaluate_expression(query.trim()))
}
