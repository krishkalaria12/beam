import { z } from "zod";

export const executeShellCommandRequestSchema = z.object({
  command: z.string().trim().min(1),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
});

export const executeShellCommandResultSchema = z.object({
  command: z.string(),
  shellProgram: z.string(),
  exitCode: z.number().int().nullable(),
  stdout: z.string(),
  stderr: z.string(),
  output: z.string(),
  durationMs: z.number().int().nonnegative(),
  timedOut: z.boolean(),
  success: z.boolean(),
});

export type ExecuteShellCommandRequest = z.infer<typeof executeShellCommandRequestSchema>;
export type ExecuteShellCommandResult = z.infer<typeof executeShellCommandResultSchema>;

export interface ShellExecutionEntry {
  id: string;
  command: string;
  startedAt: number;
  status: "running" | "completed" | "error";
  result: ExecuteShellCommandResult | null;
  errorMessage: string | null;
}
