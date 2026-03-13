use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

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
struct RawCommandManifest {
    name: String,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    mode: Option<String>,
    interval: Option<String>,
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
struct RawStoreRelease {
    version: Option<String>,
    download_url: Option<String>,
    published_at: Option<String>,
    checksum_sha256: Option<String>,
    changelog_url: Option<String>,
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
    latest_release: RawStoreRelease,
    readme_url: Option<String>,
    source_url: Option<String>,
    #[serde(default)]
    screenshots: Vec<String>,
    manifest: Option<RawPackageManifest>,
    download_count: Option<i64>,
}

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct RawStoreCatalog {
    source: Option<RawStoreSource>,
    #[serde(default)]
    packages: Vec<RawStorePackage>,
}

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
        RawAuthor::Simple(value) => normalize_optional_string(Some(value)).map(|value| {
            proto::ManifestAuthor {
                author: Some(proto::manifest_author::Author::Simple(value)),
            }
        }),
        RawAuthor::Detailed { name } => normalize_optional_string(Some(name)).map(|name| {
            proto::ManifestAuthor {
                author: Some(proto::manifest_author::Author::Detailed(proto::AuthorName { name })),
            }
        }),
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

fn raw_command_manifest_to_proto(command: RawCommandManifest) -> proto::CommandManifest {
    proto::CommandManifest {
        name: command.name.trim().to_string(),
        title: normalize_optional_string(command.title),
        description: normalize_optional_string(command.description),
        icon: normalize_optional_string(command.icon),
        mode: normalize_optional_string(command.mode),
        interval: normalize_optional_string(command.interval),
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

fn raw_store_package_to_proto(
    package: RawStorePackage,
    catalog_source: &proto::ExtensionStoreSource,
) -> Option<proto::ExtensionStorePackage> {
    let id = normalize_optional_string(package.id)?;
    let slug = normalize_optional_string(package.slug)?;
    let title = normalize_optional_string(package.title)?;
    let author = package.author?;
    let author_handle = normalize_optional_string(author.handle)?;
    let version = normalize_optional_string(package.latest_release.version.clone())?;
    let download_url = normalize_optional_string(package.latest_release.download_url.clone())?;

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
            light: package.icons.as_ref().and_then(|icons| normalize_optional_string(icons.light.clone())),
            dark: package.icons.and_then(|icons| normalize_optional_string(icons.dark)),
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
        compatibility: Some(match package.compatibility {
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
        latest_release: Some(proto::ExtensionStoreRelease {
            version,
            download_url,
            published_at: normalize_optional_string(package.latest_release.published_at),
            checksum_sha256: normalize_optional_string(package.latest_release.checksum_sha256),
            changelog_url: normalize_optional_string(package.latest_release.changelog_url),
        }),
        readme_url: normalize_optional_string(package.readme_url),
        source_url: normalize_optional_string(package.source_url),
        screenshots: normalize_string_list(package.screenshots),
        manifest: package.manifest.map(raw_manifest_to_proto),
        download_count: package.download_count,
    })
}

fn load_catalog_from_str(content: &str) -> Result<proto::ExtensionStoreCatalog> {
    let raw_catalog: RawStoreCatalog = serde_json::from_str(content)?;
    let source = raw_store_source_to_proto(raw_catalog.source);

    Ok(proto::ExtensionStoreCatalog {
        source: Some(source.clone()),
        packages: raw_catalog
            .packages
            .into_iter()
            .filter_map(|package| raw_store_package_to_proto(package, &source))
            .collect(),
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

            return load_catalog_from_str(&response.text().await?);
        }
    }

    for candidate in resolve_catalog_file_candidates(app) {
        if !candidate.is_file() {
            continue;
        }

        let content = fs::read_to_string(candidate)?;
        return load_catalog_from_str(&content);
    }

    load_catalog_from_str(EXTENSIONS_CONFIG.store_catalog.default_catalog_json)
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

fn store_release_to_json(release: &proto::ExtensionStoreRelease) -> JsonValue {
    json!({
        "version": release.version,
        "downloadUrl": release.download_url,
        "publishedAt": release.published_at,
        "checksumSha256": release.checksum_sha256,
        "changelogUrl": release.changelog_url,
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

fn command_manifest_to_json(command: &proto::CommandManifest) -> JsonValue {
    json!({
        "name": command.name,
        "title": command.title,
        "description": command.description,
        "icon": command.icon,
        "mode": command.mode,
        "interval": command.interval,
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
        package.description.clone().unwrap_or_default().to_lowercase(),
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
    let packages = catalog
        .packages
        .iter()
        .filter(|package| search_matches(package, normalized_query))
        .take(max_results)
        .map(store_package_to_json)
        .collect::<Vec<_>>();

    Ok(json!({ "packages": packages }))
}

#[tauri::command]
pub async fn get_extension_store_package(
    app: AppHandle,
    package_id: String,
) -> Result<Option<JsonValue>> {
    let catalog = load_catalog(&app).await?;
    let normalized = package_id.trim();
    if normalized.is_empty() {
        return Ok(None);
    }

    Ok(catalog
        .packages
        .iter()
        .find(|package| package.id == normalized)
        .map(store_package_to_json))
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

    let mut installed_by_owner_and_slug = HashMap::<String, (&proto::DiscoveredPlugin, String)>::new();
    for plugin in &discovered {
        let Some(owner) = plugin.owner.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty()) else {
            continue;
        };
        let Some(version) = plugin.version.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty()) else {
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
    for (key, (_plugin, installed_version)) in installed_by_owner_and_slug {
        let Some(package) = catalog_by_owner_and_slug.get(&key) else {
            continue;
        };
        let Some(latest_release) = package.latest_release.as_ref() else {
            continue;
        };

        let Some(installed_version_semver) = parse_version(&installed_version) else {
            continue;
        };
        let Some(latest_version_semver) = parse_version(&latest_release.version) else {
            continue;
        };

        if latest_version_semver <= installed_version_semver {
            continue;
        }

        updates.push(proto::ExtensionStoreUpdate {
            id: package.id.clone(),
            slug: package.slug.clone(),
            title: package.title.clone(),
            installed_version,
            latest_version: latest_release.version.clone(),
            latest_release: Some(latest_release.clone()),
            verification: package.verification.clone(),
            compatibility: package.compatibility.clone(),
        });
    }

    Ok(json!({
        "updates": updates.iter().map(store_update_to_json).collect::<Vec<_>>(),
    }))
}
