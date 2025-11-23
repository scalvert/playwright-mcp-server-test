/**
 * LLM Host Simulation - Main entry point
 *
 * Factory function for creating LLM host simulators
 */

import type { MCPFixtureApi } from '../../mcp/fixtures/mcpFixture.js';
import type {
  LLMHostConfig,
  LLMHostSimulationResult,
  LLMProvider,
} from './llmHostTypes.js';
import { simulateOpenAIHost } from './openaiHostSimulation.js';
import { simulateAnthropicHost } from './anthropicHostSimulation.js';

/**
 * Simulates an LLM host interacting with an MCP server
 *
 * This function uses actual LLM providers (OpenAI or Anthropic) to test
 * MCP servers through natural language scenarios. The LLM chooses which
 * tools to call based on their descriptions, testing discoverability and
 * parameter clarity.
 *
 * @param mcp - MCP fixture API
 * @param scenario - Natural language prompt describing what to do
 * @param config - LLM host configuration
 * @returns Simulation result with tool calls and final response
 *
 * @example
 * ```typescript
 * const result = await simulateLLMHost(mcp,
 *   "Get the weather for London",
 *   {
 *     provider: 'openai',
 *     model: 'gpt-4'
 *   }
 * );
 *
 * expect(result.success).toBe(true);
 * expect(result.toolCalls).toContainEqual({
 *   name: 'get_weather',
 *   arguments: { city: 'London' }
 * });
 * ```
 */
export async function simulateLLMHost(
  mcp: MCPFixtureApi,
  scenario: string,
  config: LLMHostConfig
): Promise<LLMHostSimulationResult> {
  const provider = config.provider;

  switch (provider) {
    case 'openai':
      return await simulateOpenAIHost(mcp, scenario, config);
    case 'anthropic':
      return await simulateAnthropicHost(mcp, scenario, config);
    default:
      throw new Error(
        `Unsupported LLM provider: ${provider}. Supported providers: openai, anthropic`
      );
  }
}

/**
 * Checks if the required SDK is installed for a given provider
 *
 * @param provider - LLM provider to check
 * @returns true if SDK is available, false otherwise
 */
export function isProviderAvailable(provider: LLMProvider): boolean {
  try {
    if (provider === 'openai') {
      require.resolve('@openai/agents');
      require.resolve('openai');
      return true;
    } else if (provider === 'anthropic') {
      require.resolve('@anthropic-ai/sdk');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Gets a helpful error message for missing dependencies
 *
 * @param provider - LLM provider
 * @returns Error message with installation instructions
 */
export function getMissingDependencyMessage(provider: LLMProvider): string {
  if (provider === 'openai') {
    return `OpenAI SDKs are not installed. Install them with: npm install openai @openai/agents`;
  } else if (provider === 'anthropic') {
    return `Anthropic SDK is not installed. Install it with: npm install @anthropic-ai/sdk`;
  }
  return `Unknown provider: ${provider}`;
}
