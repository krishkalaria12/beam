use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use futures_util::future::join_all;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use reqwest::Url;
use semver::Version;
use serde::Deserialize;
use serde_json::{json, Value as JsonValue};
use tauri::{AppHandle, Manager};

use crate::extensions::error::{ExtensionsError, Result};
use crate::extensions::runtime::proto;
use crate::extensions::{config::CONFIG as EXTENSIONS_CONFIG, discover_plugins};

#[derive(Deserialize, Debug, Clone)]
#[serde(untagged)]
enum RawAuthor {
    Simple(String),
    Detailed { name: String },
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawPreferenceData {
    title: String,
    value: String,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawArgumentData {
    title: String,
    value: String,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawPreference {
    name: String,
    #[serde(rename = "type")]
    r#type: String,
    title: Option<String>,
    description: Option<String>,
    required: Option<bool>,
    #[serde(default)]
    default: JsonValue,
    data: Option<Vec<RawPreferenceData>>,
    label: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawArgument {
    name: String,
    #[serde(rename = "type")]
    r#type: String,
    placeholder: Option<String>,
    required: Option<bool>,
    data: Option<Vec<RawArgumentData>>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawCommandManifest {
    name: String,
    title: Option<String>,
    subtitle: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    mode: Option<String>,
    interval: Option<String>,
    keywords: Option<Vec<String>>,
    arguments: Option<Vec<RawArgument>>,
    disabled_by_default: Option<bool>,
    preferences: Option<Vec<RawPreference>>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawPackageManifest {
    name: Option<String>,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    author: Option<RawAuthor>,
    owner: Option<String>,
    version: Option<String>,
    access: Option<String>,
    license: Option<String>,
    platforms: Option<Vec<String>>,
    categories: Option<Vec<String>>,
    contributors: Option<Vec<String>>,
    past_contributors: Option<Vec<String>>,
    keywords: Option<Vec<String>>,
    commands: Option<Vec<RawCommandManifest>>,
    preferences: Option<Vec<RawPreference>>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawStoreSource {
    id: Option<String>,
    label: Option<String>,
    kind: Option<String>,
    homepage_url: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawStoreAuthor {
    handle: Option<String>,
    name: Option<String>,
    avatar_url: Option<String>,
    profile_url: Option<String>,
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct RawStoreIcons {
    light: Option<String>,
    dark: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawStoreVerification {
    status: Option<String>,
    label: Option<String>,
    verified_by: Option<String>,
    summary: Option<String>,
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct RawStoreCompatibility {
    #[serde(default)]
    platforms: Vec<String>,
    #[serde(default)]
    desktop_environments: Vec<String>,
    minimum_beam_version: Option<String>,
    maximum_beam_version: Option<String>,
    linux_tested: Option<bool>,
    wayland_tested: Option<bool>,
    x11_tested: Option<bool>,
    #[serde(default)]
    notes: Vec<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawStoreChecksum {
    algorithm: Option<String>,
    value: Option<String>,
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct RawStoreArtifactVerification {
    signer: Option<String>,
    signature: Option<String>,
    provenance_url: Option<String>,
    transparency_log_url: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawStoreArtifact {
    id: Option<String>,
    kind: Option<String>,
    download_url: Option<String>,
    file_name: Option<String>,
    mime_type: Option<String>,
    size_bytes: Option<i64>,
    #[serde(default)]
    checksums: Vec<RawStoreChecksum>,
    verification: Option<RawStoreArtifactVerification>,
    #[serde(default)]
    platforms: Vec<String>,
    #[serde(default)]
    desktop_environments: Vec<String>,
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct RawStoreReleaseNotes {
    summary: Option<String>,
    markdown: Option<String>,
    changelog_url: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawStoreRelease {
    version: Option<String>,
    download_url: Option<String>,
    published_at: Option<String>,
    checksum_sha256: Option<String>,
    changelog_url: Option<String>,
    channel: Option<String>,
    channel_name: Option<String>,
    prerelease: Option<bool>,
    #[serde(default)]
    artifacts: Vec<RawStoreArtifact>,
    primary_artifact_id: Option<String>,
    release_notes: Option<RawStoreReleaseNotes>,
    published_by: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawStorePackage {
    id: Option<String>,
    slug: Option<String>,
    title: Option<String>,
    summary: Option<String>,
    description: Option<String>,
    author: Option<RawStoreAuthor>,
    icons: Option<RawStoreIcons>,
    #[serde(default)]
    categories: Vec<String>,
    #[serde(default)]
    tags: Vec<String>,
    source: Option<RawStoreSource>,
    verification: Option<RawStoreVerification>,
    compatibility: Option<RawStoreCompatibility>,
    latest_release: Option<RawStoreRelease>,
    readme_url: Option<String>,
    source_url: Option<String>,
    #[serde(default)]
    screenshots: Vec<String>,
    manifest: Option<RawPackageManifest>,
    download_count: Option<i64>,
    #[serde(default)]
    releases: Vec<RawStoreRelease>,
    default_channel: Option<String>,
    package_format_version: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawStoreCatalog {
    source: Option<RawStoreSource>,
    #[serde(default)]
    packages: Vec<RawStorePackage>,
    generated_at: Option<String>,
    format_version: Option<String>,
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "snake_case")]
struct RawRaycastUser {
    name: Option<String>,
    handle: Option<String>,
    avatar: Option<String>,
    username: Option<String>,
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "snake_case")]
struct RawRaycastIcons {
    light: Option<String>,
    dark: Option<String>,
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "snake_case")]
struct RawRaycastCommand {
    name: Option<String>,
    title: Option<String>,
    subtitle: Option<String>,
    description: Option<String>,
    #[serde(default)]
    keywords: Vec<String>,
    mode: Option<String>,
    disabled_by_default: Option<bool>,
    icons: Option<RawRaycastIcons>,
}

#[derive(Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "snake_case")]
struct RawRaycastListing {
    name: Option<String>,
    title: Option<String>,
    description: Option<String>,
    #[serde(default)]
    seo_categories: Vec<String>,
    platforms: Option<Vec<String>>,
    created_at: Option<i64>,
    author: Option<RawRaycastUser>,
    owner: Option<RawRaycastUser>,
    access: Option<String>,
    store_url: Option<String>,
    download_count: Option<i64>,
    api_version: Option<String>,
    #[serde(default)]
    categories: Vec<String>,
    #[serde(default)]
    prompt_examples: Vec<String>,
    metadata_count: Option<i64>,
    updated_at: Option<i64>,
    source_url: Option<String>,
    readme_url: Option<String>,
    readme_assets_path: Option<String>,
    icons: Option<RawRaycastIcons>,
    download_url: Option<String>,
    #[serde(default)]
    commands: Vec<RawRaycastCommand>,
    #[serde(default)]
    contributors: Vec<RawRaycastUser>,
    #[serde(default)]
    tools: Vec<String>,
}

#[derive(Deserialize, Debug, Clone, Default)]
struct RawRaycastSearchResponse {
    #[serde(default)]
    data: Vec<RawRaycastListing>,
}

#[derive(Debug, Clone)]
enum CatalogBase {
    File(PathBuf),
    Url(Url),
}

#[derive(Debug, Clone)]
pub(crate) struct ResolvedStoreArtifact {
    pub package: proto::ExtensionStorePackage,
    pub release: proto::ExtensionStoreRelease,
    pub artifact: proto::ExtensionStoreArtifact,
}

const RAYCAST_STORE_API_BASE: &str = "https://backend.raycast.com/api/v1";
const RAYCAST_STORE_SOURCE_ID: &str = "raycast";
const RAYCAST_STORE_SOURCE_LABEL: &str = "Raycast Store";
const RAYCAST_STORE_DEFAULT_OWNER: &str = "raycast";

static RAYCAST_PACKAGE_CACHE: Lazy<Mutex<HashMap<String, proto::ExtensionStorePackage>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn normalize_string_list(values: Vec<String>) -> Vec<String> {
    values
        .into_iter()
        .filter_map(|value| normalize_optional_string(Some(value)))
        .collect()
}

fn timestamp_to_rfc3339(value: Option<i64>) -> Option<String> {
    let seconds = value?;
    chrono::DateTime::from_timestamp(seconds, 0).map(|timestamp| timestamp.to_rfc3339())
}

fn raycast_store_source() -> proto::ExtensionStoreSource {
    proto::ExtensionStoreSource {
        id: RAYCAST_STORE_SOURCE_ID.to_string(),
        label: RAYCAST_STORE_SOURCE_LABEL.to_string(),
        kind: proto::ExtensionStoreSourceKind::Raycast as i32,
        homepage_url: Some("https://www.raycast.com/store".to_string()),
    }
}

fn raycast_owner_handle(listing: &RawRaycastListing) -> String {
    normalize_optional_string(
        listing
            .owner
            .as_ref()
            .and_then(|owner| owner.handle.clone()),
    )
    .unwrap_or_else(|| RAYCAST_STORE_DEFAULT_OWNER.to_string())
}

fn raycast_package_id(owner_handle: &str, slug: &str) -> String {
    format!(
        "{RAYCAST_STORE_SOURCE_ID}:{}",
        format!("{owner_handle}/{slug}").to_lowercase()
    )
}

fn parse_raycast_package_id(package_id: &str) -> Option<(String, String)> {
    let normalized = package_id
        .trim()
        .strip_prefix(&format!("{RAYCAST_STORE_SOURCE_ID}:"))?;
    let (owner, slug) = normalized.split_once('/')?;
    let owner = owner.trim().to_lowercase();
    let slug = slug.trim().to_lowercase();
    if owner.is_empty() || slug.is_empty() {
        return None;
    }

    Some((owner, slug))
}

fn synthetic_raycast_version(listing: &RawRaycastListing) -> String {
    format!(
        "0.0.{}",
        listing.updated_at.or(listing.created_at).unwrap_or(0)
    )
}

fn raycast_manifest_author(listing: &RawRaycastListing) -> Option<proto::ManifestAuthor> {
    let author = listing.author.as_ref()?;
    let handle = normalize_optional_string(author.handle.clone());
    let name = normalize_optional_string(author.name.clone());

    handle.or(name).map(|value| proto::ManifestAuthor {
        author: Some(proto::manifest_author::Author::Simple(value)),
    })
}

fn raycast_manifest_contributors(users: &[RawRaycastUser]) -> Vec<String> {
    users
        .iter()
        .filter_map(|user| {
            normalize_optional_string(user.handle.clone())
                .or_else(|| normalize_optional_string(user.username.clone()))
                .or_else(|| normalize_optional_string(user.name.clone()))
        })
        .collect()
}

fn raycast_manifest_commands(listing: &RawRaycastListing) -> Vec<proto::CommandManifest> {
    listing
        .commands
        .iter()
        .filter_map(|command| {
            let name = normalize_optional_string(command.name.clone())?;
            Some(proto::CommandManifest {
                name,
                title: normalize_optional_string(command.title.clone()),
                subtitle: normalize_optional_string(command.subtitle.clone()),
                description: normalize_optional_string(command.description.clone()),
                icon: command
                    .icons
                    .as_ref()
                    .and_then(|icons| normalize_optional_string(icons.light.clone()))
                    .or_else(|| {
                        command
                            .icons
                            .as_ref()
                            .and_then(|icons| normalize_optional_string(icons.dark.clone()))
                    }),
                mode: normalize_optional_string(command.mode.clone()),
                interval: None,
                preferences: Vec::new(),
                keywords: normalize_string_list(command.keywords.clone()),
                arguments: Vec::new(),
                disabled_by_default: command.disabled_by_default,
            })
        })
        .collect()
}

fn raycast_screenshots(listing: &RawRaycastListing, slug: &str) -> Vec<String> {
    let Some(base) = normalize_optional_string(listing.readme_assets_path.clone()) else {
        return Vec::new();
    };
    let count = listing.metadata_count.unwrap_or(0).max(0) as usize;
    if count == 0 {
        return Vec::new();
    }

    (0..count)
        .map(|index| format!("{base}metadata/{slug}-{}.png", index + 1))
        .collect()
}

fn cache_raycast_packages(packages: &[proto::ExtensionStorePackage]) {
    if packages.is_empty() {
        return;
    }

    let mut cache = RAYCAST_PACKAGE_CACHE.lock();
    for package in packages {
        cache.insert(package.id.clone(), package.clone());
    }
}

fn json_value_to_proto(value: JsonValue) -> ::prost_types::Value {
    use prost_types::{value::Kind, ListValue, Struct, Value};

    let kind = match value {
        JsonValue::Null => Kind::NullValue(0),
        JsonValue::Bool(value) => Kind::BoolValue(value),
        JsonValue::Number(value) => Kind::NumberValue(value.as_f64().unwrap_or_default()),
        JsonValue::String(value) => Kind::StringValue(value),
        JsonValue::Array(values) => Kind::ListValue(ListValue {
            values: values.into_iter().map(json_value_to_proto).collect(),
        }),
        JsonValue::Object(values) => Kind::StructValue(Struct {
            fields: values
                .into_iter()
                .map(|(key, value)| (key, json_value_to_proto(value)))
                .collect(),
        }),
    };

    Value { kind: Some(kind) }
}

fn proto_value_to_json(value: &::prost_types::Value) -> JsonValue {
    use prost_types::value::Kind;

    match &value.kind {
        Some(Kind::NullValue(_)) | None => JsonValue::Null,
        Some(Kind::NumberValue(value)) => serde_json::Number::from_f64(*value)
            .map(JsonValue::Number)
            .unwrap_or(JsonValue::Null),
        Some(Kind::StringValue(value)) => JsonValue::String(value.clone()),
        Some(Kind::BoolValue(value)) => JsonValue::Bool(*value),
        Some(Kind::StructValue(value)) => JsonValue::Object(
            value
                .fields
                .iter()
                .map(|(key, value)| (key.clone(), proto_value_to_json(value)))
                .collect(),
        ),
        Some(Kind::ListValue(value)) => {
            JsonValue::Array(value.values.iter().map(proto_value_to_json).collect())
        }
    }
}

fn raw_author_to_proto(author: Option<RawAuthor>) -> Option<proto::ManifestAuthor> {
    author.and_then(|author| match author {
        RawAuthor::Simple(value) => {
            normalize_optional_string(Some(value)).map(|value| proto::ManifestAuthor {
                author: Some(proto::manifest_author::Author::Simple(value)),
            })
        }
        RawAuthor::Detailed { name } => {
            normalize_optional_string(Some(name)).map(|name| proto::ManifestAuthor {
                author: Some(proto::manifest_author::Author::Detailed(
                    proto::AuthorName { name },
                )),
            })
        }
    })
}

fn raw_preference_to_proto(preference: RawPreference) -> proto::PreferenceDefinition {
    proto::PreferenceDefinition {
        name: preference.name.trim().to_string(),
        r#type: preference.r#type.trim().to_string(),
        title: normalize_optional_string(preference.title),
        description: normalize_optional_string(preference.description),
        required: preference.required,
        default_value: match preference.default {
            JsonValue::Null => None,
            value => Some(json_value_to_proto(value)),
        },
        data: preference
            .data
            .unwrap_or_default()
            .into_iter()
            .map(|entry| proto::PreferenceOption {
                title: entry.title,
                value: entry.value,
            })
            .collect(),
        label: normalize_optional_string(preference.label),
    }
}

fn raw_argument_to_proto(argument: RawArgument) -> proto::ArgumentDefinition {
    proto::ArgumentDefinition {
        name: argument.name.trim().to_string(),
        r#type: argument.r#type.trim().to_string(),
        placeholder: normalize_optional_string(argument.placeholder),
        required: argument.required,
        data: argument
            .data
            .unwrap_or_default()
            .into_iter()
            .map(|entry| proto::ArgumentOption {
                title: entry.title,
                value: entry.value,
            })
            .collect(),
    }
}

fn raw_command_manifest_to_proto(command: RawCommandManifest) -> proto::CommandManifest {
    proto::CommandManifest {
        name: command.name.trim().to_string(),
        title: normalize_optional_string(command.title),
        subtitle: normalize_optional_string(command.subtitle),
        description: normalize_optional_string(command.description),
        icon: normalize_optional_string(command.icon),
        mode: normalize_optional_string(command.mode),
        interval: normalize_optional_string(command.interval),
        keywords: normalize_string_list(command.keywords.unwrap_or_default()),
        arguments: command
            .arguments
            .unwrap_or_default()
            .into_iter()
            .map(raw_argument_to_proto)
            .collect(),
        disabled_by_default: command.disabled_by_default,
        preferences: command
            .preferences
            .unwrap_or_default()
            .into_iter()
            .map(raw_preference_to_proto)
            .collect(),
    }
}

fn raw_manifest_to_proto(manifest: RawPackageManifest) -> proto::ExtensionManifest {
    proto::ExtensionManifest {
        name: normalize_optional_string(manifest.name),
        title: normalize_optional_string(manifest.title),
        description: normalize_optional_string(manifest.description),
        icon: normalize_optional_string(manifest.icon),
        author: raw_author_to_proto(manifest.author),
        owner: normalize_optional_string(manifest.owner),
        commands: manifest
            .commands
            .unwrap_or_default()
            .into_iter()
            .map(raw_command_manifest_to_proto)
            .collect(),
        preferences: manifest
            .preferences
            .unwrap_or_default()
            .into_iter()
            .map(raw_preference_to_proto)
            .collect(),
        version: normalize_optional_string(manifest.version),
        access: normalize_optional_string(manifest.access),
        license: normalize_optional_string(manifest.license),
        platforms: normalize_string_list(manifest.platforms.unwrap_or_default()),
        categories: normalize_string_list(manifest.categories.unwrap_or_default()),
        contributors: normalize_string_list(manifest.contributors.unwrap_or_default()),
        past_contributors: normalize_string_list(manifest.past_contributors.unwrap_or_default()),
        keywords: normalize_string_list(manifest.keywords.unwrap_or_default()),
    }
}

fn parse_source_kind(value: Option<&str>) -> i32 {
    match value.unwrap_or_default() {
        "EXTENSION_STORE_SOURCE_KIND_BEAM" | "beam" | "BEAM" => {
            proto::ExtensionStoreSourceKind::Beam as i32
        }
        "EXTENSION_STORE_SOURCE_KIND_COMMUNITY" | "community" | "COMMUNITY" => {
            proto::ExtensionStoreSourceKind::Community as i32
        }
        "EXTENSION_STORE_SOURCE_KIND_RAYCAST" | "raycast" | "RAYCAST" => {
            proto::ExtensionStoreSourceKind::Raycast as i32
        }
        _ => proto::ExtensionStoreSourceKind::Unspecified as i32,
    }
}

fn parse_verification_status(value: Option<&str>) -> i32 {
    match value.unwrap_or_default() {
        "EXTENSION_VERIFICATION_STATUS_VERIFIED" | "verified" | "VERIFIED" => {
            proto::ExtensionVerificationStatus::Verified as i32
        }
        "EXTENSION_VERIFICATION_STATUS_CURATED" | "curated" | "CURATED" => {
            proto::ExtensionVerificationStatus::Curated as i32
        }
        "EXTENSION_VERIFICATION_STATUS_COMMUNITY" | "community" | "COMMUNITY" => {
            proto::ExtensionVerificationStatus::Community as i32
        }
        "EXTENSION_VERIFICATION_STATUS_UNVERIFIED" | "unverified" | "UNVERIFIED" => {
            proto::ExtensionVerificationStatus::Unverified as i32
        }
        _ => proto::ExtensionVerificationStatus::Unspecified as i32,
    }
}

fn parse_release_channel(value: Option<&str>) -> i32 {
    match value.unwrap_or_default() {
        "EXTENSION_RELEASE_CHANNEL_STABLE" | "stable" | "STABLE" => {
            proto::ExtensionReleaseChannel::Stable as i32
        }
        "EXTENSION_RELEASE_CHANNEL_BETA" | "beta" | "BETA" => {
            proto::ExtensionReleaseChannel::Beta as i32
        }
        "EXTENSION_RELEASE_CHANNEL_NIGHTLY" | "nightly" | "NIGHTLY" => {
            proto::ExtensionReleaseChannel::Nightly as i32
        }
        "EXTENSION_RELEASE_CHANNEL_CUSTOM" | "custom" | "CUSTOM" => {
            proto::ExtensionReleaseChannel::Custom as i32
        }
        _ => proto::ExtensionReleaseChannel::Unspecified as i32,
    }
}

fn parse_artifact_kind(value: Option<&str>) -> i32 {
    match value.unwrap_or_default() {
        "EXTENSION_PACKAGE_ARTIFACT_KIND_ZIP" | "zip" | "ZIP" => {
            proto::ExtensionPackageArtifactKind::Zip as i32
        }
        "EXTENSION_PACKAGE_ARTIFACT_KIND_TAR_GZ" | "tar.gz" | "tgz" | "TAR_GZ" => {
            proto::ExtensionPackageArtifactKind::TarGz as i32
        }
        _ => proto::ExtensionPackageArtifactKind::Unspecified as i32,
    }
}

fn parse_checksum_algorithm(value: Option<&str>) -> i32 {
    match value.unwrap_or_default() {
        "EXTENSION_CHECKSUM_ALGORITHM_SHA256" | "sha256" | "SHA256" => {
            proto::ExtensionChecksumAlgorithm::Sha256 as i32
        }
        _ => proto::ExtensionChecksumAlgorithm::Unspecified as i32,
    }
}

fn resolve_relative_reference(value: Option<String>, base: Option<&CatalogBase>) -> Option<String> {
    let normalized = normalize_optional_string(value)?;
    if normalized.starts_with("http://")
        || normalized.starts_with("https://")
        || normalized.starts_with("file://")
        || normalized.starts_with("asset:")
        || normalized.starts_with("data:")
    {
        return Some(normalized);
    }

    if let Some(base) = base {
        match base {
            CatalogBase::File(root) => {
                let candidate = root.join(&normalized);
                if let Ok(url) = Url::from_file_path(candidate) {
                    return Some(url.to_string());
                }
            }
            CatalogBase::Url(root) => {
                if let Ok(url) = root.join(&normalized) {
                    return Some(url.to_string());
                }
            }
        }
    }

    Some(normalized)
}

fn normalize_manifest_with_package_context(
    manifest: Option<RawPackageManifest>,
    _package_id: &str,
    _compatibility: Option<&RawStoreCompatibility>,
    _release: Option<&proto::ExtensionStoreRelease>,
) -> Option<proto::ExtensionManifest> {
    manifest.map(raw_manifest_to_proto)
}

fn raw_store_source_to_proto(source: Option<RawStoreSource>) -> proto::ExtensionStoreSource {
    let source = source.unwrap_or(RawStoreSource {
        id: Some("beam".to_string()),
        label: Some("Beam Store".to_string()),
        kind: Some("EXTENSION_STORE_SOURCE_KIND_BEAM".to_string()),
        homepage_url: None,
    });

    proto::ExtensionStoreSource {
        id: normalize_optional_string(source.id).unwrap_or_else(|| "beam".to_string()),
        label: normalize_optional_string(source.label).unwrap_or_else(|| "Beam Store".to_string()),
        kind: parse_source_kind(source.kind.as_deref()),
        homepage_url: normalize_optional_string(source.homepage_url),
    }
}

fn raw_store_checksum_to_proto(
    checksum: RawStoreChecksum,
) -> Option<proto::ExtensionStoreChecksum> {
    let value = normalize_optional_string(checksum.value)?;
    Some(proto::ExtensionStoreChecksum {
        algorithm: parse_checksum_algorithm(checksum.algorithm.as_deref()),
        value,
    })
}

fn raw_store_artifact_to_proto(
    artifact: RawStoreArtifact,
    base: Option<&CatalogBase>,
) -> Option<proto::ExtensionStoreArtifact> {
    let id = normalize_optional_string(artifact.id)?;
    let download_url = resolve_relative_reference(artifact.download_url, base)?;

    Some(proto::ExtensionStoreArtifact {
        id,
        kind: parse_artifact_kind(artifact.kind.as_deref()),
        download_url,
        file_name: normalize_optional_string(artifact.file_name),
        mime_type: normalize_optional_string(artifact.mime_type),
        size_bytes: artifact.size_bytes,
        checksums: artifact
            .checksums
            .into_iter()
            .filter_map(raw_store_checksum_to_proto)
            .collect(),
        verification: Some(proto::ExtensionStoreArtifactVerification {
            signer: artifact
                .verification
                .as_ref()
                .and_then(|verification| normalize_optional_string(verification.signer.clone())),
            signature: artifact
                .verification
                .as_ref()
                .and_then(|verification| normalize_optional_string(verification.signature.clone())),
            provenance_url: artifact.verification.as_ref().and_then(|verification| {
                resolve_relative_reference(verification.provenance_url.clone(), base)
            }),
            transparency_log_url: artifact.verification.and_then(|verification| {
                resolve_relative_reference(verification.transparency_log_url, base)
            }),
        }),
        platforms: normalize_string_list(artifact.platforms),
        desktop_environments: normalize_string_list(artifact.desktop_environments),
    })
}

fn current_platform_tokens() -> Vec<String> {
    vec![std::env::consts::OS.to_lowercase()]
}

fn current_desktop_tokens() -> Vec<String> {
    let mut tokens = Vec::new();
    for value in [
        std::env::var("XDG_CURRENT_DESKTOP").ok(),
        std::env::var("DESKTOP_SESSION").ok(),
    ]
    .into_iter()
    .flatten()
    {
        for token in value.split([':', ';', ',']) {
            let normalized = token.trim().to_lowercase();
            if !normalized.is_empty() {
                tokens.push(normalized);
            }
        }
    }

    tokens
}

fn list_matches_environment(requirements: &[String], actual: &[String]) -> bool {
    if requirements.is_empty() {
        return true;
    }

    requirements.iter().any(|required| {
        let normalized = required.trim().to_lowercase();
        !normalized.is_empty() && actual.iter().any(|value| value == &normalized)
    })
}

fn artifact_matches_runtime(artifact: &proto::ExtensionStoreArtifact) -> bool {
    let platforms = current_platform_tokens();
    let desktops = current_desktop_tokens();

    list_matches_environment(&artifact.platforms, &platforms)
        && list_matches_environment(&artifact.desktop_environments, &desktops)
}

fn artifact_matches_platform(artifact: &proto::ExtensionStoreArtifact) -> bool {
    let platforms = current_platform_tokens();
    list_matches_environment(&artifact.platforms, &platforms)
}

fn select_release_artifact(
    release: &proto::ExtensionStoreRelease,
) -> Option<proto::ExtensionStoreArtifact> {
    if release.artifacts.is_empty() {
        return None;
    }

    if let Some(primary_artifact_id) = release
        .primary_artifact_id
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        if let Some(artifact) = release.artifacts.iter().find(|artifact| {
            artifact.id == primary_artifact_id && artifact_matches_runtime(artifact)
        }) {
            return Some(artifact.clone());
        }
    }

    if let Some(artifact) = release
        .artifacts
        .iter()
        .find(|artifact| artifact_matches_runtime(artifact))
    {
        return Some(artifact.clone());
    }

    if let Some(artifact) = release
        .artifacts
        .iter()
        .find(|artifact| artifact_matches_platform(artifact))
    {
        return Some(artifact.clone());
    }

    if let Some(primary_artifact_id) = release
        .primary_artifact_id
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        if let Some(artifact) = release
            .artifacts
            .iter()
            .find(|artifact| artifact.id == primary_artifact_id)
        {
            return Some(artifact.clone());
        }
    }

    release.artifacts.first().cloned()
}

fn raw_store_release_to_proto(
    release: RawStoreRelease,
    base: Option<&CatalogBase>,
) -> Option<proto::ExtensionStoreRelease> {
    let version = normalize_optional_string(release.version)?;
    let artifacts = release
        .artifacts
        .into_iter()
        .filter_map(|artifact| raw_store_artifact_to_proto(artifact, base))
        .collect::<Vec<_>>();

    let mut normalized_release = proto::ExtensionStoreRelease {
        version,
        download_url: String::new(),
        published_at: normalize_optional_string(release.published_at),
        checksum_sha256: normalize_optional_string(release.checksum_sha256),
        changelog_url: resolve_relative_reference(release.changelog_url, base),
        channel: parse_release_channel(release.channel.as_deref()),
        channel_name: normalize_optional_string(release.channel_name),
        prerelease: release.prerelease.unwrap_or(false),
        artifacts,
        primary_artifact_id: normalize_optional_string(release.primary_artifact_id),
        release_notes: Some(proto::ExtensionStoreReleaseNotes {
            summary: release
                .release_notes
                .as_ref()
                .and_then(|notes| normalize_optional_string(notes.summary.clone())),
            markdown: release
                .release_notes
                .as_ref()
                .and_then(|notes| normalize_optional_string(notes.markdown.clone())),
            changelog_url: release
                .release_notes
                .and_then(|notes| resolve_relative_reference(notes.changelog_url, base)),
        }),
        published_by: normalize_optional_string(release.published_by),
    };

    let selected_artifact = select_release_artifact(&normalized_release);
    normalized_release.download_url = resolve_relative_reference(release.download_url, base)
        .or_else(|| {
            selected_artifact
                .as_ref()
                .map(|artifact| artifact.download_url.clone())
        })?;

    if normalized_release.checksum_sha256.is_none() {
        normalized_release.checksum_sha256 = selected_artifact.as_ref().and_then(|artifact| {
            artifact
                .checksums
                .iter()
                .find(|checksum| {
                    checksum.algorithm == proto::ExtensionChecksumAlgorithm::Sha256 as i32
                })
                .map(|checksum| checksum.value.clone())
        });
    }

    if normalized_release.primary_artifact_id.is_none() {
        normalized_release.primary_artifact_id = selected_artifact
            .as_ref()
            .map(|artifact| artifact.id.clone());
    }

    if normalized_release.changelog_url.is_none() {
        normalized_release.changelog_url = normalized_release
            .release_notes
            .as_ref()
            .and_then(|notes| notes.changelog_url.clone());
    }

    Some(normalized_release)
}

fn merge_package_releases(
    releases: Vec<RawStoreRelease>,
    latest_release: Option<RawStoreRelease>,
    base: Option<&CatalogBase>,
) -> Vec<proto::ExtensionStoreRelease> {
    let mut by_version = HashMap::<String, proto::ExtensionStoreRelease>::new();
    for release in releases
        .into_iter()
        .chain(latest_release.into_iter())
        .filter_map(|release| raw_store_release_to_proto(release, base))
    {
        by_version.insert(release.version.clone(), release);
    }

    by_version.into_values().collect()
}

fn release_matches_channel(release: &proto::ExtensionStoreRelease, channel: i32) -> bool {
    channel == proto::ExtensionReleaseChannel::Unspecified as i32 || release.channel == channel
}

fn select_preferred_release(
    releases: &[proto::ExtensionStoreRelease],
    preferred_channel: i32,
) -> Option<proto::ExtensionStoreRelease> {
    let mut candidates = releases
        .iter()
        .filter(|release| release_matches_channel(release, preferred_channel))
        .cloned()
        .collect::<Vec<_>>();

    if candidates.is_empty()
        && preferred_channel != proto::ExtensionReleaseChannel::Unspecified as i32
    {
        candidates = releases.to_vec();
    }

    candidates.into_iter().max_by(|left, right| {
        let left_version = parse_version(&left.version);
        let right_version = parse_version(&right.version);
        left_version
            .cmp(&right_version)
            .then_with(|| left.published_at.cmp(&right.published_at))
    })
}

fn raw_store_package_to_proto(
    package: RawStorePackage,
    catalog_source: &proto::ExtensionStoreSource,
    base: Option<&CatalogBase>,
) -> Option<proto::ExtensionStorePackage> {
    let id = normalize_optional_string(package.id)?;
    let slug = normalize_optional_string(package.slug)?;
    let title = normalize_optional_string(package.title)?;
    let author = package.author?;
    let author_handle = normalize_optional_string(author.handle)?;
    let compatibility = package.compatibility.clone();
    let default_channel = parse_release_channel(package.default_channel.as_deref());
    let releases = merge_package_releases(package.releases, package.latest_release, base);
    let latest_release = select_preferred_release(
        &releases,
        if default_channel == proto::ExtensionReleaseChannel::Unspecified as i32 {
            proto::ExtensionReleaseChannel::Stable as i32
        } else {
            default_channel
        },
    )?;
    let manifest = normalize_manifest_with_package_context(
        package.manifest,
        &id,
        compatibility.as_ref(),
        Some(&latest_release),
    );

    Some(proto::ExtensionStorePackage {
        id,
        slug,
        title,
        summary: normalize_optional_string(package.summary),
        description: normalize_optional_string(package.description),
        author: Some(proto::ExtensionStoreAuthor {
            handle: author_handle,
            name: normalize_optional_string(author.name),
            avatar_url: normalize_optional_string(author.avatar_url),
            profile_url: normalize_optional_string(author.profile_url),
        }),
        icons: Some(proto::ExtensionStoreIcons {
            light: package
                .icons
                .as_ref()
                .and_then(|icons| normalize_optional_string(icons.light.clone())),
            dark: package
                .icons
                .and_then(|icons| normalize_optional_string(icons.dark)),
        }),
        categories: normalize_string_list(package.categories),
        tags: normalize_string_list(package.tags),
        source: Some(
            package
                .source
                .map(|source| raw_store_source_to_proto(Some(source)))
                .unwrap_or_else(|| catalog_source.clone()),
        ),
        verification: Some(match package.verification {
            Some(verification) => proto::ExtensionStoreVerification {
                status: parse_verification_status(verification.status.as_deref()),
                label: normalize_optional_string(verification.label),
                verified_by: normalize_optional_string(verification.verified_by),
                summary: normalize_optional_string(verification.summary),
            },
            None => proto::ExtensionStoreVerification {
                status: proto::ExtensionVerificationStatus::Unspecified as i32,
                label: None,
                verified_by: None,
                summary: None,
            },
        }),
        compatibility: Some(match compatibility {
            Some(compatibility) => proto::ExtensionStoreCompatibility {
                platforms: normalize_string_list(compatibility.platforms),
                desktop_environments: normalize_string_list(compatibility.desktop_environments),
                minimum_beam_version: normalize_optional_string(compatibility.minimum_beam_version),
                maximum_beam_version: normalize_optional_string(compatibility.maximum_beam_version),
                linux_tested: compatibility.linux_tested.unwrap_or(false),
                wayland_tested: compatibility.wayland_tested.unwrap_or(false),
                x11_tested: compatibility.x11_tested.unwrap_or(false),
                notes: normalize_string_list(compatibility.notes),
            },
            None => proto::ExtensionStoreCompatibility {
                platforms: Vec::new(),
                desktop_environments: Vec::new(),
                minimum_beam_version: None,
                maximum_beam_version: None,
                linux_tested: false,
                wayland_tested: false,
                x11_tested: false,
                notes: Vec::new(),
            },
        }),
        latest_release: Some(latest_release),
        readme_url: resolve_relative_reference(package.readme_url, base),
        source_url: resolve_relative_reference(package.source_url, base),
        screenshots: package
            .screenshots
            .into_iter()
            .filter_map(|screenshot| resolve_relative_reference(Some(screenshot), base))
            .collect(),
        manifest,
        download_count: package.download_count,
        releases,
        default_channel,
        package_format_version: normalize_optional_string(package.package_format_version),
    })
}

fn raycast_listing_to_proto(listing: RawRaycastListing) -> Option<proto::ExtensionStorePackage> {
    let slug = normalize_optional_string(listing.name.clone())?;
    let title = normalize_optional_string(listing.title.clone())?;
    let owner_handle = raycast_owner_handle(&listing);
    let package_id = raycast_package_id(&owner_handle, &slug);
    let synthetic_version = synthetic_raycast_version(&listing);
    let release_published_at = timestamp_to_rfc3339(listing.updated_at)
        .or_else(|| timestamp_to_rfc3339(listing.created_at));
    let screenshots = raycast_screenshots(&listing, &slug);
    let platforms = normalize_string_list(listing.platforms.clone().unwrap_or_default());
    let manifest = proto::ExtensionManifest {
        name: Some(slug.clone()),
        title: Some(title.clone()),
        description: normalize_optional_string(listing.description.clone()),
        icon: listing
            .icons
            .as_ref()
            .and_then(|icons| normalize_optional_string(icons.light.clone()))
            .or_else(|| {
                listing
                    .icons
                    .as_ref()
                    .and_then(|icons| normalize_optional_string(icons.dark.clone()))
            }),
        author: raycast_manifest_author(&listing),
        owner: Some(owner_handle.clone()),
        commands: raycast_manifest_commands(&listing),
        preferences: Vec::new(),
        version: Some(synthetic_version.clone()),
        access: normalize_optional_string(listing.access.clone()),
        license: None,
        platforms: platforms.clone(),
        categories: normalize_string_list(listing.categories.clone()),
        contributors: raycast_manifest_contributors(&listing.contributors),
        past_contributors: Vec::new(),
        keywords: normalize_string_list(listing.prompt_examples.clone()),
    };

    let release = proto::ExtensionStoreRelease {
        version: synthetic_version,
        download_url: normalize_optional_string(listing.download_url.clone())?,
        published_at: release_published_at,
        checksum_sha256: None,
        changelog_url: normalize_optional_string(listing.source_url.clone()),
        channel: proto::ExtensionReleaseChannel::Stable as i32,
        channel_name: None,
        prerelease: false,
        artifacts: vec![proto::ExtensionStoreArtifact {
            id: "raycast-zip".to_string(),
            kind: proto::ExtensionPackageArtifactKind::Zip as i32,
            download_url: normalize_optional_string(listing.download_url.clone())?,
            file_name: Some(format!("{slug}.zip")),
            mime_type: Some("application/zip".to_string()),
            size_bytes: None,
            checksums: Vec::new(),
            verification: Some(proto::ExtensionStoreArtifactVerification {
                signer: None,
                signature: None,
                provenance_url: None,
                transparency_log_url: None,
            }),
            platforms: Vec::new(),
            desktop_environments: Vec::new(),
        }],
        primary_artifact_id: Some("raycast-zip".to_string()),
        release_notes: Some(proto::ExtensionStoreReleaseNotes {
            summary: Some("Imported from the Raycast Store.".to_string()),
            markdown: None,
            changelog_url: normalize_optional_string(listing.source_url.clone()),
        }),
        published_by: normalize_optional_string(
            listing
                .author
                .as_ref()
                .and_then(|author| author.handle.clone())
                .or_else(|| {
                    listing
                        .author
                        .as_ref()
                        .and_then(|author| author.name.clone())
                }),
        ),
    };

    let mut tags = listing.seo_categories.clone();
    tags.extend(listing.tools.clone());

    Some(proto::ExtensionStorePackage {
        id: package_id,
        slug: slug.clone(),
        title,
        summary: None,
        description: normalize_optional_string(listing.description),
        author: Some(proto::ExtensionStoreAuthor {
            handle: owner_handle.clone(),
            name: normalize_optional_string(
                listing
                    .owner
                    .as_ref()
                    .and_then(|owner| owner.name.clone()),
            ),
            avatar_url: normalize_optional_string(
                listing
                    .owner
                    .as_ref()
                    .and_then(|owner| owner.avatar.clone()),
            ),
            profile_url: listing.store_url.clone().map(|_| format!("https://www.raycast.com/{owner_handle}")),
        }),
        icons: Some(proto::ExtensionStoreIcons {
            light: listing
                .icons
                .as_ref()
                .and_then(|icons| normalize_optional_string(icons.light.clone())),
            dark: listing
                .icons
                .and_then(|icons| normalize_optional_string(icons.dark)),
        }),
        categories: normalize_string_list(listing.categories),
        tags: normalize_string_list(tags),
        source: Some(raycast_store_source()),
        verification: Some(proto::ExtensionStoreVerification {
            status: proto::ExtensionVerificationStatus::Curated as i32,
            label: Some("Raycast".to_string()),
            verified_by: Some("Raycast Store".to_string()),
            summary: Some(
                "Imported from the official Raycast Store. Beam compatibility varies by extension."
                    .to_string(),
            ),
        }),
        compatibility: Some(proto::ExtensionStoreCompatibility {
            platforms,
            desktop_environments: Vec::new(),
            minimum_beam_version: None,
            maximum_beam_version: None,
            linux_tested: false,
            wayland_tested: false,
            x11_tested: false,
            notes: vec![
                "Imported from the Raycast Store. Compatibility depends on Beam's Raycast API coverage."
                    .to_string(),
            ],
        }),
        latest_release: Some(release.clone()),
        readme_url: normalize_optional_string(listing.readme_url.clone()),
        source_url: normalize_optional_string(listing.source_url.clone()),
        screenshots,
        manifest: Some(manifest),
        download_count: listing.download_count,
        releases: vec![release],
        default_channel: proto::ExtensionReleaseChannel::Stable as i32,
        package_format_version: normalize_optional_string(listing.api_version),
    })
}

async fn fetch_raycast_search_results(query: &str) -> Result<Vec<proto::ExtensionStorePackage>> {
    let trimmed_query = query.trim();
    if trimmed_query.is_empty() {
        return Ok(Vec::new());
    }

    let endpoint = Url::parse_with_params(
        &format!("{RAYCAST_STORE_API_BASE}/store_listings/search"),
        &[("q", trimmed_query)],
    )
    .map_err(|error| {
        ExtensionsError::Message(format!("invalid Raycast Store search URL: {error}"))
    })?;
    let response = reqwest::get(endpoint).await?;
    if !response.status().is_success() {
        return Err(ExtensionsError::Network(format!(
            "Raycast Store search failed with status {}",
            response.status()
        )));
    }

    let payload: RawRaycastSearchResponse = response.json().await?;
    let packages = payload
        .data
        .into_iter()
        .filter_map(raycast_listing_to_proto)
        .collect::<Vec<_>>();
    cache_raycast_packages(&packages);
    Ok(packages)
}

async fn fetch_raycast_package(
    owner: &str,
    slug: &str,
) -> Result<Option<proto::ExtensionStorePackage>> {
    let package_id = raycast_package_id(owner, slug);
    if let Some(cached) = RAYCAST_PACKAGE_CACHE.lock().get(&package_id).cloned() {
        return Ok(Some(cached));
    }

    let packages = fetch_raycast_search_results(slug).await?;
    Ok(packages.into_iter().find(|package| {
        package.slug.eq_ignore_ascii_case(slug)
            && package
                .author
                .as_ref()
                .is_some_and(|author| author.handle.eq_ignore_ascii_case(owner))
    }))
}

fn load_catalog_from_str(
    content: &str,
    base: Option<&CatalogBase>,
) -> Result<proto::ExtensionStoreCatalog> {
    let raw_catalog: RawStoreCatalog = serde_json::from_str(content)?;
    let source = raw_store_source_to_proto(raw_catalog.source);

    Ok(proto::ExtensionStoreCatalog {
        source: Some(source.clone()),
        packages: raw_catalog
            .packages
            .into_iter()
            .filter_map(|package| raw_store_package_to_proto(package, &source, base))
            .collect(),
        generated_at: normalize_optional_string(raw_catalog.generated_at),
        format_version: normalize_optional_string(raw_catalog.format_version),
    })
}

fn resolve_catalog_file_candidates(app: &AppHandle) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(path) = std::env::var(EXTENSIONS_CONFIG.store_catalog.path_env_name) {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            candidates.push(PathBuf::from(trimmed));
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(
            resource_dir
                .join(EXTENSIONS_CONFIG.store_catalog.directory_name)
                .join(EXTENSIONS_CONFIG.store_catalog.file_name),
        );
        candidates.push(resource_dir.join(EXTENSIONS_CONFIG.store_catalog.file_name));
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if let Some(workspace_root) = manifest_dir.parent() {
        candidates.push(
            workspace_root
                .join(EXTENSIONS_CONFIG.store_catalog.directory_name)
                .join(EXTENSIONS_CONFIG.store_catalog.file_name),
        );
    }

    candidates
}

async fn load_catalog(app: &AppHandle) -> Result<proto::ExtensionStoreCatalog> {
    if let Ok(url) = std::env::var(EXTENSIONS_CONFIG.store_catalog.url_env_name) {
        let trimmed = url.trim();
        if !trimmed.is_empty() {
            let response = reqwest::get(trimmed).await?;
            if !response.status().is_success() {
                return Err(ExtensionsError::Network(format!(
                    "store catalog request failed with status {}",
                    response.status()
                )));
            }

            let base = Url::parse(trimmed).ok().map(CatalogBase::Url);
            return load_catalog_from_str(&response.text().await?, base.as_ref());
        }
    }

    for candidate in resolve_catalog_file_candidates(app) {
        if !candidate.is_file() {
            continue;
        }

        let content = fs::read_to_string(&candidate)?;
        let base = CatalogBase::File(
            candidate
                .parent()
                .map(PathBuf::from)
                .unwrap_or_else(|| PathBuf::from(".")),
        );
        return load_catalog_from_str(&content, Some(&base));
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let default_base = manifest_dir.parent().map(|workspace_root| {
        CatalogBase::File(workspace_root.join(EXTENSIONS_CONFIG.store_catalog.directory_name))
    });

    load_catalog_from_str(
        EXTENSIONS_CONFIG.store_catalog.default_catalog_json,
        default_base.as_ref(),
    )
}

fn store_source_to_json(source: &proto::ExtensionStoreSource) -> JsonValue {
    json!({
        "id": source.id,
        "label": source.label,
        "kind": source.kind,
        "homepageUrl": source.homepage_url,
    })
}

fn store_author_to_json(author: &proto::ExtensionStoreAuthor) -> JsonValue {
    json!({
        "handle": author.handle,
        "name": author.name,
        "avatarUrl": author.avatar_url,
        "profileUrl": author.profile_url,
    })
}

fn store_icons_to_json(icons: &proto::ExtensionStoreIcons) -> JsonValue {
    json!({
        "light": icons.light,
        "dark": icons.dark,
    })
}

fn store_verification_to_json(verification: &proto::ExtensionStoreVerification) -> JsonValue {
    json!({
        "status": verification.status,
        "label": verification.label,
        "verifiedBy": verification.verified_by,
        "summary": verification.summary,
    })
}

fn store_compatibility_to_json(compatibility: &proto::ExtensionStoreCompatibility) -> JsonValue {
    json!({
        "platforms": compatibility.platforms,
        "desktopEnvironments": compatibility.desktop_environments,
        "minimumBeamVersion": compatibility.minimum_beam_version,
        "maximumBeamVersion": compatibility.maximum_beam_version,
        "linuxTested": compatibility.linux_tested,
        "waylandTested": compatibility.wayland_tested,
        "x11Tested": compatibility.x11_tested,
        "notes": compatibility.notes,
    })
}

fn store_checksum_to_json(checksum: &proto::ExtensionStoreChecksum) -> JsonValue {
    json!({
        "algorithm": checksum.algorithm,
        "value": checksum.value,
    })
}

fn store_artifact_verification_to_json(
    verification: &proto::ExtensionStoreArtifactVerification,
) -> JsonValue {
    json!({
        "signer": verification.signer,
        "signature": verification.signature,
        "provenanceUrl": verification.provenance_url,
        "transparencyLogUrl": verification.transparency_log_url,
    })
}

fn store_artifact_to_json(artifact: &proto::ExtensionStoreArtifact) -> JsonValue {
    json!({
        "id": artifact.id,
        "kind": artifact.kind,
        "downloadUrl": artifact.download_url,
        "fileName": artifact.file_name,
        "mimeType": artifact.mime_type,
        "sizeBytes": artifact.size_bytes,
        "checksums": artifact.checksums.iter().map(store_checksum_to_json).collect::<Vec<_>>(),
        "verification": artifact.verification.as_ref().map(store_artifact_verification_to_json),
        "platforms": artifact.platforms,
        "desktopEnvironments": artifact.desktop_environments,
    })
}

fn store_release_notes_to_json(notes: &proto::ExtensionStoreReleaseNotes) -> JsonValue {
    json!({
        "summary": notes.summary,
        "markdown": notes.markdown,
        "changelogUrl": notes.changelog_url,
    })
}

fn store_release_to_json(release: &proto::ExtensionStoreRelease) -> JsonValue {
    json!({
        "version": release.version,
        "downloadUrl": release.download_url,
        "publishedAt": release.published_at,
        "checksumSha256": release.checksum_sha256,
        "changelogUrl": release.changelog_url,
        "channel": release.channel,
        "channelName": release.channel_name,
        "prerelease": release.prerelease,
        "artifacts": release.artifacts.iter().map(store_artifact_to_json).collect::<Vec<_>>(),
        "primaryArtifactId": release.primary_artifact_id,
        "releaseNotes": release.release_notes.as_ref().map(store_release_notes_to_json),
        "publishedBy": release.published_by,
    })
}

fn manifest_author_to_json(author: &proto::ManifestAuthor) -> JsonValue {
    match &author.author {
        Some(proto::manifest_author::Author::Simple(value)) => json!({ "simple": value }),
        Some(proto::manifest_author::Author::Detailed(value)) => {
            json!({ "detailed": { "name": value.name } })
        }
        None => JsonValue::Null,
    }
}

fn preference_to_json(preference: &proto::PreferenceDefinition) -> JsonValue {
    json!({
        "name": preference.name,
        "type": preference.r#type,
        "title": preference.title,
        "description": preference.description,
        "required": preference.required,
        "defaultValue": preference.default_value.as_ref().map(proto_value_to_json),
        "data": preference.data.iter().map(|entry| {
            json!({
                "title": entry.title,
                "value": entry.value,
            })
        }).collect::<Vec<_>>(),
        "label": preference.label,
    })
}

fn argument_to_json(argument: &proto::ArgumentDefinition) -> JsonValue {
    json!({
        "name": argument.name,
        "type": argument.r#type,
        "placeholder": argument.placeholder,
        "required": argument.required,
        "data": argument.data.iter().map(|entry| {
            json!({
                "title": entry.title,
                "value": entry.value,
            })
        }).collect::<Vec<_>>(),
    })
}

fn command_manifest_to_json(command: &proto::CommandManifest) -> JsonValue {
    json!({
        "name": command.name,
        "title": command.title,
        "subtitle": command.subtitle,
        "description": command.description,
        "icon": command.icon,
        "mode": command.mode,
        "interval": command.interval,
        "keywords": command.keywords,
        "arguments": command.arguments.iter().map(argument_to_json).collect::<Vec<_>>(),
        "disabledByDefault": command.disabled_by_default,
        "preferences": command.preferences.iter().map(preference_to_json).collect::<Vec<_>>(),
    })
}

fn manifest_to_json(manifest: &proto::ExtensionManifest) -> JsonValue {
    json!({
        "name": manifest.name,
        "title": manifest.title,
        "description": manifest.description,
        "icon": manifest.icon,
        "author": manifest.author.as_ref().map(manifest_author_to_json),
        "owner": manifest.owner,
        "commands": manifest.commands.iter().map(command_manifest_to_json).collect::<Vec<_>>(),
        "preferences": manifest.preferences.iter().map(preference_to_json).collect::<Vec<_>>(),
        "version": manifest.version,
        "access": manifest.access,
        "license": manifest.license,
        "platforms": manifest.platforms,
        "categories": manifest.categories,
        "contributors": manifest.contributors,
        "pastContributors": manifest.past_contributors,
        "keywords": manifest.keywords,
    })
}

fn store_package_to_json(package: &proto::ExtensionStorePackage) -> JsonValue {
    json!({
        "id": package.id,
        "slug": package.slug,
        "title": package.title,
        "summary": package.summary,
        "description": package.description,
        "author": package.author.as_ref().map(store_author_to_json),
        "icons": package.icons.as_ref().map(store_icons_to_json),
        "categories": package.categories,
        "tags": package.tags,
        "source": package.source.as_ref().map(store_source_to_json),
        "verification": package.verification.as_ref().map(store_verification_to_json),
        "compatibility": package.compatibility.as_ref().map(store_compatibility_to_json),
        "latestRelease": package.latest_release.as_ref().map(store_release_to_json),
        "readmeUrl": package.readme_url,
        "sourceUrl": package.source_url,
        "screenshots": package.screenshots,
        "manifest": package.manifest.as_ref().map(manifest_to_json),
        "downloadCount": package.download_count,
        "releases": package.releases.iter().map(store_release_to_json).collect::<Vec<_>>(),
        "defaultChannel": package.default_channel,
        "packageFormatVersion": package.package_format_version,
    })
}

fn store_update_to_json(update: &proto::ExtensionStoreUpdate) -> JsonValue {
    json!({
        "id": update.id,
        "slug": update.slug,
        "title": update.title,
        "installedVersion": update.installed_version,
        "latestVersion": update.latest_version,
        "latestRelease": update.latest_release.as_ref().map(store_release_to_json),
        "verification": update.verification.as_ref().map(store_verification_to_json),
        "compatibility": update.compatibility.as_ref().map(store_compatibility_to_json),
        "author": update.author.as_ref().map(store_author_to_json),
        "source": update.source.as_ref().map(store_source_to_json),
    })
}

fn search_matches(package: &proto::ExtensionStorePackage, query: &str) -> bool {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return false;
    }

    let mut haystacks = vec![
        package.slug.to_lowercase(),
        package.title.to_lowercase(),
        package.summary.clone().unwrap_or_default().to_lowercase(),
        package
            .description
            .clone()
            .unwrap_or_default()
            .to_lowercase(),
        package
            .author
            .as_ref()
            .map(|author| author.handle.to_lowercase())
            .unwrap_or_default(),
    ];

    haystacks.extend(package.categories.iter().map(|value| value.to_lowercase()));
    haystacks.extend(package.tags.iter().map(|value| value.to_lowercase()));

    haystacks.into_iter().any(|value| value.contains(&query))
}

fn parse_version(value: &str) -> Option<Version> {
    Version::parse(value.trim_start_matches('v')).ok()
}

fn parse_requested_channel(value: Option<&str>) -> i32 {
    let parsed = parse_release_channel(value);
    if parsed == proto::ExtensionReleaseChannel::Unspecified as i32 {
        proto::ExtensionReleaseChannel::Stable as i32
    } else {
        parsed
    }
}

fn package_key(package: &proto::ExtensionStorePackage) -> Option<String> {
    let author = package.author.as_ref()?;
    Some(format!(
        "{}::{}",
        author.handle.trim().to_lowercase(),
        package.slug.trim().to_lowercase()
    ))
}

fn package_search_priority(package: &proto::ExtensionStorePackage, query: &str) -> (i32, i32, i64) {
    let normalized_query = query.trim().to_lowercase();
    let slug = package.slug.trim().to_lowercase();
    let title = package.title.trim().to_lowercase();
    let author = package
        .author
        .as_ref()
        .map(|author| author.handle.trim().to_lowercase())
        .unwrap_or_default();

    let match_score = if slug == normalized_query || title == normalized_query {
        4
    } else if slug.starts_with(&normalized_query)
        || title.starts_with(&normalized_query)
        || author.starts_with(&normalized_query)
    {
        3
    } else if slug.contains(&normalized_query)
        || title.contains(&normalized_query)
        || author.contains(&normalized_query)
    {
        2
    } else {
        1
    };

    let source_score = match package.source.as_ref().map(|source| source.kind) {
        Some(value) if value == proto::ExtensionStoreSourceKind::Beam as i32 => 3,
        Some(value) if value == proto::ExtensionStoreSourceKind::Raycast as i32 => 2,
        Some(value) if value == proto::ExtensionStoreSourceKind::Community as i32 => 1,
        _ => 0,
    };

    (
        match_score,
        source_score,
        package.download_count.unwrap_or_default(),
    )
}

fn dedupe_packages(
    packages: impl IntoIterator<Item = proto::ExtensionStorePackage>,
) -> Vec<proto::ExtensionStorePackage> {
    let mut deduped = HashMap::<String, proto::ExtensionStorePackage>::new();
    for package in packages {
        deduped.entry(package.id.clone()).or_insert(package);
    }

    deduped.into_values().collect()
}

fn find_catalog_package<'a>(
    packages: &'a [proto::ExtensionStorePackage],
    package_id_or_slug: &str,
) -> Option<&'a proto::ExtensionStorePackage> {
    let normalized_package_id = package_id_or_slug.trim().to_lowercase();
    if normalized_package_id.is_empty() {
        return None;
    }

    packages.iter().find(|package| {
        package
            .id
            .trim()
            .eq_ignore_ascii_case(&normalized_package_id)
            || package
                .slug
                .trim()
                .eq_ignore_ascii_case(&normalized_package_id)
            || package_key(package)
                .as_ref()
                .is_some_and(|key| key == &normalized_package_id)
    })
}

fn build_store_update(
    package: &proto::ExtensionStorePackage,
    installed_version: &str,
) -> Option<proto::ExtensionStoreUpdate> {
    let preferred_channel =
        if package.default_channel == proto::ExtensionReleaseChannel::Unspecified as i32 {
            proto::ExtensionReleaseChannel::Stable as i32
        } else {
            package.default_channel
        };
    let latest_release = select_preferred_release(&package.releases, preferred_channel)
        .or_else(|| package.latest_release.clone())?;

    let installed_version_semver = parse_version(installed_version)?;
    let latest_version_semver = parse_version(&latest_release.version)?;
    if latest_version_semver <= installed_version_semver {
        return None;
    }

    Some(proto::ExtensionStoreUpdate {
        id: package.id.clone(),
        slug: package.slug.clone(),
        title: package.title.clone(),
        installed_version: installed_version.to_string(),
        latest_version: latest_release.version.clone(),
        latest_release: Some(latest_release),
        verification: package.verification.clone(),
        compatibility: package.compatibility.clone(),
        author: package.author.clone(),
        source: package.source.clone(),
    })
}

pub(crate) async fn resolve_store_artifact(
    app: &AppHandle,
    package_id_or_slug: &str,
    release_version: Option<&str>,
    release_channel: Option<&str>,
) -> Result<ResolvedStoreArtifact> {
    let normalized_package_id = package_id_or_slug.trim();
    if normalized_package_id.is_empty() {
        return Err(ExtensionsError::Message(
            "extension store package id is required".to_string(),
        ));
    }

    let package = if let Some((owner, slug)) = parse_raycast_package_id(normalized_package_id) {
        fetch_raycast_package(&owner, &slug).await?.ok_or_else(|| {
            ExtensionsError::Message(format!(
                "extension store package not found: {package_id_or_slug}"
            ))
        })?
    } else {
        let catalog = load_catalog(app).await?;
        find_catalog_package(&catalog.packages, normalized_package_id)
            .cloned()
            .ok_or_else(|| {
                ExtensionsError::Message(format!(
                    "extension store package not found: {package_id_or_slug}"
                ))
            })?
    };

    let requested_version = release_version
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned);
    let requested_channel = parse_requested_channel(release_channel);

    let release = if let Some(requested_version) = requested_version {
        package
            .releases
            .iter()
            .find(|release| release.version == requested_version)
            .cloned()
    } else {
        select_preferred_release(&package.releases, requested_channel)
            .or_else(|| package.latest_release.clone())
    }
    .ok_or_else(|| {
        ExtensionsError::Message(format!(
            "no matching release found for package {}",
            package.id
        ))
    })?;

    let artifact = select_release_artifact(&release).ok_or_else(|| {
        ExtensionsError::Message(format!(
            "no installable artifact found for package {} release {}",
            package.id, release.version
        ))
    })?;

    Ok(ResolvedStoreArtifact {
        package,
        release,
        artifact,
    })
}

#[tauri::command]
pub async fn search_extension_store(
    app: AppHandle,
    query: String,
    limit: Option<usize>,
) -> Result<JsonValue> {
    let catalog = load_catalog(&app).await?;
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return Ok(json!({ "packages": [] }));
    }

    let max_results = limit.unwrap_or(12).clamp(1, 100);
    let mut packages = catalog
        .packages
        .iter()
        .filter(|package| search_matches(package, normalized_query))
        .cloned()
        .collect::<Vec<_>>();
    packages.extend(fetch_raycast_search_results(normalized_query).await?);
    packages = dedupe_packages(packages);
    packages.sort_by(|left, right| {
        package_search_priority(right, normalized_query)
            .cmp(&package_search_priority(left, normalized_query))
            .then_with(|| left.title.cmp(&right.title))
    });
    packages.truncate(max_results);

    Ok(json!({
        "packages": packages.iter().map(store_package_to_json).collect::<Vec<_>>(),
    }))
}

#[tauri::command]
pub async fn get_extension_store_package(
    app: AppHandle,
    package_id: String,
) -> Result<Option<JsonValue>> {
    let normalized = package_id.trim();
    if normalized.is_empty() {
        return Ok(None);
    }

    if let Some((owner, slug)) = parse_raycast_package_id(normalized) {
        return fetch_raycast_package(&owner, &slug)
            .await
            .map(|package| package.map(|package| store_package_to_json(&package)));
    }

    let catalog = load_catalog(&app).await?;
    Ok(find_catalog_package(&catalog.packages, normalized).map(store_package_to_json))
}

#[tauri::command]
pub async fn get_extension_store_updates(app: AppHandle) -> Result<JsonValue> {
    let catalog = load_catalog(&app).await?;
    let discovered = discover_plugins(&app)?;

    let catalog_by_owner_and_slug = catalog
        .packages
        .iter()
        .filter_map(|package| {
            let author = package.author.as_ref()?;
            Some((
                format!(
                    "{}::{}",
                    author.handle.trim().to_lowercase(),
                    package.slug.trim().to_lowercase()
                ),
                package,
            ))
        })
        .collect::<HashMap<_, _>>();

    let mut installed_by_owner_and_slug =
        HashMap::<String, (&proto::DiscoveredPlugin, String)>::new();
    for plugin in &discovered {
        let Some(owner) = plugin
            .owner
            .as_ref()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
        else {
            continue;
        };
        let Some(version) = plugin
            .version
            .as_ref()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
        else {
            continue;
        };
        let slug = plugin.plugin_name.trim();
        if slug.is_empty() {
            continue;
        }

        installed_by_owner_and_slug
            .entry(format!("{}::{}", owner.to_lowercase(), slug.to_lowercase()))
            .or_insert((plugin, version.to_string()));
    }

    let mut updates = Vec::new();
    let mut raycast_candidates = Vec::<(String, String, String)>::new();
    for (key, (plugin, installed_version)) in installed_by_owner_and_slug {
        if let Some(package) = catalog_by_owner_and_slug.get(&key) {
            if let Some(update) = build_store_update(package, &installed_version) {
                updates.push(update);
            }
            continue;
        }

        let owner = plugin
            .owner
            .as_ref()
            .map(|value| value.trim().to_lowercase())
            .filter(|value| !value.is_empty());
        let slug = plugin.plugin_name.trim().to_lowercase();
        let Some(owner) = owner else {
            continue;
        };
        if slug.is_empty() {
            continue;
        }

        raycast_candidates.push((owner, slug, installed_version));
    }

    let raycast_updates = join_all(
        raycast_candidates
            .iter()
            .map(|(owner, slug, _installed_version)| fetch_raycast_package(owner, slug)),
    )
    .await;

    for ((owner, slug, installed_version), package_result) in
        raycast_candidates.into_iter().zip(raycast_updates)
    {
        let package = match package_result {
            Ok(Some(package)) => package,
            Ok(None) => continue,
            Err(error) => {
                eprintln!("Failed to check Raycast update for {owner}/{slug}: {error}");
                continue;
            }
        };

        if let Some(update) = build_store_update(&package, &installed_version) {
            updates.push(update);
        }
    }

    Ok(json!({
        "updates": updates.iter().map(store_update_to_json).collect::<Vec<_>>(),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_fixture_parses_into_publishable_packages() {
        let catalog = load_catalog_from_str(
            include_str!("../../../store/catalog.json"),
            Some(&CatalogBase::File(PathBuf::from("store"))),
        )
        .expect("catalog fixture should parse");

        assert_eq!(catalog.packages.len(), 2);

        let demo_tools = catalog
            .packages
            .iter()
            .find(|package| package.id == "beam.demo-tools")
            .expect("demo tools package should exist");
        assert_eq!(demo_tools.releases.len(), 2);
        assert_eq!(
            demo_tools
                .latest_release
                .as_ref()
                .map(|release| release.version.as_str()),
            Some("1.1.0")
        );
        assert_eq!(
            demo_tools
                .latest_release
                .as_ref()
                .and_then(|release| release.primary_artifact_id.as_deref()),
            Some("linux-zip")
        );
    }

    #[test]
    fn preferred_release_follows_channel_selection() {
        let catalog = load_catalog_from_str(
            include_str!("../../../store/catalog.json"),
            Some(&CatalogBase::File(PathBuf::from("store"))),
        )
        .expect("catalog fixture should parse");

        let package = catalog
            .packages
            .iter()
            .find(|package| package.id == "beam.window-recipes")
            .expect("window recipes package should exist");

        let stable_release = select_preferred_release(
            &package.releases,
            proto::ExtensionReleaseChannel::Stable as i32,
        )
        .expect("stable release should resolve");
        assert_eq!(stable_release.version, "0.9.0");

        let beta_release = select_preferred_release(
            &package.releases,
            proto::ExtensionReleaseChannel::Beta as i32,
        )
        .expect("beta release should resolve");
        assert_eq!(beta_release.version, "1.0.0-beta.1");
    }
}
