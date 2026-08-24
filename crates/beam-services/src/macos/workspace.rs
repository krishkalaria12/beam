// PORT: apps/desktop/src-tauri/src/macos/workspace.rs
// Copied verbatim; no Tauri APIs in this file.
//! NSWorkspace / NSRunningApplication helpers.
//!
//! AppKit calls are grouped here so every entry point can wrap itself in an
//! autorelease pool and document its threading contract. NSWorkspace queries
//! must run on the main thread; the AX walk in `window_manager` deliberately
//! happens on worker threads using only thread-safe AX APIs.

use std::path::{Path, PathBuf};

use dispatch2::DispatchQueue;
use objc2_app_kit::{NSRunningApplication, NSWorkspace};
use objc2_foundation::{NSString, NSThread, NSURL};

/// Runs `work` on the main thread and blocks until it completes.
///
/// AppKit's NSWorkspace APIs are main-thread-only; background callers (focus
/// enforcement loop, async commands, the clipboard listener) go through this.
/// Already running on the main thread? Execute inline to avoid deadlocking
/// the queue against ourselves.
pub fn on_main_thread<T>(work: impl Send + FnOnce() -> T) -> T
where
    T: Send,
{
    if NSThread::isMainThread_class() {
        return work();
    }

    let slot = parking_lot::Mutex::new(None);
    DispatchQueue::main().exec_sync(|| {
        *slot.lock() = Some(work());
    });
    slot.into_inner().expect("main thread slot empty")
}

pub struct RunningAppInfo {
    pub pid: i32,
    pub bundle_id: String,
    pub name: String,
    pub bundle_path: String,
}

fn running_application(app: &NSRunningApplication) -> Option<RunningAppInfo> {
    if app.activationPolicy() != objc2_app_kit::NSApplicationActivationPolicy::Regular {
        return None;
    }

    let pid = app.processIdentifier();
    if pid <= 0 || pid == std::process::id() as i32 {
        return None;
    }

    let bundle_id = app
        .bundleIdentifier()
        .map(|value| value.to_string())
        .unwrap_or_default();
    let name = app
        .localizedName()
        .map(|value| value.to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| bundle_id.clone());
    let bundle_path = app
        .bundleURL()
        .and_then(|url| url.path())
        .map(|path| path.to_string())
        .unwrap_or_default();

    Some(RunningAppInfo {
        pid,
        bundle_id,
        name,
        bundle_path,
    })
}

/// Lists regular user-facing applications. Must be called from the main thread.
pub fn running_regular_apps() -> Vec<RunningAppInfo> {
    let workspace = NSWorkspace::sharedWorkspace();
    workspace
        .runningApplications()
        .iter()
        .filter_map(|app| running_application(&app))
        .collect()
}

pub struct FrontmostAppInfo {
    pub pid: i32,
    pub bundle_id: String,
    pub name: String,
    pub bundle_path: String,
}

/// Returns the frontmost regular application, excluding Beam itself.
pub fn frontmost_regular_app() -> Option<FrontmostAppInfo> {
    let frontmost = NSWorkspace::sharedWorkspace().frontmostApplication()?;
    if frontmost.processIdentifier() == std::process::id() as i32 {
        return None;
    }

    let bundle_id = frontmost
        .bundleIdentifier()
        .map(|value| value.to_string())
        .unwrap_or_default();
    let name = frontmost
        .localizedName()
        .map(|value| value.to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| bundle_id.clone());
    let bundle_path = frontmost
        .bundleURL()
        .and_then(|url| url.path())
        .map(|path| path.to_string())
        .unwrap_or_default();

    Some(FrontmostAppInfo {
        pid: frontmost.processIdentifier(),
        bundle_id,
        name,
        bundle_path,
    })
}

/// Activates (focuses) an application by pid.
pub fn activate_application(pid: i32) -> bool {
    let Some(app) = NSRunningApplication::runningApplicationWithProcessIdentifier(pid) else {
        return false;
    };
    app.activateWithOptions(objc2_app_kit::NSApplicationActivationOptions::ActivateAllWindows)
}

/// Resolves the AppKit icon for a file path and encodes it as PNG bytes.
pub fn icon_png_bytes_for_path(path: &Path) -> Option<Vec<u8>> {
    let icon =
        NSWorkspace::sharedWorkspace().iconForFile(&NSString::from_str(&path.to_string_lossy()));
    crate::macos::icons::nsimage_to_png_bytes(&icon)
}

/// Resolves the AppKit icon for an application bundle identifier.
pub fn icon_png_bytes_for_bundle_id(bundle_id: &str) -> Option<Vec<u8>> {
    let path = bundle_path_for_bundle_id(bundle_id)?;
    icon_png_bytes_for_path(&PathBuf::from(path))
}

/// Launches an application bundle and returns whether it succeeded.
pub fn launch_bundle(path: &Path) -> Result<(), String> {
    let url = NSURL::fileURLWithPath(&NSString::from_str(&path.to_string_lossy()));
    // Remaining body runs on the main thread via the closure below.
    // The modern openApplicationAtURL:configuration:completionHandler: API
    // requires callback plumbing; the deprecated synchronous variant is kept
    // deliberately and isolated to this scoped unsafe block.
    #[allow(deprecated)]
    let launched = on_main_thread(move || unsafe {
        NSWorkspace::sharedWorkspace().launchApplicationAtURL_options_configuration_error(
            &url,
            objc2_app_kit::NSWorkspaceLaunchOptions::Default,
            &objc2_foundation::NSDictionary::new(),
        )
    });
    match launched {
        Ok(_) => Ok(()),
        Err(error) => Err(format!("failed to launch {}: {error}", path.display())),
    }
}

/// Resolves the install path of an application bundle by identifier.
pub fn bundle_path_for_bundle_id(bundle_id: &str) -> Option<String> {
    on_main_thread(move || {
        let workspace = NSWorkspace::sharedWorkspace();
        let url =
            workspace.URLForApplicationWithBundleIdentifier(&NSString::from_str(bundle_id))?;
        url.path().map(|path| path.to_string())
    })
}

pub fn reveal_in_finder(paths: &[PathBuf]) {
    let urls: Vec<_> = paths
        .iter()
        .map(|path| NSURL::fileURLWithPath(&NSString::from_str(&path.to_string_lossy())))
        .collect();
    let array = objc2_foundation::NSArray::from_retained_slice(&urls);
    NSWorkspace::sharedWorkspace().activateFileViewerSelectingURLs(&array);
}

/// Moves paths to the Trash via NSFileManager.
pub fn trash_paths(paths: &[PathBuf]) -> Result<(), String> {
    let manager = objc2_foundation::NSFileManager::defaultManager();
    for path in paths {
        let url = NSURL::fileURLWithPath(&NSString::from_str(&path.to_string_lossy()));
        manager
            .trashItemAtURL_resultingItemURL_error(&url, None)
            .map_err(|error| format!("failed to trash {}: {error}", path.display()))?;
    }

    Ok(())
}

pub fn open_url(url: &str) {
    on_main_thread(move || {
        let Some(ns_url) = NSURL::URLWithString(&NSString::from_str(url)) else {
            return;
        };
        NSWorkspace::sharedWorkspace().openURL(&ns_url);
    });
}
