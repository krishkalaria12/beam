use std::collections::HashSet;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};
use walkdir::WalkDir;
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER, STGM_READ};
use windows::Win32::UI::Shell::{IShellLinkW, ShellLink, SLGP_RAWPATH};

use crate::applications::app_entry::{AppEntry, SearchableAppEntry};

const START_MENU_PROGRAMS_SUFFIX: &str = r"Microsoft\Windows\Start Menu\Programs";
const APP_IDENTIFIER: &str = "io.beam.launcher";
const ICON_CACHE_SUBDIR: &str = "icons";

pub fn start_menu_directories() -> Vec<PathBuf> {
    let mut directories = Vec::new();

    if let Ok(common_root) = std::env::var("ProgramData") {
        let common_dir = PathBuf::from(common_root).join(START_MENU_PROGRAMS_SUFFIX);
        if common_dir.is_dir() {
            directories.push(common_dir);
        }
    }

    if let Some(user_root) = dirs::data_dir() {
        let user_dir = user_root.join(START_MENU_PROGRAMS_SUFFIX);
        if user_dir.is_dir() {
            directories.push(user_dir);
        }
    }

    directories
}

fn short_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn icon_cache_path_for(source: &Path) -> Option<PathBuf> {
    let digest = Sha256::digest(source.to_string_lossy().as_bytes());
    let file_name = format!("{}.png", short_hex(&digest[..12]));
    Some(
        dirs::data_dir()?
            .join(APP_IDENTIFIER)
            .join(ICON_CACHE_SUBDIR),
    )
    .map(|dir| dir.join(file_name))
}

fn wide_path(path: &Path) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    path.as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

/// Resolves a `.lnk` shortcut to the executable/document it points at.
/// Returns an empty string when the shortcut cannot be resolved.
fn resolve_lnk_target(path: &Path) -> String {
    use windows::core::Interface;
    use windows::Win32::Storage::FileSystem::WIN32_FIND_DATAW;

    let _com = super::com::ComGuard::init();

    let wide = wide_path(path);
    let shell_link: IShellLinkW =
        match unsafe { CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER) } {
            Ok(link) => link,
            Err(_) => return String::new(),
        };

    let Ok(persist_file) = shell_link.cast::<windows::Win32::System::Com::IPersistFile>() else {
        return String::new();
    };
    if unsafe { persist_file.Load(windows::core::PCWSTR(wide.as_ptr()), STGM_READ) }.is_err() {
        return String::new();
    }

    let mut buffer = [0u16; 1024];
    let mut find_data = WIN32_FIND_DATAW::default();
    if unsafe { shell_link.GetPath(&mut buffer, &mut find_data, SLGP_RAWPATH.0 as u32) }.is_err() {
        return String::new();
    }

    let end = buffer.iter().position(|c| *c == 0).unwrap_or(buffer.len());
    String::from_utf16_lossy(&buffer[..end]).trim().to_string()
}

fn collect_shortcut_files() -> Vec<PathBuf> {
    let mut files = Vec::new();
    // User shortcuts are collected first so identically-named entries win the
    // name-based dedupe over machine-wide ones, matching Start Menu semantics.
    for directory in start_menu_directories().into_iter().rev() {
        for entry in WalkDir::new(directory).into_iter().filter_map(|e| e.ok()) {
            if !entry.file_type().is_file() {
                continue;
            }
            let name = entry.file_name().to_string_lossy();
            if name.ends_with(".lnk") || name.ends_with(".url") {
                files.push(entry.path().to_path_buf());
            }
        }
    }
    files
}

fn display_name_for_shortcut(path: &Path) -> String {
    path.file_stem()
        .map(|stem| stem.to_string_lossy().trim().to_string())
        .filter(|stem| !stem.is_empty())
        .unwrap_or_else(|| path.to_string_lossy().to_string())
}

pub fn collect_searchable_applications(
    _selected_icon_theme: Option<String>,
) -> Vec<SearchableAppEntry> {
    let mut applications = Vec::new();
    let mut seen_names: HashSet<String> = HashSet::new();

    for path in collect_shortcut_files() {
        let name = display_name_for_shortcut(&path);
        let dedupe_key = name.to_lowercase();
        if !seen_names.insert(dedupe_key) {
            continue;
        }

        let is_url = path.extension().and_then(|e| e.to_str()) == Some("url");
        let exec_path = if is_url {
            path.to_string_lossy().to_string()
        } else {
            let resolved = resolve_lnk_target(&path);
            if resolved.is_empty() {
                // Shortcuts to shell folders etc; still launchable via the .lnk itself.
                path.to_string_lossy().to_string()
            } else {
                resolved
            }
        };

        let icon = icon_for_executable(&exec_path);

        applications.push(SearchableAppEntry {
            app: AppEntry {
                app_id: format!("win.{}", name.replace(' ', "-").to_lowercase()),
                name,
                description: "launch application".to_string(),
                exec_path,
                icon,
                desktop_file_path: path.to_string_lossy().to_string(),
            },
            generic_name: String::new(),
            keywords: Vec::new(),
            comment: String::new(),
        });
    }

    applications
}

/// Returns a cached PNG path for the icon associated with `source`
/// (an executable path or a `.lnk` shortcut). Empty string when unavailable.
pub fn icon_for_executable(source: &str) -> String {
    if source.trim().is_empty() {
        return String::new();
    }

    let source_path = Path::new(source);
    if source.starts_with("http://") || source.starts_with("https://") {
        return String::new();
    }
    if !source_path.exists() && source_path.extension().and_then(|e| e.to_str()) != Some("lnk") {
        return String::new();
    }

    let Some(cache_path) = icon_cache_path_for(source_path) else {
        return String::new();
    };
    if cache_path.is_file() {
        return cache_path.to_string_lossy().to_string();
    }

    let png_bytes = extract_icon_png(source_path);
    let Some(png_bytes) = png_bytes else {
        return String::new();
    };

    let Some(parent) = cache_path.parent() else {
        return String::new();
    };
    if std::fs::create_dir_all(parent).is_err() {
        return String::new();
    }
    if std::fs::write(&cache_path, png_bytes).is_err() {
        return String::new();
    }

    cache_path.to_string_lossy().to_string()
}

fn extract_icon_png(path: &Path) -> Option<Vec<u8>> {
    use windows::Win32::Graphics::Gdi::DeleteObject;
    use windows::Win32::Storage::FileSystem::FILE_ATTRIBUTE_NORMAL;
    use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, ICONINFO};

    let wide = wide_path(path);
    let mut shfi = SHFILEINFOW::default();
    let ok = unsafe {
        SHGetFileInfoW(
            windows::core::PCWSTR(wide.as_ptr()),
            FILE_ATTRIBUTE_NORMAL,
            Some(&mut shfi),
            u32::try_from(std::mem::size_of::<SHFILEINFOW>()).ok()?,
            SHGFI_ICON | SHGFI_LARGEICON,
        )
    };
    if ok == 0 || shfi.hIcon.is_invalid() {
        return None;
    }

    let result = unsafe {
        let mut info = ICONINFO::default();
        if GetIconInfo(shfi.hIcon, &mut info).is_err() {
            None
        } else {
            let outcome = extract_bitmap_rgba(info.hbmColor);
            let _ = DeleteObject(info.hbmColor.into());
            let _ = DeleteObject(info.hbmMask.into());
            outcome
        }
    };

    let _ = unsafe { DestroyIcon(shfi.hIcon) };

    let (pixels, width, height) = result?;
    write_icon_png(pixels, width, height)
}

fn extract_bitmap_rgba(
    bitmap: windows::Win32::Graphics::Gdi::HBITMAP,
) -> Option<(Vec<u8>, u32, u32)> {
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, GetDIBits, GetObjectW, BITMAP, BITMAPINFO, BITMAPINFOHEADER,
        DIB_RGB_COLORS,
    };

    if bitmap.is_invalid() {
        return None;
    }

    let mut bitmap_header = BITMAP::default();
    if unsafe {
        GetObjectW(
            bitmap.into(),
            std::mem::size_of::<BITMAP>() as i32,
            Some(&mut bitmap_header as *mut _ as *mut _),
        )
    } == 0
    {
        return None;
    }

    let width = bitmap_header.bmWidth.max(0) as u32;
    let height = bitmap_header.bmHeight.unsigned_abs();
    if width == 0 || height == 0 {
        return None;
    }

    let hdc = unsafe { CreateCompatibleDC(None) };
    if hdc.is_invalid() {
        return None;
    }

    let mut bmi = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: width as i32,
            biHeight: -(height as i32),
            biPlanes: 1,
            biBitCount: 32,
            biCompression: 0,
            biSizeImage: 0,
            ..Default::default()
        },
        ..Default::default()
    };

    let mut pixels = vec![0u8; (width as usize) * (height as usize) * 4];
    let lines = unsafe {
        GetDIBits(
            hdc,
            bitmap,
            0,
            height,
            Some(pixels.as_mut_ptr().cast()),
            &mut bmi,
            DIB_RGB_COLORS,
        )
    };
    let _ = unsafe { DeleteDC(hdc) };

    if lines == 0 {
        return None;
    }

    for chunk in pixels.chunks_exact_mut(4) {
        chunk.swap(0, 2); // BGRA -> RGBA
    }

    Some((pixels, width, height))
}

fn write_icon_png(pixels: Vec<u8>, width: u32, height: u32) -> Option<Vec<u8>> {
    let image = image::RgbaImage::from_raw(width, height, pixels)?;
    let mut cursor = std::io::Cursor::new(Vec::new());
    image.write_to(&mut cursor, image::ImageFormat::Png).ok()?;
    Some(cursor.into_inner())
}

/// Moves a path to the Recycle Bin. Returns an error message on failure.
pub fn trash_path(path: &str) -> Result<(), String> {
    use windows::Win32::UI::Shell::{
        SHFileOperationW, FOF_ALLOWUNDO, FOF_NOCONFIRMATION, FOF_SILENT, FO_DELETE, SHFILEOPSTRUCTW,
    };

    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Ok(());
    }

    // pFrom must be a double-null-terminated wide string.
    let mut wide = wide_path(Path::new(trimmed));
    wide.push(0);

    let mut operation = SHFILEOPSTRUCTW {
        hwnd: Default::default(),
        wFunc: FO_DELETE,
        pFrom: windows::core::PCWSTR(wide.as_ptr()),
        fFlags: (FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_SILENT).0 as u16,
        ..Default::default()
    };

    let code = unsafe { SHFileOperationW(&mut operation) };
    if code != 0 || operation.fAnyOperationsAborted.as_bool() {
        return Err(format!("failed to recycle '{trimmed}' (code {code})"));
    }

    Ok(())
}

/// Reveals `path` in Windows Explorer, selecting it when it exists.
pub fn reveal_in_explorer(path: &str) -> Result<(), String> {
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let trimmed = path.trim().trim_matches('"');
    let target = Path::new(trimmed);
    let argument = if target.is_dir() {
        format!("\"{}\"", trimmed.trim_end_matches(['/', '\\']))
    } else {
        format!("/select,\"{trimmed}\"")
    };

    use std::os::windows::process::CommandExt;
    std::process::Command::new("explorer.exe")
        .arg(argument)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|error| format!("failed to open explorer for '{trimmed}': {error}"))?;

    Ok(())
}

/// Best-effort resolution of the default handler application for `path`'s
/// extension, mirroring the Linux freedesktop implementation's output shape.
pub fn get_default_application(
    path: &str,
) -> Result<crate::applications::raycast_compat::RaycastCompatApplication, String> {
    use winreg::enums::{HKEY_CLASSES_ROOT, HKEY_CURRENT_USER};
    use winreg::RegKey;

    let extension = Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();

    if extension.is_empty() {
        return Err("path has no extension".to_string());
    }

    let hkcr = RegKey::predef(HKEY_CLASSES_ROOT);

    let user_choice_key = format!(
        r"Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.{extension}\UserChoice"
    );
    let prog_id: Option<String> = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(user_choice_key)
        .and_then(|key| key.get_value::<String, _>("Progid"))
        .or_else(|_| {
            hkcr.open_subkey(format!(".{extension}"))
                .and_then(|key| key.get_value::<String, _>(""))
        })
        .ok();

    let Some(prog_id) = prog_id else {
        return Err(format!("no default application found for '.{extension}'"));
    };

    let command: String = hkcr
        .open_subkey(format!(r"{prog_id}\shell\open\command"))
        .and_then(|key| key.get_value::<String, _>(""))
        .unwrap_or_default();

    let resolved = extract_command_executable(&command);
    let raw_friendly_name: String = hkcr
        .open_subkey(&prog_id)
        .and_then(|key| {
            key.get_value::<String, _>("FriendlyTypeName")
                .or_else(|_| key.get_value::<String, _>(""))
        })
        .unwrap_or_else(|_| prog_id.clone());
    let friendly_name = load_indirect_string(&raw_friendly_name).unwrap_or(raw_friendly_name);

    Ok(
        crate::applications::raycast_compat::RaycastCompatApplication {
            name: friendly_name.clone(),
            path: resolved.clone(),
            bundle_id: prog_id.clone(),
            localized_name: friendly_name,
            windows_app_id: prog_id,
        },
    )
}

fn extract_command_executable(command: &str) -> String {
    let trimmed = command.trim();
    if trimmed.starts_with('"') {
        if let Some(end) = trimmed[1..].find('"') {
            return trimmed[1..1 + end].to_string();
        }
    }

    trimmed
        .split_whitespace()
        .next()
        .unwrap_or_default()
        .to_string()
}

/// Resolves shell indirect strings such as
/// `@%SystemRoot%\system32\shell32.dll,-21769` to their display text via
/// `SHLoadIndirectString`. Returns `None` for plain registry strings.
fn load_indirect_string(value: &str) -> Option<String> {
    use windows::core::PCWSTR;
    use windows::Win32::UI::Shell::SHLoadIndirectString;

    let trimmed = value.trim();
    if !trimmed.starts_with('@') {
        return None;
    }

    let wide: Vec<u16> = trimmed.encode_utf16().chain(std::iter::once(0)).collect();
    let mut buffer = [0u16; 1024];
    unsafe { SHLoadIndirectString(PCWSTR(wide.as_ptr()), &mut buffer, None) }.ok()?;

    let end = buffer.iter().position(|c| *c == 0).unwrap_or(buffer.len());
    let resolved = String::from_utf16_lossy(&buffer[..end]);
    (!resolved.is_empty()).then_some(resolved)
}
