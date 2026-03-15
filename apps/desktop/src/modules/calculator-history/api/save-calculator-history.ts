import { invoke } from "@tauri-apps/api/core";

export async function saveCalculatorHistory(query: string, result: string, sessionId: string) {
  try {
    await invoke("save_calculator_history", { query, result, sessionId });
  } catch (error) {
    console.error("Failed to save calculator history:", error);
  }
}
