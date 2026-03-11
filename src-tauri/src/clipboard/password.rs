use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use keyring::{Entry, Error as KeyringError};
use once_cell::sync::OnceCell;
use rand::{rng, Rng, RngCore};
use sha2::{Digest, Sha256};

use super::error::{ClipboardError, Result};

use crate::clipboard::config::CONFIG as CLIPBOARD_CONFIG;
use crate::config::CONFIG as APP_CONFIG;

static ENCRYPTION_PASSWORD_CACHE: OnceCell<String> = OnceCell::new();

fn generate_password(length: usize) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ\
                            abcdefghijklmnopqrstuvwxyz\
                            0123456789\
                            )(*&^%$#@!~";

    let mut rng = rng();

    (0..length)
        .map(|_| {
            let idx = rng.random_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

pub fn get_password_for_encrypt() -> Result<String> {
    let password = ENCRYPTION_PASSWORD_CACHE.get_or_try_init(|| {
        let entry = Entry::new(&APP_CONFIG.service_name, &CLIPBOARD_CONFIG.keyring_name)
            .map_err(|e| ClipboardError::NewEntryKeyringError(e.to_string()))?;

        let password = match entry.get_password() {
            Ok(password) => password,
            Err(KeyringError::NoEntry) => String::new(),
            Err(e) => return Err(ClipboardError::GettingPasswordKeyring(e.to_string())),
        };

        if password.is_empty() {
            let generated_password = generate_password(CLIPBOARD_CONFIG.encryption_password_length);
            entry
                .set_password(generated_password.as_str())
                .map_err(|e| ClipboardError::SettingPasswordKeyring(e.to_string()))?;

            return Ok(generated_password);
        }

        Ok(password)
    })?;

    Ok(password.clone())
}

fn get_cipher_for_password(password: &str) -> Result<Aes256Gcm> {
    let digest = Sha256::digest(password.as_bytes());
    Aes256Gcm::new_from_slice(&digest)
        .map_err(|e| ClipboardError::EncryptionCipherInitError(e.to_string()))
}

fn get_nonce_size_bytes() -> Result<usize> {
    let nonce_size = CLIPBOARD_CONFIG.encryption_nonce_bytes;
    if nonce_size != 12 {
        return Err(ClipboardError::EncryptionCipherInitError(
            "CLIPBOARD_ENCRYPTION_NONCE_BYTES must be 12 for AES-GCM".to_string(),
        ));
    }

    Ok(nonce_size)
}

fn encrypt_text_with_password(value: &str, password: &str) -> Result<String> {
    let cipher = get_cipher_for_password(password)?;
    let nonce_size = get_nonce_size_bytes()?;

    let mut nonce_bytes = vec![0u8; nonce_size];
    rng().fill_bytes(&mut nonce_bytes);

    let nonce = Nonce::from_slice(&nonce_bytes);
    let encrypted_bytes = cipher
        .encrypt(nonce, value.as_bytes())
        .map_err(|e| ClipboardError::EncryptingClipboardValue(e.to_string()))?;

    let mut payload = Vec::with_capacity(nonce_size + encrypted_bytes.len());
    payload.extend_from_slice(&nonce_bytes);
    payload.extend_from_slice(&encrypted_bytes);

    Ok(format!(
        "{}{}",
        CLIPBOARD_CONFIG.encryption_prefix,
        general_purpose::STANDARD.encode(payload)
    ))
}

fn decrypt_text_with_password(value: &str, password: &str) -> Result<String> {
    let encrypted_value_prefix = CLIPBOARD_CONFIG.encryption_prefix;
    if !value.starts_with(encrypted_value_prefix) {
        return Ok(value.to_string());
    }

    let nonce_size = get_nonce_size_bytes()?;

    let payload_b64 = &value[encrypted_value_prefix.len()..];
    let payload = general_purpose::STANDARD
        .decode(payload_b64)
        .map_err(|e| ClipboardError::DecryptingClipboardValue(e.to_string()))?;

    if payload.len() <= nonce_size {
        return Err(ClipboardError::DecryptingClipboardValue(
            "invalid encrypted clipboard payload".to_string(),
        ));
    }

    let (nonce_bytes, encrypted_bytes) = payload.split_at(nonce_size);
    let cipher = get_cipher_for_password(password)?;
    let nonce = Nonce::from_slice(nonce_bytes);

    let decrypted_bytes = cipher
        .decrypt(nonce, encrypted_bytes)
        .map_err(|e| ClipboardError::DecryptingClipboardValue(e.to_string()))?;

    String::from_utf8(decrypted_bytes)
        .map_err(|e| ClipboardError::DecryptingClipboardValue(e.to_string()))
}

pub fn encrypt_value(value: &str) -> Result<String> {
    let password = get_password_for_encrypt()?;
    encrypt_text_with_password(value, &password)
}

pub fn decrypt_value(value: &str) -> Result<String> {
    let password = get_password_for_encrypt()?;

    match decrypt_text_with_password(value, &password) {
        Ok(decrypted_value) => Ok(decrypted_value),
        Err(_) => {
            if !value.starts_with(CLIPBOARD_CONFIG.encryption_prefix) {
                return Ok(value.to_string());
            }

            Err(ClipboardError::DecryptingClipboardValue(
                "failed to decrypt encrypted clipboard value".to_string(),
            ))
        }
    }
}

pub fn encrypt_values(values: &[String]) -> Result<Vec<String>> {
    values.iter().map(|value| encrypt_value(value)).collect()
}

pub fn decrypt_values(values: &[String]) -> Result<Vec<String>> {
    values.iter().map(|value| decrypt_value(value)).collect()
}
