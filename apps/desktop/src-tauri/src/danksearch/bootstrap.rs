#[cfg(target_os = "linux")]
use std::time::Duration;

use tauri::AppHandle;

#[cfg(target_os = "linux")]
use super::{config, runner, types::DSearchVersionInfo};

#[cfg(target_os = "linux")]
const VERSION_TIMEOUT: Duration = Duration::from_secs(2);

#[cfg(target_os = "linux")]
pub fn initialize(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let paths = match config::ensure_config(&app) {
            Ok(paths) => paths,
            Err(error) => {
                runner::throttled_warn(
                    "dsearch-config-init",
                    format!("failed to prepare dsearch config: {error}"),
                );
                return;
            }
        };

        let Some(binary) = runner::resolve_binary() else {
            return;
        };

        let version_args = vec![
            "-c".to_string(),
            paths.config_path.display().to_string(),
            "version".to_string(),
            "--json".to_string(),
        ];
        let version = match runner::run_json_command::<DSearchVersionInfo>(
            &binary,
            &version_args,
            VERSION_TIMEOUT,
        )
        .await
        {
            Ok(version) => version,
            Err(error) => {
                runner::throttled_warn(
                    "dsearch-version-check",
                    format!(
                        "dsearch probe failed, Beam will keep using native file search: {error}"
                    ),
                );
                return;
            }
        };

        log::info!(
            "dsearch available: version={}, build_time={}, commit={}, schema={}",
            version.version,
            version.build_time,
            version.commit,
            version.index_schema
        );

        let action = if config::has_existing_index(&paths.index_path) {
            "sync"
        } else {
            "generate"
        };
        runner::spawn_index_job(binary, paths.config_path, action);
    });
}

#[cfg(not(target_os = "linux"))]
pub fn initialize(_app: AppHandle) {}
