use std::collections::HashMap;
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use once_cell::sync::Lazy;
use serde::de::DeserializeOwned;
use tokio::process::Command;

const BINARY_CACHE_TTL: Duration = Duration::from_secs(30);
const WARN_THROTTLE_WINDOW: Duration = Duration::from_secs(30);

static BINARY_CACHE: Lazy<Mutex<Option<(Instant, Option<PathBuf>)>>> =
    Lazy::new(|| Mutex::new(None));
static THROTTLED_WARNINGS: Lazy<Mutex<HashMap<&'static str, Instant>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static INDEX_JOB_RUNNING: AtomicBool = AtomicBool::new(false);

pub async fn run_json_command<T: DeserializeOwned>(
    binary: &Path,
    args: &[String],
    timeout: Duration,
) -> Result<T, String> {
    let output = run_command(binary, args, timeout).await?;
    serde_json::from_slice(&output.stdout).map_err(|error| error.to_string())
}

pub async fn run_command(
    binary: &Path,
    args: &[String],
    timeout: Duration,
) -> Result<std::process::Output, String> {
    let mut command = Command::new(binary);
    command.kill_on_drop(true).args(args);

    let output = tokio::time::timeout(timeout, command.output())
        .await
        .map_err(|_| format!("command timed out after {}ms", timeout.as_millis()))?
        .map_err(|error| error.to_string())?;

    if output.status.success() {
        return Ok(output);
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let message = if !stderr.is_empty() {
        stderr
    } else if !stdout.is_empty() {
        stdout
    } else {
        format!("process exited with status {}", output.status)
    };

    Err(message)
}

pub fn resolve_binary() -> Option<PathBuf> {
    if let Some(cached) = cached_binary() {
        return cached;
    }

    let resolved = resolve_binary_uncached();
    if let Ok(mut cache) = BINARY_CACHE.lock() {
        *cache = Some((Instant::now(), resolved.clone()));
    }
    resolved
}

pub fn spawn_index_job(binary: PathBuf, config_path: PathBuf, action: &'static str) {
    if INDEX_JOB_RUNNING
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    tauri::async_runtime::spawn(async move {
        let args = vec![
            "-c".to_string(),
            config_path.display().to_string(),
            "index".to_string(),
            action.to_string(),
        ];
        let result = run_command(&binary, &args, Duration::from_secs(20 * 60)).await;
        if let Err(error) = result {
            throttled_warn(
                "dsearch-index-job",
                format!("dsearch index {action} failed: {error}"),
            );
        }
        INDEX_JOB_RUNNING.store(false, Ordering::Release);
    });
}

pub fn throttled_warn(key: &'static str, message: impl Into<String>) {
    let now = Instant::now();
    let should_log = match THROTTLED_WARNINGS.lock() {
        Ok(mut warnings) => match warnings.get(key) {
            Some(previous) if now.duration_since(*previous) < WARN_THROTTLE_WINDOW => false,
            _ => {
                warnings.insert(key, now);
                true
            }
        },
        Err(_) => true,
    };

    if should_log {
        log::warn!("{}", message.into());
    }
}

fn cached_binary() -> Option<Option<PathBuf>> {
    let Ok(cache) = BINARY_CACHE.lock() else {
        return None;
    };
    let Some((checked_at, cached_path)) = cache.as_ref() else {
        return None;
    };
    if checked_at.elapsed() > BINARY_CACHE_TTL {
        return None;
    }

    Some(cached_path.clone())
}

fn resolve_binary_uncached() -> Option<PathBuf> {
    find_on_path("dsearch").or_else(|| {
        [
            dirs::home_dir().map(|home| home.join(".local/bin/dsearch")),
            Some(PathBuf::from("/usr/local/bin/dsearch")),
            Some(PathBuf::from("/usr/bin/dsearch")),
        ]
        .into_iter()
        .flatten()
        .find(|candidate| is_executable(candidate))
    })
}

fn find_on_path(binary_name: &str) -> Option<PathBuf> {
    let path = std::env::var_os("PATH")?;
    std::env::split_paths(&path)
        .map(|directory| directory.join(binary_name))
        .find(|candidate| is_executable(candidate))
}

fn is_executable(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }

    #[cfg(target_family = "unix")]
    {
        use std::os::unix::fs::PermissionsExt;

        let Ok(metadata) = path.metadata() else {
            return false;
        };
        return metadata.permissions().mode() & 0o111 != 0;
    }

    #[allow(unreachable_code)]
    path.extension().and_then(OsStr::to_str).is_some()
}
