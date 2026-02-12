use std::collections::{BTreeMap, HashMap};

use serde::Deserialize;
use smartcalc::SmartCalc;

use crate::calculator::error::{Error, Result};
use crate::config::config;
use crate::currency::helpers::{
    collapse_spaces, normalize_alias_text, replace_phrase_with_boundaries,
};
use crate::http::Request;

#[derive(Default, Debug, Clone, PartialEq, Deserialize)]
struct CurrencySnapshot {
    pub rate: f64,

    #[serde(default)]
    pub name: String,
}

#[derive(Default)]
pub struct CurrencyRuntime {
    fetch_request: Option<Request>,
    alias_rules: Vec<(String, String)>,
}

impl CurrencyRuntime {
    pub fn start_refresh(&mut self) {
        if self.fetch_request.is_none() {
            self.fetch_request = Some(Request::get(config().CALCULATOR_CURRENCY_URL));
        }
    }

    pub fn process(&mut self, smartcalc: &mut SmartCalc) -> Result<()> {
        let response = self
            .fetch_request
            .as_ref()
            .and_then(|request| request.get_data().cloned());

        let Some(response) = response else {
            return Ok(());
        };

        self.fetch_request = None;

        let body = response.map_err(Error::from)?;
        let parsed = serde_json::from_str::<BTreeMap<String, CurrencySnapshot>>(&body)
            .map_err(|error| Error::JsonParseError(error.to_string()))?;

        self.rebuild_aliases(smartcalc, &parsed);
        Ok(())
    }

    pub fn normalize_expression(&self, expression: &str) -> String {
        let mut normalized = expression.to_lowercase();

        for (alias, code) in &self.alias_rules {
            normalized = replace_phrase_with_boundaries(&normalized, alias, code);
        }

        normalized
    }

    pub fn has_pending_request(&self) -> bool {
        self.fetch_request.is_some()
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

    fn rebuild_aliases(
        &mut self,
        smartcalc: &mut SmartCalc,
        rates: &BTreeMap<String, CurrencySnapshot>,
    ) {
        let mut aliases = HashMap::<String, String>::new();

        for (code, currency) in rates {
            let code = code.to_lowercase();
            if !smartcalc.update_currency(&code, currency.rate) {
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

        self.alias_rules = rules;
    }
}
