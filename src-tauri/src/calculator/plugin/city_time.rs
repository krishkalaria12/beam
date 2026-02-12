use std::cell::RefCell;
use std::collections::BTreeMap;
use std::rc::Rc;

use chrono::Utc;
use serde_derive::Deserialize;
use serde_derive::Serialize;
use serde_json::from_str;
use smartcalc::RuleTrait;
use smartcalc::SmartCalc;
use smartcalc::SmartCalcConfig;
use smartcalc::TimeOffset;
use smartcalc::TokenType;

use super::error::{Error as PluginError, Result as PluginResult};
use super::PluginTrait;
use crate::calculator::error::Result as CalculatorResult;
use crate::calculator::timezone::get_current_timezone;
use crate::calculator::timezone::TIMEZONE_LIST;
use crate::config::config;
use crate::http::Request;

use super::get_text;
use super::RequestManager;

pub type CityArray = Vec<CityItem>;

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CityItem {
    pub names: Vec<String>,
    pub lat: String,
    pub lon: String,
    pub timezone: String,
}

#[derive(Default)]
pub struct CityTimePlugin {
    cities: RefCell<CityArray>,
    requests: Rc<RequestManager>,
}

impl PluginTrait for CityTimePlugin {
    fn http_result(
        &self,
        result: &CalculatorResult<String>,
        _: Option<String>,
    ) -> PluginResult<()> {
        let response = result
            .as_ref()
            .map_err(|error| PluginError::PluginHttpResultError {
                plugin: self.name(),
                reason: error.to_string(),
            })?;

        let parsed = from_str(response).map_err(|error| PluginError::PluginJsonParseError {
            plugin: self.name(),
            reason: error.to_string(),
        })?;

        *self.cities.borrow_mut() = parsed;
        Ok(())
    }
    fn get_rules(&self) -> Vec<String> {
        vec![
            "time {TEXT:type:at} {TEXT:city}".to_string(),
            "{TEXT:city} {TEXT:type:at} time".to_string(),
            "time {GROUP:conversion:conversion_group} {TEXT:city}".to_string(),
            "{TEXT:city} {GROUP:conversion:conversion_group} time".to_string(),
        ]
    }
    fn upcast(self: Rc<Self>) -> Rc<dyn RuleTrait> {
        self
    }

    fn init(_: &mut SmartCalc, requests: Rc<RequestManager>) -> PluginResult<Rc<Self>> {
        let mut city_time = Self::default();
        city_time.requests = requests;
        city_time.requests.add(
            &city_time.name(),
            Request::get(config().CALCULATOR_CITY_TIME_URL),
        );
        Ok(Rc::new(city_time))
    }
}

impl RuleTrait for CityTimePlugin {
    fn name(&self) -> String {
        "City Time".to_string()
    }

    fn call(&self, _: &SmartCalcConfig, fields: &BTreeMap<String, TokenType>) -> Option<TokenType> {
        let city_name = get_text("city", fields)?.to_lowercase();
        let city_timezone = self
            .cities
            .borrow()
            .iter()
            .find(|item| item.names.contains(&city_name))
            .map(|city| city.timezone.clone())?;
        let timezone = TIMEZONE_LIST
            .iter()
            .find(|timezone| timezone.name == city_timezone)?;

        Some(TokenType::Time(
            Utc::now().naive_utc(),
            TimeOffset {
                name: get_current_timezone().name,
                offset: (timezone.offset * 60.0) as i32,
            },
        ))
    }
}
