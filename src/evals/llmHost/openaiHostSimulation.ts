/**
 * OpenAI Agents SDK integration for LLM host simulation
 *
 * Uses @openai/agents with native MCP support to test servers through
 * actual LLM-driven tool selection and invocation.
 */

import type { MCPFixtureApi } from '../../mcp/fixtures/mcpFixture.js';
import type {
  LLMHostConfig,
  LLMHostSimulationResult,
  LLMToolCall,
} from './llmHostTypes.js';

/**
 * Checks if @openai/agents is available
 */
function checkOpenAIAgentsAvailable(): void {
  try {
    require.resolve('@openai/agents');
  } catch {
    throw new Error(
      'OpenAI Agents SDK is not installed. Install it with: npm install @openai/agents'
    );
  }
}

/**
 * Checks if openai is available
 */
function checkOpenAIAvailable(): void {
  try {
    require.resolve('openai');
  } catch {
    throw new Error(
      'OpenAI SDK is not installed. Install it with: npm install openai'
    );
  }
}

/**
 * Simulates an LLM host using OpenAI Agents SDK with MCP support
 *
 * @param mcp - MCP fixture API (contains the client we're testing)
 * @param scenario - Natural language prompt
 * @param config - LLM host configuration
 * @returns Simulation result
 */
export async function simulateOpenAIHost(
  mcp: MCPFixtureApi,
  scenario: string,
  config: LLMHostConfig
): Promise<LLMHostSimulationResult> {
  checkOpenAIAgentsAvailable();
  checkOpenAIAvailable();

  try {
    // Dynamic imports for optional dependencies
    const { Agent } = await import('@openai/agents');
    const { OpenAI } = await import('openai');

    // Get API key from environment
    const apiKeyEnvVar = config.apiKeyEnvVar || 'OPENAI_API_KEY';
    const apiKey = process.env[apiKeyEnvVar];

    if (!apiKey) {
      throw new Error(
        `OpenAI API key not found in environment variable ${apiKeyEnvVar}`
      );
    }

    // Create OpenAI client
    const openai = new OpenAI({ apiKey });

    // Get MCP client configuration from the fixture
    // The MCP client is already connected by the Playwright fixture
    const client = mcp.client;

    // Get server info to create MCP server configuration
    const serverInfo = mcp.getServerInfo();

    // Note: The OpenAI Agents SDK expects an MCP server configuration
    // We need to extract the connection details from our existing client
    // This is a bit tricky because the SDK wants to create its own connection

    // For now, we'll use a workaround: list the tools and convert them
    // to OpenAI function calling format, then track which tools were called
    const tools = await mcp.listTools();

    // Convert MCP tools to OpenAI function calling format
    const openaiTools = tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema || {},
      },
    }));

    // Track tool calls
    const toolCalls: LLMToolCall[] = [];

    // Create a simple agentic loop
    const model = config.model || 'gpt-4';
    const maxIterations = config.maxToolCalls || 10;

    let conversationHistory: Array<{
      role: 'user' | 'assistant' | 'tool';
      content: string;
    }> = [
      {
        role: 'user',
        content: scenario,
      },
    ];

    let finalResponse = '';

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Call OpenAI with tools
      const messages = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await openai.chat.completions.create({
        model,
        messages: messages as any,
        tools: openaiTools,
        temperature: config.temperature ?? 0.0,
        max_tokens: config.maxTokens,
      });

      const message = response.choices[0]?.message;

      if (!message) {
        throw new Error('No response from OpenAI');
      }

      // Check if the assistant wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Add assistant message to history
        conversationHistory.push({
          role: 'assistant',
          content: message.content || '',
        });

        // Execute each tool call through MCP
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          // Track the tool call
          toolCalls.push({
            name: functionName,
            arguments: functionArgs,
            id: toolCall.id,
          });

          // Call the tool through MCP
          const result = await mcp.callTool(functionName, functionArgs);

          // Extract text from MCP result
          let resultText = '';
          if (result.content && Array.isArray(result.content)) {
            resultText = result.content
              .map((item: any) =>
                item.type === 'text' ? item.text : JSON.stringify(item)
              )
              .join('\n');
          } else {
            resultText = JSON.stringify(result);
          }

          // Add tool result to conversation
          conversationHistory.push({
            role: 'tool',
            content: resultText,
          });
        }
      } else {
        // No more tool calls, we have the final response
        finalResponse = message.content || '';
        conversationHistory.push({
          role: 'assistant',
          content: finalResponse,
        });
        break;
      }
    }

    return {
      success: true,
      toolCalls,
      response: finalResponse,
      conversationHistory,
    };
  } catch (error) {
    return {
      success: false,
      toolCalls: [],
      error:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
