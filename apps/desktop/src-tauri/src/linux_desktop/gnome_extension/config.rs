pub(crate) const CONFIG: GnomeExtensionConfig = GnomeExtensionConfig {
    dbus_destination: "org.gnome.Shell",
    dbus_path: "/org/gnome/Shell/Extensions/Beam",
    dbus_interface: "org.gnome.Shell.Extensions.Beam",
    extension_id: "beam@beam-linux",
    extension_metadata_json: include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../infra/desktop-integrations/gnome-shell/beam@beam-linux/metadata.json"
    )),
    extension_js: include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../infra/desktop-integrations/gnome-shell/beam@beam-linux/extension.js"
    )),
    extension_stylesheet_css: include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../infra/desktop-integrations/gnome-shell/beam@beam-linux/stylesheet.css"
    )),
};

pub(crate) struct GnomeExtensionConfig {
    pub dbus_destination: &'static str,
    pub dbus_path: &'static str,
    pub dbus_interface: &'static str,
    pub extension_id: &'static str,
    pub extension_metadata_json: &'static str,
    pub extension_js: &'static str,
    pub extension_stylesheet_css: &'static str,
}
