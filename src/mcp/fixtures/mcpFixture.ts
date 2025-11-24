import type { TestInfo } from '@playwright/test';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type {
  Tool,
  CallToolResult,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';

// Dynamic import of test for conditional step tracking
let testStep: ((name: string, fn: () => Promise<any>) => Promise<any>) | null = null;

// Try to load test.step() dynamically
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const playwright = require('@playwright/test');
  if (playwright && playwright.test && playwright.test.step) {
    testStep = playwright.test.step.bind(playwright.test);
  }
} catch {
  // Not in a test context, that's fine
}

/**
 * High-level API for interacting with MCP servers in tests
 *
 * This interface wraps the raw MCP Client with test-friendly methods
 */
export interface MCPFixtureApi {
  /**
   * The underlying MCP client (for advanced usage)
   */
  client: Client;

  /**
   * Lists all available tools from the MCP server
   *
   * @returns Array of tool definitions
   */
  listTools(): Promise<Array<Tool>>;

  /**
   * Calls a tool on the MCP server
   *
   * @param name - Tool name
   * @param args - Tool arguments
   * @returns Tool call result
   */
  callTool<TArgs extends Record<string, unknown> = Record<string, unknown>>(
    name: string,
    args: TArgs
  ): Promise<CallToolResult>;

  /**
   * Gets information about the connected server
   */
  getServerInfo(): {
    name?: string;
    version?: string;
  } | null;
}

/**
 * Creates an MCPFixtureApi wrapper around a Client
 *
 * @param client - The MCP client to wrap
 * @returns MCPFixtureApi instance
 */
export function createMCPFixtureApi(client: Client): MCPFixtureApi {
  return {
    client,

    async listTools(): Promise<Array<Tool>> {
      const result = (await client.listTools()) as ListToolsResult;
      return result.tools;
    },

    async callTool<TArgs extends Record<string, unknown>>(
      name: string,
      args: TArgs
    ): Promise<CallToolResult> {
      const result = (await client.callTool({
        name,
        arguments: args,
      })) as CallToolResult;
      return result;
    },

    getServerInfo() {
      const serverVersion = client.getServerVersion();
      if (!serverVersion) {
        return null;
      }
      return {
        name: serverVersion.name,
        version: serverVersion.version,
      };
    },
  };
}

/**
 * Creates an MCPFixtureApi wrapper with automatic test.step() tracking
 *
 * This version wraps all MCP operations with test.step() calls for better
 * visibility in test reports and the MCP Eval Reporter UI.
 *
 * All MCP operations are automatically tracked and appear as distinct steps
 * in Playwright's test output and the MCP Eval Reporter.
 *
 * @param client - The MCP client to wrap
 * @param testInfo - Playwright TestInfo for creating attachments
 * @returns MCPFixtureApi instance with auto-tracking
 *
 * @example
 * ```typescript
 * const test = base.extend<{ mcp: MCPFixtureApi }>({
 *   mcp: async ({}, use, testInfo) => {
 *     const client = await createMCPClientForConfig(config);
 *     const api = createMCPFixtureApiWithTracking(client, testInfo);
 *     await use(api);
 *     await closeMCPClient(client);
 *   }
 * });
 * ```
 */
export function createMCPFixtureApiWithTracking(
  client: Client,
  testInfo: TestInfo
): MCPFixtureApi {
  const baseApi = createMCPFixtureApi(client);

  return {
    client,

    async listTools(): Promise<Array<Tool>> {
      const execute = async () => {
        const result = await baseApi.listTools();

        // Auto-attach for reporter
        await testInfo.attach('mcp-list-tools', {
          contentType: 'application/json',
          body: JSON.stringify(
            {
              operation: 'listTools',
              toolCount: result.length,
              tools: result.map((t) => ({
                name: t.name,
                description: t.description,
              })),
            },
            null,
            2
          ),
        });

        return result;
      };

      // Wrap in test.step if available
      return testStep ? testStep('MCP: listTools()', execute) : execute();
    },

    async callTool<TArgs extends Record<string, unknown>>(
      name: string,
      args: TArgs
    ): Promise<CallToolResult> {
      const execute = async () => {
        const startTime = Date.now();
        const result = await baseApi.callTool(name, args);
        const durationMs = Date.now() - startTime;

        // Auto-attach for reporter
        await testInfo.attach(`mcp-call-${name}`, {
          contentType: 'application/json',
          body: JSON.stringify(
            {
              operation: 'callTool',
              toolName: name,
              args,
              result,
              durationMs,
              isError: result.isError || false,
            },
            null,
            2
          ),
        });

        return result;
      };

      // Wrap in test.step if available
      return testStep ? testStep(`MCP: callTool("${name}")`, execute) : execute();
    },

    getServerInfo() {
      // getServerInfo is synchronous, so we can't wrap it in test.step
      // We'll attach the info asynchronously in the background
      const result = baseApi.getServerInfo();

      // Fire-and-forget attachment (don't block synchronous call)
      testInfo
        .attach('mcp-server-info', {
          contentType: 'application/json',
          body: JSON.stringify(
            {
              operation: 'getServerInfo',
              serverInfo: result,
            },
            null,
            2
          ),
        })
        .catch(() => {
          // Ignore attachment errors for sync methods
        });

      return result;
    },
  };
}
