use std::cell::RefCell;
use std::collections::BTreeMap;
use std::rc::Rc;

use serde_derive::Deserialize;
use serde_derive::Serialize;
use serde_json::from_str;
use smartcalc::RuleTrait;
use smartcalc::SmartCalc;
use smartcalc::SmartCalcConfig;
use smartcalc::TokenType;

use super::error::{Error as PluginError, Result as PluginResult};
use super::PluginTrait;
use crate::calculator::error::Result as CalculatorResult;
use crate::config::config;
use crate::http::Request;

use super::get_number;
use super::get_text;
use super::RequestManager;

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoinData {
    pub data: Vec<CoinItem>,
    pub timestamp: i64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoinItem {
    pub id: String,
    pub rank: String,
    pub symbol: String,
    pub name: String,
    pub supply: String,
    pub max_supply: Option<String>,
    pub market_cap_usd: String,
    #[serde(rename = "volumeUsd24Hr")]
    pub volume_usd24hr: String,
    pub price_usd: String,
    #[serde(rename = "changePercent24Hr")]
    pub change_percent24hr: String,
    #[serde(rename = "vwap24Hr")]
    pub vwap24hr: Option<String>,
    pub explorer: Option<String>,
}

#[derive(Default)]
pub struct CoinPlugin {
    coins: RefCell<Vec<CoinItem>>,
    requests: Rc<RequestManager>,
}

impl PluginTrait for CoinPlugin {
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

        let parsed =
            from_str::<CoinData>(response).map_err(|error| PluginError::PluginJsonParseError {
                plugin: self.name(),
                reason: error.to_string(),
            })?;

        *self.coins.borrow_mut() = parsed.data;
        Ok(())
    }
    fn get_rules(&self) -> Vec<String> {
        vec![
            "{NUMBER:count} {TEXT:coin}".to_string(),
            "{TEXT:coin}".to_string(),
        ]
    }
    fn upcast(self: Rc<Self>) -> Rc<dyn RuleTrait> {
        self
    }

    fn init(_: &mut SmartCalc, requests: Rc<RequestManager>) -> PluginResult<Rc<Self>> {
        let mut coin = Self::default();
        coin.requests = requests;
        coin.requests
            .add(&coin.name(), Request::get(config().CALCULATOR_COIN_URL));
        Ok(Rc::new(coin))
    }
}

impl RuleTrait for CoinPlugin {
    fn name(&self) -> String {
        "Crypto Coin".to_string()
    }

    fn call(
        &self,
        smartcalc: &SmartCalcConfig,
        fields: &BTreeMap<String, TokenType>,
    ) -> Option<TokenType> {
        let coin_name = get_text("coin", fields)?.to_lowercase();
        let coin_price = self
            .coins
            .borrow()
            .iter()
            .find(|item| {
                item.symbol.to_lowercase() == coin_name || item.name.to_lowercase() == coin_name
            })
            .and_then(|coin| coin.price_usd.parse::<f64>().ok())?;

        let price = get_number("count", fields).unwrap_or(1.0) * coin_price;
        let usd_currency = smartcalc.get_currency("usd".to_string())?;

        Some(TokenType::Money(price, usd_currency))
    }
}
