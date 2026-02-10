use parking_lot::{const_mutex, Mutex};

use crate::error::Result;

pub fn config() -> &'static Config {
    static INSTANCE: Mutex<Option<&'static Config>> = const_mutex(None);

    let mut instance = INSTANCE.lock();
    if let Some(config) = *instance {
        return config;
    }

    let config =
        Box::leak(Box::new(Config::load_the_config().unwrap_or_else(|ex| {
            panic!("FATAL - WHILE LOADING CONF - Cause: {ex:?}")
        })));

    *instance = Some(config);
    config
}

#[allow(non_snake_case)]
pub struct Config {
    // -- Web
    pub DIRECTORIES_APPLICATION: Vec<String>,
}

impl Config {
    fn load_the_config() -> Result<Config> {
        Ok(Config {
            DIRECTORIES_APPLICATION: vec![
                "~/.local/share/applications/".to_string(),
                "/usr/share/applications/".to_string(),
            ],
        })
    }
}
