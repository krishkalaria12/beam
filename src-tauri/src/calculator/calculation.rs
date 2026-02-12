use smartcalc::SmartCalc;

use crate::calculator::error::{Error, Result};
use crate::calculator::settings::Settings;

#[derive(Default, serde::Deserialize, serde::Serialize)]
#[serde(default)]
pub struct Calculation {
    pub code: String,

    #[serde(skip)]
    pub outputs: Vec<core::result::Result<String, String>>,

    #[serde(skip)]
    pub smartcalc: SmartCalc,
}

impl Calculation {
    pub fn new() -> Self {
        Self {
            code: "".to_string(),
            outputs: Vec::new(),
            smartcalc: SmartCalc::default(),
        }
    }

    pub fn configure(&mut self, settings: &Settings) -> Result<()> {
        self.smartcalc
            .set_date_rule("en", settings.date_format.datas.to_vec());
        self.smartcalc
            .set_decimal_seperator(settings.decimal_seperator.to_string());
        self.smartcalc
            .set_thousand_separator(settings.thousand_separator.to_string());

        self.smartcalc.set_money_configuration(
            settings.money_format.remove_fract_if_zero,
            settings.money_format.use_fract_rounding,
        );
        self.smartcalc.set_number_configuration(
            settings.number_format.decimal_digits,
            settings.number_format.remove_fract_if_zero,
            settings.number_format.use_fract_rounding,
        );
        self.smartcalc.set_percentage_configuration(
            settings.percent_format.decimal_digits,
            settings.percent_format.remove_fract_if_zero,
            settings.percent_format.use_fract_rounding,
        );

        if self
            .smartcalc
            .set_timezone(settings.timezone.abbr())
            .is_err()
            && self.smartcalc.set_timezone("UTC".to_string()).is_err()
        {
            return Err(Error::ConfigurationError(
                "failed to set calculator timezone".to_string(),
            ));
        }

        Ok(())
    }

    pub fn calculate(&mut self) {
        let results = self.smartcalc.execute("en", &self.code[..]);
        self.outputs.clear();

        for result in results.lines.iter() {
            match result {
                Some(result) => match &result.result {
                    Ok(line) => {
                        self.outputs.push(Ok(line.output.to_string()));
                    }
                    Err(error) => {
                        self.outputs.push(Err(error.to_string()));
                    }
                },
                None => {
                    self.outputs.push(Ok("".to_string()));
                }
            }
        }
    }
}
