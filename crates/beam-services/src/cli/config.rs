// PORT: apps/desktop/src-tauri/src/cli/config.rs
// dmenu_request_event is the wire name preserved by
// BeamEvent::CliDmenuRequest (beam-core); kept for ledger greppability.
#[allow(dead_code)]
pub(crate) const CONFIG: CliConfig = CliConfig {
    bridge_host: "127.0.0.1",
    bridge_port: 38958,
    dmenu_request_event: "cli-dmenu-request",
};

#[allow(dead_code)]
pub(crate) struct CliConfig {
    pub bridge_host: &'static str,
    pub bridge_port: u16,
    pub dmenu_request_event: &'static str,
}
