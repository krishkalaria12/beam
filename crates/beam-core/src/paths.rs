//! On-disk locations, resolved exactly where the Tauri build resolved them.
//!
//! This is the highest-risk substitution in the whole port (plan risk #1):
//! if any of these paths diverges from what `app.path().app_data_dir()` and
//! `app.path().app_local_data_dir()` produced for the identifier
//! `io.beam.launcher`, every upgrading user on that platform loses their
//! clipboard history, notes, todos, snippets and API keys.
//!
//! The rules below mirror Tauri v2 (the `dirs` crate semantics) and are
//! asserted per platform by tests that run on every CI runner: all three
//! rule-sets are exercised everywhere, plus one smoke test against the real
//! host environment.

use std::ffi::OsString;
use std::path::PathBuf;

use crate::error::{BeamError, Result};

/// The application identifier both builds resolve directories for.
pub const APP_IDENTIFIER: &str = "io.beam.launcher";

/// Keyring service name shared by every platform backend. Must never change:
/// existing keyring entries are keyed by service + user.
pub const KEYRING_SERVICE_NAME: &str = "beam";

/// The platforms beam ships on. Path resolution is a pure function of this
/// plus the environment, which is what makes the rules testable anywhere.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HostPlatform {
    Linux,
    Windows,
    Macos,
}

/// The platform this binary was compiled for.
pub const fn current_platform() -> HostPlatform {
    if cfg!(target_os = "linux") {
        HostPlatform::Linux
    } else if cfg!(target_os = "windows") {
        HostPlatform::Windows
    } else {
        HostPlatform::Macos
    }
}

impl HostPlatform {
    pub const fn as_str(self) -> &'static str {
        match self {
            HostPlatform::Linux => "linux",
            HostPlatform::Windows => "windows",
            HostPlatform::Macos => "macos",
        }
    }
}

/// Resolved beam directories.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BeamPaths {
    /// What Tauri called `app_data_dir`. JSON stores live here.
    data_dir: PathBuf,
    /// What Tauri called `app_local_data_dir`. SQLite databases live here.
    local_data_dir: PathBuf,
}

impl BeamPaths {
    /// Resolves the directories from the process environment for the
    /// compiled-for platform.
    pub fn resolve() -> Result<Self> {
        Self::resolve_for(current_platform())
    }

    /// Same as [`Self::resolve`] but for an explicit platform (used by tests
    /// and by tooling that needs another platform's layout).
    pub fn resolve_for(platform: HostPlatform) -> Result<Self> {
        Self::from_platform(
            platform,
            std::env::var_os("HOME"),
            std::env::var_os("XDG_DATA_HOME"),
            std::env::var_os("APPDATA"),
            std::env::var_os("LOCALAPPDATA"),
        )
        .map_err(|message| BeamError::DataDir(message))
    }

    /// Platform-parameterised resolution over an injected environment.
    ///
    /// | platform | data dir                               | local data dir   |
    /// |----------|----------------------------------------|------------------|
    /// | Linux    | `$XDG_DATA_HOME` or `$HOME/.local/share` | same as data dir |
    /// | Windows  | `%APPDATA%`                            | `%LOCALAPPDATA%` |
    /// | macOS    | `$HOME/Library/Application Support`    | same as data dir |
    ///
    /// The identifier is appended to both.
    pub fn from_platform(
        platform: HostPlatform,
        home: Option<OsString>,
        xdg_data_home: Option<OsString>,
        appdata: Option<OsString>,
        local_appdata: Option<OsString>,
    ) -> std::result::Result<Self, String> {
        let non_empty = |value: Option<OsString>| value.filter(|value| !value.is_empty());

        match platform {
            HostPlatform::Linux => {
                let base = match non_empty(xdg_data_home) {
                    Some(dir) => PathBuf::from(dir),
                    None => {
                        let home = home.ok_or_else(|| "HOME is not set".to_string())?;
                        PathBuf::from(home).join(".local").join("share")
                    }
                };
                let base = base.join(APP_IDENTIFIER);
                Ok(Self {
                    data_dir: base.clone(),
                    local_data_dir: base,
                })
            }
            HostPlatform::Windows => {
                let appdata =
                    non_empty(appdata).ok_or_else(|| "APPDATA is not set".to_string())?;
                let local_appdata = non_empty(local_appdata)
                    .ok_or_else(|| "LOCALAPPDATA is not set".to_string())?;
                Ok(Self {
                    data_dir: PathBuf::from(appdata).join(APP_IDENTIFIER),
                    local_data_dir: PathBuf::from(local_appdata).join(APP_IDENTIFIER),
                })
            }
            HostPlatform::Macos => {
                let home = home.ok_or_else(|| "HOME is not set".to_string())?;
                let base = PathBuf::from(home)
                    .join("Library")
                    .join("Application Support")
                    .join(APP_IDENTIFIER);
                Ok(Self {
                    data_dir: base.clone(),
                    local_data_dir: base,
                })
            }
        }
    }

    /// The directory JSON stores live in (Tauri's `app_data_dir`).
    pub fn data_dir(&self) -> &PathBuf {
        &self.data_dir
    }

    /// The directory SQLite databases live in (Tauri's `app_local_data_dir`).
    pub fn local_data_dir(&self) -> &PathBuf {
        &self.local_data_dir
    }

    pub fn store_path(&self, file_name: &str) -> PathBuf {
        self.data_dir.join(file_name)
    }

    pub fn database_path(&self, sub_directory: &str, file_name: &str) -> PathBuf {
        self.local_data_dir.join(sub_directory).join(file_name)
    }

    /// Creates the directories this process will write to.
    pub fn ensure_directories(&self) -> Result<()> {
        std::fs::create_dir_all(&self.data_dir)?;
        std::fs::create_dir_all(&self.local_data_dir)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const HOME: &str = "/home/test-user";
    const XDG: &str = "/xdg/data";
    const APPDATA: &str = r"C:\Users\test-user\AppData\Roaming";
    const LOCALAPPDATA: &str = r"C:\Users\test-user\AppData\Local";

    #[test]
    fn linux_uses_xdg_data_home_when_set() {
        let paths =
            BeamPaths::from_platform(HostPlatform::Linux, Some(HOME.into()), Some(XDG.into()), None, None)
                .unwrap();
        assert_eq!(paths.data_dir(), &PathBuf::from("/xdg/data/io.beam.launcher"));
        assert_eq!(paths.local_data_dir(), paths.data_dir());
    }

    #[test]
    fn linux_falls_back_to_home_local_share() {
        let paths =
            BeamPaths::from_platform(HostPlatform::Linux, Some(HOME.into()), None, None, None)
                .unwrap();
        assert_eq!(
            paths.data_dir(),
            &PathBuf::from(format!("{HOME}/.local/share/io.beam.launcher"))
        );
    }

    #[test]
    fn linux_empty_xdg_falls_back_to_home() {
        let empty: OsString = "".into();
        let paths = BeamPaths::from_platform(
            HostPlatform::Linux,
            Some(HOME.into()),
            Some(empty),
            None,
            None,
        )
        .unwrap();
        assert_eq!(
            paths.data_dir(),
            &PathBuf::from(format!("{HOME}/.local/share/io.beam.launcher"))
        );
    }

    #[test]
    fn linux_requires_home_without_xdg() {
        let error =
            BeamPaths::from_platform(HostPlatform::Linux, None, None, None, None).unwrap_err();
        assert!(error.contains("HOME"));
    }

    #[test]
    fn windows_uses_appdata_and_local_appdata() {
        let paths = BeamPaths::from_platform(
            HostPlatform::Windows,
            None,
            None,
            Some(APPDATA.into()),
            Some(LOCALAPPDATA.into()),
        )
        .unwrap();
        // Compare structurally: separators are host-dependent because these
        // rules run on every CI runner.
        assert_eq!(
            paths.data_dir(),
            &PathBuf::from(APPDATA).join(APP_IDENTIFIER)
        );
        assert_eq!(
            paths.local_data_dir(),
            &PathBuf::from(LOCALAPPDATA).join(APP_IDENTIFIER)
        );
    }

    #[test]
    fn windows_requires_both_variables() {
        assert!(
            BeamPaths::from_platform(HostPlatform::Windows, None, None, Some(APPDATA.into()), None)
                .is_err()
        );
        assert!(
            BeamPaths::from_platform(HostPlatform::Windows, None, None, None, Some(LOCALAPPDATA.into()))
                .is_err()
        );
    }

    #[test]
    fn macos_uses_library_application_support() {
        let paths =
            BeamPaths::from_platform(HostPlatform::Macos, Some(HOME.into()), None, None, None)
                .unwrap();
        assert_eq!(
            paths.data_dir(),
            &PathBuf::from(format!("{HOME}/Library/Application Support/io.beam.launcher"))
        );
        assert_eq!(paths.local_data_dir(), paths.data_dir());
    }

    #[test]
    fn macos_requires_home() {
        assert!(BeamPaths::from_platform(HostPlatform::Macos, None, None, None, None).is_err());
    }

    #[test]
    fn resolve_succeeds_on_the_host_platform() {
        // The real environment must always resolve; this is the integration
        // half of the assertion, running wherever CI does.
        BeamPaths::resolve().expect("host environment must resolve beam paths");
    }
}
