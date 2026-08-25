// PORT: apps/desktop/src-tauri/src/macos/launch_services.rs
// Copied verbatim; no Tauri APIs in this file.
//! LaunchServices FFI for default-application resolution.

use std::os::raw::c_void;

use core_foundation_sys::url::CFURLRef;
use objc2_foundation::{NSString, NSURL};

pub struct DefaultApplicationInfo {
    pub name: String,
    pub bundle_path: String,
    pub bundle_id: String,
}

// LSRolesMask is a UInt32 bitmask; kLSRolesAll covers viewer/editor/shell.
#[allow(non_upper_case_globals)]
const kLSRolesAll: u32 = 0xFFFF_FFFF;

#[link(name = "CoreServices", kind = "framework")]
extern "C" {
    fn LSCopyDefaultApplicationURLForURL(
        url: CFURLRef,
        role: u32,
        error: *mut *mut c_void,
    ) -> CFURLRef;
}

fn target_url(target: &str) -> Option<RetainedUrl> {
    if target.contains("://") {
        return NSURL::URLWithString(&NSString::from_str(target)).map(RetainedUrl);
    }

    let expanded = super::applications::expand_tilde(target);
    Some(RetainedUrl(NSURL::fileURLWithPath(&NSString::from_str(
        &expanded.to_string_lossy(),
    ))))
}

struct RetainedUrl(objc2::rc::Retained<NSURL>);

fn read_bundle_summary(bundle_path: &str) -> Option<DefaultApplicationInfo> {
    {
        let bundle = objc2_foundation::NSBundle::bundleWithPath(&NSString::from_str(bundle_path))?;
        let info = bundle.infoDictionary()?;
        let value = |key: &str| -> Option<String> {
            info.objectForKey(&NSString::from_str(key)).and_then(|v| {
                let string: &NSString = v.downcast_ref()?;
                Some(string.to_string())
            })
        };

        let name = value("CFBundleDisplayName")
            .or_else(|| value("CFBundleName"))
            .unwrap_or_default();
        Some(DefaultApplicationInfo {
            name,
            bundle_path: bundle_path.to_string(),
            bundle_id: value("CFBundleIdentifier").unwrap_or_default(),
        })
    }
}

/// Resolves the application that LaunchServices would use to open `target`.
///
/// Accepts either a file system path or a URL string.
pub fn default_application_for_target(target: &str) -> Option<DefaultApplicationInfo> {
    let trimmed = target.trim();
    if trimmed.is_empty() {
        return None;
    }

    let url = target_url(trimmed)?;
    unsafe {
        let app_url_raw = LSCopyDefaultApplicationURLForURL(
            objc2::rc::Retained::as_ptr(&url.0) as CFURLRef,
            kLSRolesAll,
            std::ptr::null_mut(),
        );
        if app_url_raw.is_null() {
            return None;
        }

        // from_raw consumes the +1 reference returned by the Copy function.
        let app_url: objc2::rc::Retained<NSURL> =
            objc2::rc::Retained::from_raw(app_url_raw as *mut NSURL)?;
        let path = app_url
            .path()
            .map(|path| path.to_string())
            .or_else(|| app_url.absoluteString().map(|string| string.to_string()))
            .unwrap_or_default();
        drop(app_url);

        read_bundle_summary(&path)
    }
}
