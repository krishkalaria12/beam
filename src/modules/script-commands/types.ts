import { z } from "zod";

export const scriptCommandSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  scriptPath: z.string(),
  scriptName: z.string(),
  scriptExtension: z.string().nullish(),
  hasShebang: z.boolean().default(false),
});

export const scriptCommandSummaryListSchema = z.array(scriptCommandSummarySchema);

export const runScriptCommandRequestSchema = z.object({
  commandId: z.string().min(1),
  timeoutMs: z.number().int().positive().nullish(),
  background: z.boolean().default(false),
});

export const createScriptCommandRequestSchema = z.object({
  fileName: z.string().min(1),
  content: z.string(),
  overwrite: z.boolean().default(false),
  makeExecutable: z.boolean().default(true),
});

export const scriptExecutionResultSchema = z.object({
  commandId: z.string(),
  title: z.string(),
  scriptPath: z.string(),
  exitCode: z.number().int(),
  stdout: z.string(),
  stderr: z.string(),
  output: z.string(),
  firstLine: z.string(),
  lastLine: z.string(),
  message: z.string(),
});

export type ScriptCommandSummary = z.infer<typeof scriptCommandSummarySchema>;
export type RunScriptCommandRequest = z.infer<typeof runScriptCommandRequestSchema>;
export type CreateScriptCommandRequest = z.infer<typeof createScriptCommandRequestSchema>;
export type ScriptExecutionResult = z.infer<typeof scriptExecutionResultSchema>;
