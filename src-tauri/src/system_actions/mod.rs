pub mod error;

use serde::{Deserialize, Serialize};
use std::process::Command;

use self::error::{Error, Result};

#[derive(Debug, Clone, Copy, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SystemAction {
    Shutdown,
    Sleep,
    Lock,
    Restart,
}

impl std::fmt::Display for SystemAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            SystemAction::Shutdown => "shutdown",
            SystemAction::Sleep => "sleep",
            SystemAction::Lock => "lock",
            SystemAction::Restart => "restart",
        };

        write!(f, "{value}")
    }
}

#[derive(Debug, Clone, Copy)]
struct CommandSpec {
    program: &'static str,
    args: &'static [&'static str],
}

impl CommandSpec {
    const fn new(program: &'static str, args: &'static [&'static str]) -> Self {
        Self { program, args }
    }
}

#[tauri::command]
pub fn execute_system_action(action: SystemAction) -> Result<()> {
    let candidates = command_candidates(action)?;
    run_candidates(action, candidates)
}

fn run_candidates(action: SystemAction, candidates: &[CommandSpec]) -> Result<()> {
    let mut failures = Vec::new();

    for candidate in candidates {
        let result = Command::new(candidate.program)
            .args(candidate.args)
            .output();

        match result {
            Ok(output) if output.status.success() => return Ok(()),
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let reason = if stderr.is_empty() {
                    format!(
                        "{} {:?} exited with {}",
                        candidate.program, candidate.args, output.status
                    )
                } else {
                    format!(
                        "{} {:?} exited with {} ({})",
                        candidate.program, candidate.args, output.status, stderr
                    )
                };
                failures.push(reason);
            }
            Err(err) => failures.push(format!(
                "{} {:?} failed to start ({})",
                candidate.program, candidate.args, err
            )),
        }
    }

    Err(Error::ExecutionFailed {
        action,
        reason: failures.join("; "),
    })
}

#[cfg(target_os = "linux")]
fn command_candidates(action: SystemAction) -> Result<&'static [CommandSpec]> {
    const SHUTDOWN: &[CommandSpec] = &[
        CommandSpec::new("systemctl", &["poweroff"]),
        CommandSpec::new("shutdown", &["-h", "now"]),
    ];
    const SLEEP: &[CommandSpec] = &[
        CommandSpec::new("systemctl", &["suspend"]),
        CommandSpec::new("loginctl", &["suspend"]),
    ];
    const LOCK: &[CommandSpec] = &[
        CommandSpec::new("loginctl", &["lock-session"]),
        CommandSpec::new("xdg-screensaver", &["lock"]),
        CommandSpec::new("dm-tool", &["lock"]),
    ];
    const RESTART: &[CommandSpec] = &[
        CommandSpec::new("systemctl", &["reboot"]),
        CommandSpec::new("shutdown", &["-r", "now"]),
    ];

    Ok(match action {
        SystemAction::Shutdown => SHUTDOWN,
        SystemAction::Sleep => SLEEP,
        SystemAction::Lock => LOCK,
        SystemAction::Restart => RESTART,
    })
}

#[cfg(target_os = "macos")]
fn command_candidates(action: SystemAction) -> Result<&'static [CommandSpec]> {
    const SHUTDOWN: &[CommandSpec] = &[CommandSpec::new(
        "osascript",
        &["-e", "tell app \"System Events\" to shut down"],
    )];
    const SLEEP: &[CommandSpec] = &[CommandSpec::new(
        "osascript",
        &["-e", "tell app \"System Events\" to sleep"],
    )];
    const LOCK: &[CommandSpec] = &[CommandSpec::new(
        "/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession",
        &["-suspend"],
    )];
    const RESTART: &[CommandSpec] = &[CommandSpec::new(
        "osascript",
        &["-e", "tell app \"System Events\" to restart"],
    )];

    Ok(match action {
        SystemAction::Shutdown => SHUTDOWN,
        SystemAction::Sleep => SLEEP,
        SystemAction::Lock => LOCK,
        SystemAction::Restart => RESTART,
    })
}

#[cfg(target_os = "windows")]
fn command_candidates(action: SystemAction) -> Result<&'static [CommandSpec]> {
    const SHUTDOWN: &[CommandSpec] = &[CommandSpec::new("shutdown", &["/s", "/t", "0"])];
    const SLEEP: &[CommandSpec] = &[CommandSpec::new(
        "rundll32.exe",
        &["powrprof.dll,SetSuspendState", "0,1,0"],
    )];
    const LOCK: &[CommandSpec] = &[CommandSpec::new(
        "rundll32.exe",
        &["user32.dll,LockWorkStation"],
    )];
    const RESTART: &[CommandSpec] = &[CommandSpec::new("shutdown", &["/r", "/t", "0"])];

    Ok(match action {
        SystemAction::Shutdown => SHUTDOWN,
        SystemAction::Sleep => SLEEP,
        SystemAction::Lock => LOCK,
        SystemAction::Restart => RESTART,
    })
}

#[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
fn command_candidates(action: SystemAction) -> Result<&'static [CommandSpec]> {
    Err(Error::UnsupportedPlatform {
        action,
        os: std::env::consts::OS.to_string(),
    })
}
