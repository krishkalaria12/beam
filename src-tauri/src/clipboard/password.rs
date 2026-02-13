use keyring::Entry;
use rand::{rng, Rng};

use crate::{
    clipboard::error::{Error, Result},
    config::config,
};

fn generate_password(length: usize) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ\
                            abcdefghijklmnopqrstuvwxyz\
                            0123456789\
                            )(*&^%$#@!~";

    let mut rng = rng();

    let password: String = (0..length)
        .map(|_| {
            let idx = rng.random_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect();

    password
}

pub fn get_password_for_encrypt() -> Result<String> {
    let entry = Entry::new(&config().SERVICE_NAME, &config().KEYRING_NAME)
        .map_err(|e| Error::NewEntryKeyringError(e.to_string()))?;

    let password = entry.get_password().unwrap_or(String::new());

    if password.is_empty() {
        let password = generate_password(17);
        entry
            .set_password(password.as_str())
            .map_err(|e| Error::SettingPasswordKeyring(e.to_string()))?;

        return Ok(password);
    }

    Ok(password)
}
