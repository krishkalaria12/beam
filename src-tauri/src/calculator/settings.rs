use crate::calculator::timezone::Timezone;
use crate::calculator::timezone::TIMEZONE_LIST;
use crate::calculator::timezone::UTC_TIMEZONE;

use localzone::get_local_zone;
use once_cell::sync::Lazy;
use serde::Deserialize;
use serde::Serialize;
use std::collections::HashMap;

pub static DATE_PARSE_TYPES: Lazy<Vec<DateFormat>> = Lazy::new(|| {
    let m = vec![
        DateFormat {
            name: "day month year".to_string(),
            datas: vec![
                "{NUMBER:day}.{NUMBER:month}.{NUMBER:year}".to_string(),
                "{NUMBER:day} {MONTH:month} {NUMBER:year}".to_string(),
                "{NUMBER:day}/{NUMBER:month}/{NUMBER:year}".to_string(),
                "{MONTH:month} {NUMBER:day}".to_string(),
                "{NUMBER:day} {MONTH:month}".to_string(),
            ],
        },
        DateFormat {
            name: "month day year".to_string(),
            datas: vec![
                "{NUMBER:month}.{NUMBER:day}.{NUMBER:year}".to_string(),
                "{MONTH:month} {NUMBER:day}, {NUMBER:year}".to_string(),
                "{MONTH:month} {NUMBER:day} {NUMBER:year}".to_string(),
                "{NUMBER:month}/{NUMBER:day}/{NUMBER:year}".to_string(),
                "{MONTH:month} {NUMBER:day}".to_string(),
                "{NUMBER:day} {MONTH:month}".to_string(),
            ],
        },
        DateFormat {
            name: "year month day".to_string(),
            datas: vec![
                "{NUMBER:year}.{NUMBER:month}.{NUMBER:day}".to_string(),
                "{NUMBER:year} {MONTH:month} {NUMBER:day}".to_string(),
                "{NUMBER:year}/{NUMBER:month}/{NUMBER:day}".to_string(),
                "{MONTH:month} {NUMBER:day}".to_string(),
                "{NUMBER:day} {MONTH:month}".to_string(),
            ],
        },
    ];
    m
});

#[derive(Default, PartialEq, Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct DateFormat {
    pub datas: Vec<String>,
    pub name: String,
}

#[derive(Default, PartialEq, Debug, Clone, Deserialize, Serialize)]
#[serde(default)]
pub struct NumberFormat {
    pub decimal_digits: u8,
    pub remove_fract_if_zero: bool,
    pub use_fract_rounding: bool,
}

impl NumberFormat {
    pub fn new(decimal_digits: u8, remove_fract_if_zero: bool, use_fract_rounding: bool) -> Self {
        Self {
            decimal_digits,
            remove_fract_if_zero,
            use_fract_rounding,
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(default)]
pub struct Settings {
    pub decimal_seperator: String,
    pub thousand_separator: String,
    pub timezone: Timezone,
    pub date_format: DateFormat,
    pub enabled_plugins: HashMap<String, bool>,
    pub money_format: NumberFormat,
    pub number_format: NumberFormat,
    pub percent_format: NumberFormat,
}

impl Default for Settings {
    fn default() -> Self {
        let timezone_name = get_local_zone().unwrap_or_else(|| "UTC".to_string());

        let timezone = match TIMEZONE_LIST.iter().find(|tz| tz.name == timezone_name) {
            Some(tz) => tz.clone(),
            None => UTC_TIMEZONE.clone(),
        };

        Self {
            timezone,
            decimal_seperator: ".".to_string(),
            thousand_separator: ",".to_string(),
            enabled_plugins: HashMap::new(),
            date_format: DATE_PARSE_TYPES[0].clone(),
            money_format: NumberFormat::new(0, false, true),
            number_format: NumberFormat::new(2, true, true),
            percent_format: NumberFormat::new(2, true, true),
        }
    }
}
