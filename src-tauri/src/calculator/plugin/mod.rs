pub mod city_time;
pub mod error;

use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap};
use std::ops::Deref;
use std::rc::Rc;

use smartcalc::{RuleTrait, SmartCalc};
use smartcalc::{SmartCalcAstType, TokenType};

use crate::calculator::error::Error as CalculatorError;
use crate::calculator::error::Result as CalculatorResult;
use crate::calculator::plugin::error::Result as PluginResult;
use crate::currency::coin_plugin::CoinPlugin;
use crate::http::Request;

pub fn get_number(field_name: &str, fields: &BTreeMap<String, TokenType>) -> Option<f64> {
    return match fields.get(field_name) {
        Some(data) => match data {
            TokenType::Number(number, _) => Some(*number),
            TokenType::Variable(variable) => match variable.data.borrow().deref().deref() {
                SmartCalcAstType::Item(item) => Some(item.get_underlying_number()),
                _ => None,
            },
            _ => None,
        },
        _ => None,
    };
}

pub fn get_text(field_name: &str, fields: &BTreeMap<String, TokenType>) -> Option<String> {
    return match fields.get(field_name) {
        Some(TokenType::Text(text)) => Some(text.to_string()),
        _ => None,
    };
}

pub struct Plugin {
    pub plugin: Rc<dyn PluginTrait>,
}

impl Plugin {
    pub fn new(plugin: Rc<dyn PluginTrait>) -> Self {
        Self { plugin }
    }

    pub fn name(&self) -> String {
        self.plugin.name().to_owned()
    }

    pub fn enable(&self, smartcalc: &mut SmartCalc) {
        smartcalc.add_rule(
            "en".to_string(),
            self.plugin.get_rules(),
            self.plugin.clone().upcast(),
        );
    }

    pub fn disable(&self, smartcalc: &mut SmartCalc) {
        smartcalc.delete_rule("en".to_string(), self.name());
    }
}

pub trait PluginTrait: RuleTrait {
    fn get_rules(&self) -> Vec<String>;
    fn http_result(
        &self,
        content: &CalculatorResult<String>,
        request: Option<String>,
    ) -> PluginResult<()>;

    fn init(smartcalc: &mut SmartCalc, requests: Rc<RequestManager>) -> PluginResult<Rc<Self>>
    where
        Self: Sized;
    fn upcast(self: Rc<Self>) -> Rc<dyn RuleTrait>;
}

#[derive(Default)]
pub struct RequestManager {
    pub requests: RefCell<Vec<(String, Request)>>,
}

impl RequestManager {
    pub fn add(&self, plugin_name: &str, request: Request) {
        self.requests
            .borrow_mut()
            .push((plugin_name.to_string(), request));
    }
}

#[derive(Default)]
pub struct PluginManager {
    pub plugins: Vec<Plugin>,
    requests: Rc<RequestManager>,
    ongoing_request: bool,
}

impl PluginManager {
    fn add_plugin<T: 'static + PluginTrait>(
        &mut self,
        smartcalc: &mut SmartCalc,
        enabled_plugins: &mut HashMap<String, bool>,
    ) -> CalculatorResult<()> {
        let plugin = T::init(smartcalc, self.requests.clone())?;
        let plugin_name = plugin.name();
        let is_enabled = *enabled_plugins.entry(plugin_name.clone()).or_insert(true);

        if is_enabled {
            self.plugins.push(Plugin::new(plugin));
        }

        Ok(())
    }

    pub fn build(
        &mut self,
        smartcalc: &mut SmartCalc,
        enabled_plugins: &mut HashMap<String, bool>,
    ) -> CalculatorResult<()> {
        self.add_plugin::<CoinPlugin>(smartcalc, enabled_plugins)?;
        self.add_plugin::<city_time::CityTimePlugin>(smartcalc, enabled_plugins)?;

        for plugin in self.plugins.iter() {
            plugin.enable(smartcalc);
        }

        self.ongoing_request = !self.requests.requests.borrow().is_empty();
        Ok(())
    }

    pub fn ongoing_request(&self) -> bool {
        self.ongoing_request || !self.requests.requests.borrow().is_empty()
    }

    pub fn process(&mut self) -> CalculatorResult<()> {
        let mut finished_requests = Vec::new();
        let mut requests = self.requests.requests.borrow_mut();

        for (index, (plugin_name, request)) in requests.iter().enumerate() {
            match request.get_data() {
                Some(response) => {
                    if let Some(plugin) = self
                        .plugins
                        .iter()
                        .find(|plugin| plugin.name() == &plugin_name[..])
                    {
                        let mapped_response: CalculatorResult<String> =
                            response.clone().map_err(CalculatorError::from);
                        plugin
                            .plugin
                            .http_result(&mapped_response, request.extra.clone())?;
                    }
                    finished_requests.push(index);
                }
                None => {}
            }
        }

        for index in finished_requests.into_iter().rev() {
            requests.remove(index);
        }

        self.ongoing_request = !requests.is_empty();
        Ok(())
    }
}
