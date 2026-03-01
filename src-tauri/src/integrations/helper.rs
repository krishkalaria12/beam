use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::RngCore;
use sha2::{Digest, Sha256};
use url::Url;

pub fn build_url_with_params(
    endpoint: &str,
    params: &[(String, String)],
) -> std::result::Result<String, String> {
    let mut url = Url::parse(endpoint).map_err(|error| format!("invalid endpoint URL: {error}"))?;

    {
        let mut query_pairs = url.query_pairs_mut();
        for (key, value) in params {
            query_pairs.append_pair(key, value);
        }
    }

    Ok(url.to_string())
}

pub fn normalize_non_empty(value: &str, field_name: &str) -> std::result::Result<String, String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err(format!("{field_name} cannot be empty"));
    }

    Ok(normalized.to_string())
}

pub fn validate_redirect_uri(redirect_uri: &str) -> std::result::Result<String, String> {
    let normalized = normalize_non_empty(redirect_uri, "redirect_uri")?;
    Url::parse(&normalized).map_err(|error| format!("redirect_uri is invalid: {error}"))?;

    Ok(normalized)
}

pub fn normalize_scope(scope: &str) -> Option<String> {
    let normalized = scope.trim();
    if normalized.is_empty() {
        return None;
    }

    Some(normalized.to_string())
}

pub fn normalize_scopes(scopes: Option<Vec<String>>, default_scopes: &[&str]) -> Vec<String> {
    let raw_scopes = scopes.unwrap_or_default();
    let mut normalized_scopes = Vec::new();

    if raw_scopes.is_empty() {
        normalized_scopes.extend(
            default_scopes
                .iter()
                .filter_map(|scope| normalize_scope(scope)),
        );
    } else {
        for scope in raw_scopes {
            if let Some(normalized_scope) = normalize_scope(&scope) {
                normalized_scopes.push(normalized_scope);
            }
        }
    }

    normalized_scopes.sort();
    normalized_scopes.dedup();
    normalized_scopes
}

pub fn generate_random_token(byte_len: usize) -> String {
    let mut bytes = vec![0_u8; byte_len];
    rand::rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

pub fn build_pkce_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(digest)
}
