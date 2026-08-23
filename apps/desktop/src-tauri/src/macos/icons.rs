//! NSImage rasterization helpers for application icons.

use std::path::{Path, PathBuf};

use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep};

const ICON_PNG_SIZE: f64 = 128.0;

/// Encodes an NSImage as PNG bytes by rendering it into a bitmap rep.
///
/// The image is asked to rasterize at `ICON_PNG_SIZE`; AppKit picks the best
/// matching representation from multi-resolution sources such as .icns files.
pub fn nsimage_to_png_bytes(image: &objc2_app_kit::NSImage) -> Option<Vec<u8>> {
    unsafe {
        image.setSize(objc2_foundation::NSSize::new(ICON_PNG_SIZE, ICON_PNG_SIZE));

        let tiff = image.TIFFRepresentation()?;
        let rep = NSBitmapImageRep::imageRepWithData(&tiff)?;
        let png = rep.representationUsingType_properties(
            NSBitmapImageFileType::PNG,
            &objc2_foundation::NSDictionary::new(),
        )?;
        Some(png.to_vec())
    }
}

fn hash_identifier(input: &str) -> u64 {
    // FNV-1a: stable cache keys for paths/bundle ids without a hasher dep.
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in input.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x0100_0000_01b3);
    }
    hash
}

pub fn icon_cache_dir(app_cache_root: &Path) -> PathBuf {
    app_cache_root.join("app-icons")
}

/// Returns the cached PNG path for `key` when it exists.
pub fn cached_icon_path(app_cache_root: &Path, key: &str) -> Option<String> {
    let path = icon_cache_dir(app_cache_root).join(format!("{}.png", hash_identifier(key)));
    path.exists().then(|| path.to_string_lossy().into_owned())
}

/// Writes PNG bytes to the Beam icon cache and returns the stored path.
pub fn store_icon_png(app_cache_root: &Path, key: &str, bytes: &[u8]) -> Option<String> {
    let dir = icon_cache_dir(app_cache_root);
    std::fs::create_dir_all(&dir).ok()?;
    let file_path = dir.join(format!("{}.png", hash_identifier(key)));
    if std::fs::write(&file_path, bytes).is_err() {
        return None;
    }
    Some(file_path.to_string_lossy().into_owned())
}

/// Resolves a cached icon path for an application identified by bundle id,
/// falling back to the app name and finally the bundle path itself.
pub fn icon_path_for_app(bundle_id: &str, app_name: &str, bundle_path: &Path) -> String {
    let Some(app_cache_root) = dirs::cache_dir() else {
        return String::new();
    };

    if !bundle_id.trim().is_empty() {
        let cached =
            icon_cache_dir(&app_cache_root).join(format!("{}.png", hash_identifier(bundle_id)));
        if cached.exists() {
            return cached.to_string_lossy().into_owned();
        }
    }

    if let Some(bytes) = super::workspace::icon_png_bytes_for_path(bundle_path) {
        let key: String = if bundle_id.trim().is_empty() {
            app_name.to_string()
        } else {
            bundle_id.to_string()
        };
        if let Some(stored) = store_icon_png(&app_cache_root, &key, &bytes) {
            return stored;
        }
    }

    String::new()
}
