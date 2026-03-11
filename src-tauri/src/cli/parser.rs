use std::path::Path;

use clap::Parser;

use crate::cli::bridge::submit_dmenu_request;
use crate::cli::dmenu::{
    format_dmenu_output, parse_dmenu_args, rank_rows, read_rows, DmenuClientExit, DmenuOptions,
    DmenuRequest,
};
use crate::cli::error::Result;

#[derive(Debug, Clone)]
pub enum CliInvocation {
    LaunchApp { startup_args: Vec<String> },
    Dmenu { options: DmenuOptions },
    RunWaylandDataControlHelper,
}

#[derive(Debug, Parser)]
#[command(
    name = "beam",
    disable_help_subcommand = true,
    disable_version_flag = true
)]
struct CanonicalCli {
    #[command(subcommand)]
    command: Option<CanonicalSubcommand>,
    #[arg(long, hide = true, default_value_t = false)]
    toggle: bool,
    #[arg(long, hide = true)]
    run_command: Option<String>,
}

#[derive(Debug, clap::Subcommand)]
enum CanonicalSubcommand {
    Toggle,
    RunCommand { command_id: String },
    #[command(name = "__wayland-data-control-helper", hide = true)]
    WaylandDataControlHelper,
}

pub fn parse_invocation(raw_args: &[String]) -> Result<CliInvocation> {
    let argv0 = raw_args
        .first()
        .cloned()
        .unwrap_or_else(|| "beam".to_string());
    let binary_name = file_name(&argv0);

    if binary_name == "dmenu" {
        return Ok(CliInvocation::Dmenu {
            options: parse_dmenu_args(raw_args.get(1..).unwrap_or(&[]), false)?,
        });
    }

    if binary_name == "rofi" {
        return Ok(CliInvocation::Dmenu {
            options: parse_dmenu_args(raw_args.get(1..).unwrap_or(&[]), true)?,
        });
    }

    match raw_args.get(1).map(String::as_str) {
        Some("dmenu") => {
            return Ok(CliInvocation::Dmenu {
                options: parse_dmenu_args(raw_args.get(2..).unwrap_or(&[]), false)?,
            });
        }
        Some("rofi") => {
            return Ok(CliInvocation::Dmenu {
                options: parse_dmenu_args(raw_args.get(2..).unwrap_or(&[]), true)?,
            });
        }
        _ => {}
    }

    let parsed = match CanonicalCli::try_parse_from(raw_args) {
        Ok(parsed) => parsed,
        Err(_) => {
            return Ok(CliInvocation::LaunchApp {
                startup_args: raw_args.to_vec(),
            });
        }
    };

    if parsed.toggle {
        return Ok(CliInvocation::LaunchApp {
            startup_args: vec![argv0, "--toggle".to_string()],
        });
    }

    if let Some(command_id) = parsed.run_command.filter(|value| !value.trim().is_empty()) {
        return Ok(CliInvocation::LaunchApp {
            startup_args: vec![argv0, format!("--run-command={}", command_id.trim())],
        });
    }

    match parsed.command {
        Some(CanonicalSubcommand::Toggle) => Ok(CliInvocation::LaunchApp {
            startup_args: vec![argv0, "--toggle".to_string()],
        }),
        Some(CanonicalSubcommand::RunCommand { command_id }) => Ok(CliInvocation::LaunchApp {
            startup_args: vec![argv0, format!("--run-command={}", command_id.trim())],
        }),
        Some(CanonicalSubcommand::WaylandDataControlHelper) => {
            Ok(CliInvocation::RunWaylandDataControlHelper)
        }
        None => Ok(CliInvocation::LaunchApp {
            startup_args: raw_args.to_vec(),
        }),
    }
}

pub fn execute_dmenu(options: DmenuOptions) -> Result<i32> {
    if cfg!(debug_assertions) {
        for ignored_option in &options.ignored_options {
            log::debug!("[cli-dmenu] ignoring compatibility option {ignored_option}");
        }
    }

    let rows = read_rows(&options)?;

    if options.dump {
        let ranked_ids = rank_rows(&rows, &options, &options.initial_query);
        for row_id in ranked_ids {
            if let Some(row) = rows.iter().find(|row| row.id == row_id) {
                println!("{}", row.raw_text);
            }
        }
        return Ok(DmenuClientExit::Success.code());
    }

    let response = submit_dmenu_request(
        &DmenuRequest {
            request_id: nanoid::nanoid!(),
            prompt: options.prompt.clone(),
            message: options.message.clone(),
            lines: options.lines,
            password: options.password,
            only_match: options.only_match,
            no_custom: options.no_custom,
            markup_rows: options.markup_rows,
            case_insensitive: options.case_insensitive,
            select_text: options.select_text.clone(),
            initial_query: options.initial_query.clone(),
            search_mode: options.search_mode,
            rows: rows.clone(),
            restore_window_hidden: false,
        },
        &options,
    )?;

    if !response.accepted {
        return Ok(DmenuClientExit::Cancelled.code());
    }

    let output = format_dmenu_output(&rows, &options, &response)?;
    if !output.is_empty() {
        println!("{output}");
    }
    Ok(DmenuClientExit::Success.code())
}

fn file_name(value: &str) -> String {
    Path::new(value)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(value)
        .to_string()
}
