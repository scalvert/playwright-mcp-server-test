import { z } from 'zod';
import type { LLMHostConfig } from './llmHost/llmHostTypes.js';

/**
 * Evaluation mode
 */
export type EvalMode = 'direct' | 'llm_host';

/**
 * A single eval test case
 *
 * Note: toolName and args are required for backward compatibility
 * and for 'direct' mode. For 'llm_host' mode, use scenario instead.
 */
export interface EvalCase {
  /**
   * Unique identifier for this test case
   */
  id: string;

  /**
   * Human-readable description of what this test case validates
   */
  description?: string;

  /**
   * Evaluation mode
   * - 'direct': Direct API calls to MCP tools (default)
   * - 'llm_host': LLM-driven tool selection via natural language
   *
   * @default 'direct'
   */
  mode?: EvalMode;

  /**
   * Name of the MCP tool to call (required for 'direct' mode)
   */
  toolName: string;

  /**
   * Arguments to pass to the tool (required for 'direct' mode)
   */
  args: Record<string, unknown>;

  /**
   * Natural language scenario for LLM to execute (optional, required for 'llm_host' mode)
   *
   * @example "Get the weather for London and tell me if I need an umbrella"
   */
  scenario?: string;

  /**
   * LLM host configuration (optional for 'llm_host' mode)
   *
   * If not specified, uses default configuration from test environment
   */
  llmHostConfig?: LLMHostConfig;

  /**
   * Expected exact response (for strict equality checks)
   */
  expectedExact?: unknown;

  /**
   * Name of the schema to validate against (for schema-based validation)
   */
  expectedSchemaName?: string;

  /**
   * ID of the judge configuration to use (for LLM-as-a-judge evaluation)
   */
  judgeConfigId?: string;

  /**
   * Expected text content (substring match)
   * Can be a string or array of strings that must all be present in the response
   */
  expectedTextContains?: string | string[];

  /**
   * Expected regex pattern(s) that must match the response text
   * Can be a string pattern or array of patterns
   */
  expectedRegex?: string | string[];

  /**
   * Snapshot name for Playwright snapshot testing
   * When specified, uses expect(response).toMatchSnapshot(snapshotName)
   * Use --update-snapshots flag to update snapshots
   */
  expectedSnapshot?: string;

  /**
   * Additional metadata for this test case
   *
   * For 'llm_host' mode, can include 'expectedToolCalls' for validation
   */
  metadata?: Record<string, unknown>;
}

/**
 * A complete eval dataset containing multiple test cases
 */
export interface EvalDataset {
  /**
   * Dataset name
   */
  name: string;

  /**
   * Dataset description
   */
  description?: string;

  /**
   * Test cases in this dataset
   */
  cases: Array<EvalCase>;

  /**
   * Optional schema definitions referenced by test cases
   */
  schemas?: Record<string, z.ZodSchema>;

  /**
   * Additional dataset metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Zod schema for LLMHostConfig (simplified for serialization)
 */
const LLMHostConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic']),
  apiKeyEnvVar: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  maxToolCalls: z.number().optional(),
});

/**
 * Zod schema for EvalCase
 *
 * Note: For backward compatibility, toolName and args are always required.
 * For llm_host mode, you can use placeholder values for toolName/args.
 */
export const EvalCaseSchema = z.object({
  id: z.string().min(1, 'id must not be empty'),
  description: z.string().optional(),
  mode: z.enum(['direct', 'llm_host']).optional(),
  toolName: z.string().min(1, 'toolName must not be empty'),
  args: z.record(z.unknown()),
  scenario: z.string().optional(),
  llmHostConfig: LLMHostConfigSchema.optional(),
  expectedExact: z.unknown().optional(),
  expectedSchemaName: z.string().optional(),
  judgeConfigId: z.string().optional(),
  expectedTextContains: z.union([z.string(), z.array(z.string())]).optional(),
  expectedRegex: z.union([z.string(), z.array(z.string())]).optional(),
  expectedSnapshot: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for EvalDataset (without schemas field, as schemas aren't serializable)
 */
export const EvalDatasetSchema = z.object({
  name: z.string().min(1, 'name must not be empty'),
  description: z.string().optional(),
  cases: z.array(EvalCaseSchema).min(1, 'dataset must have at least one case'),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Type for serialized eval dataset (without Zod schemas)
 */
export type SerializedEvalDataset = z.infer<typeof EvalDatasetSchema>;

/**
 * Validates an eval case
 *
 * @param evalCase - The eval case to validate
 * @returns The validated eval case
 * @throws {z.ZodError} If validation fails
 */
export function validateEvalCase(evalCase: unknown): EvalCase {
  return EvalCaseSchema.parse(evalCase);
}

/**
 * Validates a serialized eval dataset
 *
 * @param dataset - The dataset to validate
 * @returns The validated dataset
 * @throws {z.ZodError} If validation fails
 */
export function validateEvalDataset(dataset: unknown): SerializedEvalDataset {
  return EvalDatasetSchema.parse(dataset);
}
