import { invoke, isTauri } from "@tauri-apps/api/core";
import { z } from "zod";

const calculatorOutputSchema = z.object({
  value: z
    .string()
    .default("")
    .transform((value) => value.trim()),
  is_error: z.boolean().default(false),
});

const calculatorResponseSchema = z.object({
  query: z.string().default(""),
  status: z.enum(["empty", "irrelevant", "incomplete", "error", "valid"]).default("empty"),
  outputs: z.array(calculatorOutputSchema).default([]),
  pending_requests: z.boolean().default(false),
});

type CalculatorOutput = z.infer<typeof calculatorOutputSchema>;
type CalculatorResponse = z.infer<typeof calculatorResponseSchema>;

export async function calculateExpression(query: string): Promise<CalculatorResponse | null> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery || !isTauri()) {
    return null;
  }

  const response = await invoke<unknown>("calculate_expression", {
    query: normalizedQuery,
  });

  const parsedResponse = calculatorResponseSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error("invalid calculator response from backend");
  }

  return parsedResponse.data;
}
