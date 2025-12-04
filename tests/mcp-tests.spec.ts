import { test, expect } from '../src/fixtures/mcp.js';
import { runConformanceChecks } from '../src/spec/conformanceChecks.js';
import { loadEvalDataset } from '../src/evals/datasetLoader.js';
import { runEvalDataset } from '../src/evals/evalRunner.js';
import { createExactExpectation } from '../src/evals/expectations/exactExpectation.js';
import { createSchemaExpectation } from '../src/evals/expectations/schemaExpectation.js';
import { createTextContainsExpectation } from '../src/evals/expectations/textContainsExpectation.js';
import { createRegexExpectation } from '../src/evals/expectations/regexExpectation.js';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('MCP Server Tests', () => {
  test('should connect to MCP server and get server info', async ({ mcp }) => {
    const serverInfo = mcp.getServerInfo();
    expect(serverInfo).toBeTruthy();
  });

  test('should list available tools', async ({ mcp }) => {
    const tools = await mcp.listTools();
    expect(tools.length).toBeGreaterThan(0);
  });

  test('should run conformance checks', async ({ mcp }) => {
    const result = await runConformanceChecks(mcp, {
      validateSchemas: true,
      checkServerInfo: true,
    });

    expect(result.pass).toBe(true);

    // Verify raw responses are returned for snapshotting
    expect(result.raw).toBeDefined();
    expect(result.raw.serverInfo).toBeTruthy();
    expect(result.raw.serverInfo?.name).toBe('test-mcp-server');
    expect(result.raw.capabilities).toBeTruthy();
    expect(result.raw.tools).toHaveLength(4);
    expect(result.raw.tools.map((t) => t.name)).toContain('echo');
    expect(result.raw.tools.map((t) => t.name)).toContain('calculate');
    expect(result.raw.tools.map((t) => t.name)).toContain('get_weather');
  });

  test('should run eval dataset', async ({ mcp }) => {
    // Define schemas for validation
    const WeatherResponseSchema = z.object({
      city: z.string(),
      temperature: z.number(),
      conditions: z.string(),
    });

    // Load dataset
    const dataset = await loadEvalDataset(
      join(__dirname, '../data/eval_dataset.json'),
      {
        schemas: {
          'weather-response': WeatherResponseSchema,
        },
      }
    );

    // Run evals (only the ones our mock server supports)
    const result = await runEvalDataset(
      {
        dataset,
        expectations: {
          exact: createExactExpectation(),
          schema: createSchemaExpectation(dataset),
          textContains: createTextContainsExpectation(),
          regex: createRegexExpectation(),
        },
      },
      { mcp }
    );

    // Mock server supports get_weather, calculate, and get_city_info tools
    // All cases should pass now with text-based expectations
    expect(result.passed).toBeGreaterThanOrEqual(4);
  });

  test('should handle tool call errors gracefully', async ({ mcp }) => {
    const result = await mcp.callTool('nonexistent_tool', {});
    // MCP SDK returns isError: true instead of throwing
    expect(result.isError).toBe(true);
  });
});
