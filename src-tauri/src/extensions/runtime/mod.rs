pub mod bridge;

#[allow(dead_code)]
pub(crate) mod proto {
    include!(concat!(
        env!("OUT_DIR"),
        "/extension_runtime/beam.extension_runtime.v1.rs"
    ));
}
