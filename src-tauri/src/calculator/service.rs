use chrono_tz::Tz;

use crate::calculator::calculation::Calculation;
use crate::calculator::error::Result;
use crate::calculator::plugin::PluginManager;
use crate::calculator::query_validator::classify_query;
use crate::calculator::settings::Settings;
use crate::calculator::timezone::{update_current_timezone, TIMEZONE_LIST, UTC_TIMEZONE};
use crate::calculator::types::{CalculationOutput, CalculatorCommandResponse, CalculatorStatus};
use crate::currency::normalizer::normalize_conversion_query;
use crate::currency::runtime::CurrencyRuntime;

struct CalculatorEngine {
    calculation: Calculation,
    plugins: PluginManager,
    currency_runtime: CurrencyRuntime,
    settings: Settings,
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
            plugins: PluginManager::default(),
            currency_runtime: CurrencyRuntime::default(),
            settings,
        }
    }
}

impl CalculatorEngine {
    fn new() -> Self {
        Self::default()
    }

    fn setup(&mut self) -> Result<()> {
        update_current_timezone(&self.settings.timezone);
        self.calculation.configure(&self.settings)?;
        self.currency_runtime.start_refresh();

        self.plugins.build(
            &mut self.calculation.smartcalc,
            &mut self.settings.enabled_plugins,
        )?;

        Ok(())
    }

    fn process(&mut self) -> Result<()> {
        self.plugins.process()?;
        self.currency_runtime
            .process(&mut self.calculation.smartcalc)?;
        Ok(())
    }

    fn evaluate_expression(&mut self, expression: &str) -> Vec<CalculationOutput> {
        self.calculation.code = self.currency_runtime.normalize_expression(expression);
        self.calculation.calculate();

        self.calculation
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
            .collect()
    }

    fn ongoing_request(&self) -> bool {
        self.plugins.ongoing_request() || self.currency_runtime.has_pending_request()
    }
}

pub struct CalculatorService {
    engine: CalculatorEngine,
}

impl CalculatorService {
    pub fn new() -> Self {
        let mut engine = CalculatorEngine::new();
        if let Err(error) = engine.setup() {
            log::warn!("failed to setup calculator service: {error}");
        }

        Self { engine }
    }

    pub fn calculate_expression(&mut self, query: &str) -> Result<CalculatorCommandResponse> {
        let normalized_query = normalize_conversion_query(query.trim());
        let classification = classify_query(&normalized_query);

        if classification != CalculatorStatus::Valid {
            return Ok(CalculatorCommandResponse::empty(
                normalized_query,
                classification,
            ));
        }

        if let Err(error) = self.engine.process() {
            log::warn!("calculator dependency processing failed: {error}");
        }

        let outputs = self.engine.evaluate_expression(&normalized_query);
        let has_valid_output = outputs
            .iter()
            .any(|output| !output.is_error && !output.value.trim().is_empty());

        let status = if has_valid_output {
            CalculatorStatus::Valid
        } else {
            CalculatorStatus::Error
        };

        Ok(CalculatorCommandResponse {
            query: normalized_query,
            status,
            outputs,
            pending_requests: self.engine.ongoing_request(),
        })
    }
}
