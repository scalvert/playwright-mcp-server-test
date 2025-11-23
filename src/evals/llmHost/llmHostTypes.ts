/**
 * Types and interfaces for LLM host simulation mode
 *
 * This module provides types for testing MCP servers through LLM hosts,
 * validating tool descriptions, parameter clarity, and discoverability.
 */

import type { MCPFixtureApi } from '../../mcp/fixtures/mcpFixture.js';

/**
 * LLM provider for host simulation
 */
export type LLMProvider = 'openai' | 'anthropic';

/**
 * Configuration for LLM host simulation
 */
export interface LLMHostConfig {
  /**
   * LLM provider to use
   */
  provider: LLMProvider;

  /**
   * Environment variable name containing the API key
   * @default 'OPENAI_API_KEY' for openai, 'ANTHROPIC_API_KEY' for anthropic
   */
  apiKeyEnvVar?: string;

  /**
   * Model to use
   * @default 'gpt-4' for openai, 'claude-3-5-sonnet-20241022' for anthropic
   */
  model?: string;

  /**
   * Maximum tokens for response
   */
  maxTokens?: number;

  /**
   * Temperature (0-1, lower is more deterministic)
   * @default 0.0
   */
  temperature?: number;

  /**
   * Maximum number of tool calls to allow in a single conversation
   * @default 10
   */
  maxToolCalls?: number;
}

/**
 * A tool call made by the LLM
 */
export interface LLMToolCall {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool arguments (as provided by LLM)
   */
  arguments: Record<string, unknown>;

  /**
   * Optional tool call ID (for tracking)
   */
  id?: string;
}

/**
 * Result of a tool call validation
 */
export interface ToolCallValidationResult {
  /**
   * Whether the tool call was valid
   */
  valid: boolean;

  /**
   * List of actual tool calls made
   */
  actualCalls: Array<LLMToolCall>;

  /**
   * Expected tool calls (if specified in eval case)
   */
  expectedCalls?: Array<LLMToolCall>;

  /**
   * Details about validation (e.g., missing calls, incorrect arguments)
   */
  details?: string;
}

/**
 * Result from an LLM host simulation
 */
export interface LLMHostSimulationResult {
  /**
   * Whether the simulation succeeded
   */
  success: boolean;

  /**
   * Tool calls made by the LLM
   */
  toolCalls: Array<LLMToolCall>;

  /**
   * Final response from the LLM
   */
  response?: string;

  /**
   * Error message if simulation failed
   */
  error?: string;

  /**
   * Full conversation history (for debugging)
   */
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'tool';
    content: string;
  }>;
}

/**
 * Interface for LLM host simulators
 *
 * Implementations communicate with MCP servers via the actual MCP protocol
 */
export interface LLMHostSimulator {
  /**
   * Simulates an LLM host interacting with an MCP server
   *
   * @param mcp - MCP fixture API
   * @param scenario - Natural language prompt describing what the LLM should do
   * @param config - LLM host configuration
   * @returns Simulation result with tool calls and response
   */
  simulate(
    mcp: MCPFixtureApi,
    scenario: string,
    config: LLMHostConfig
  ): Promise<LLMHostSimulationResult>;
}

/**
 * Expected tool call specification (for validation)
 */
export interface ExpectedToolCall {
  /**
   * Tool name
   */
  name: string;

  /**
   * Expected arguments (partial match)
   */
  arguments?: Record<string, unknown>;

  /**
   * Whether this call is required
   * @default true
   */
  required?: boolean;
}
