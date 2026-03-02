import { invoke } from "@tauri-apps/api/core";

function isTauriRuntime() {
  return (
    typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

export async function openApplication(execPath: string) {
  const normalizedExecPath = execPath.trim();

  if (!normalizedExecPath) {
    throw new Error("application command is missing");
  }

  if (!isTauriRuntime()) {
    throw new Error("desktop runtime is required");
  }

  await invoke("open_application", {
    execPath: normalizedExecPath,
    exec_path: normalizedExecPath,
  });
}
