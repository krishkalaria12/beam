pub(crate) const CONFIG: CustomConfig = CustomConfig {
    hidden_command_ids_key: "hidden_command_ids",
};

pub(crate) struct CustomConfig {
    pub hidden_command_ids_key: &'static str,
}
