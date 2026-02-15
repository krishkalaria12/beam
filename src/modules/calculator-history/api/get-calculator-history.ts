import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

const calculatorHistoryEntrySchema = z.object({
  query: z.string(),
  result: z.string(),
  timestamp: z.number(),
  session_id: z.string().nullable().optional(),
});

export type CalculatorHistoryEntry = z.infer<typeof calculatorHistoryEntrySchema>;

const calculatorHistorySchema = z.array(calculatorHistoryEntrySchema);

export async function getCalculatorHistory() {
  const history = await invoke<unknown>("get_calculator_history");
  const parsed = calculatorHistorySchema.safeParse(history);

  if (!parsed.success) {
    console.error("Failed to parse calculator history:", parsed.error, history);
    throw new Error("Invalid calculator history response");
  }

  return parsed.data;
}
