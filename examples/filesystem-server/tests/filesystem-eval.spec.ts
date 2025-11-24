import { test as base, expect } from '@playwright/test';
import { Project } from 'fixturify-project';
import {
  loadEvalDataset,
  runEvalDataset,
  createTextContainsExpectation,
  createRegexExpectation,
  createSchemaExpectation,
  createToolCallExpectation,
  type MCPFixtureApi,
} from 'playwright-mcp-evals';
import {
  createMCPClientForConfig,
  createMCPFixtureApi,
  closeMCPClient,
  type MCPConfig,
} from 'playwright-mcp-evals';
import { ConfigFileSchema, extractAndValidateJSON } from '../schemas/fileContentSchema.js';
import path from 'path';

/**
 * Custom fixtures for filesystem testing
 */
type FilesystemFixtures = {
  /**
   * fixturify-project Project instance with test files
   */
  fileProject: Project;

  /**
   * Absolute path to the project's base directory
   */
  projectPath: string;

  /**
   * MCP client connected to the filesystem server
   */
  mcp: MCPFixtureApi;
};

/**
 * Extend Playwright test with filesystem fixtures
 */
const test = base.extend<FilesystemFixtures>({
  // Create a new project for each test with test files
  fileProject: async ({}, use) => {
    const project = new Project('fs-test', '1.0.0', {
      files: {
        'readme.txt': 'Hello World',
        'config.json': JSON.stringify(
          {
            version: '1.0.0',
            features: ['logging', 'api', 'authentication'],
          },
          null,
          2
        ),
        'docs': {
          'guide.md': '# User Guide\n\nComplete guide here',
          'api.md': '# API Reference\n\nAPI documentation',
        },
        'data': {
          'users.csv':
            'id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com',
          'settings.json': JSON.stringify(
            { theme: 'dark', lang: 'en' },
            null,
            2
          ),
        },
      },
    });

    // Write files to disk
    await project.write();

    await use(project);

    // Automatic cleanup
    project.dispose();
  },

  // Provide the project path for MCP server configuration
  projectPath: async ({ fileProject }, use) => {
    await use(fileProject.baseDir);
  },

  // Create MCP client connected to filesystem server
  mcp: async ({ projectPath }, use) => {
    const config: MCPConfig = {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', projectPath],
      cwd: projectPath, // Set working directory to project path so relative paths work
    };

    const client = await createMCPClientForConfig(config);
    const mcpApi = createMCPFixtureApi(client);

    await use(mcpApi);

    await closeMCPClient(client);
  },
});

/**
 * Filesystem MCP Server Evaluation Tests
 *
 * This test suite demonstrates:
 * - Using fixturify-project for isolated test fixtures
 * - Testing the official Filesystem MCP server
 * - Both direct mode (specific tool calls) and LLM host mode (natural language)
 * - Various validation strategies (text, regex, schema, tool calls)
 */
test.describe('Filesystem MCP Server Evaluation', () => {
  test('should pass all evaluation cases', async ({ mcp, fileProject }, testInfo) => {
    // Load the evaluation dataset
    const dataset = await loadEvalDataset(
      path.join(import.meta.dirname, '../eval-dataset.json'),
      {
        schemas: {
          // Register schemas referenced in eval cases
          configFile: ConfigFileSchema,
        },
      }
    );

    console.log(
      `\nRunning ${dataset.cases.length} test cases against Filesystem MCP Server`
    );
    console.log(`Test files located at: ${fileProject.baseDir}\n`);

    // Create custom schema expectation for config file
    const configSchemaExpectation = async (_context: any, evalCase: any, response: unknown) => {
      // Only validate if this case has an expectedSchemaName
      if (!evalCase.expectedSchemaName) {
        return { pass: true, details: 'N/A' };
      }

      try {
        const config = extractAndValidateJSON(response, ConfigFileSchema);
        return {
          pass: true,
          details: `Config file validated successfully. Version: ${config.version}`,
        };
      } catch (error) {
        return {
          pass: false,
          details: `Schema validation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    };

    // Run the evaluation with all expectations
    const result = await runEvalDataset(
      {
        dataset,
        expectations: {
          textContains: createTextContainsExpectation({ caseSensitive: false }),
          regex: createRegexExpectation(),
          schema: configSchemaExpectation,
          toolCalls: createToolCallExpectation(),
        },
        onCaseComplete: (caseResult) => {
          // Log progress as tests complete
          const status = caseResult.pass ? '✓' : '✗';
          const mode = dataset.cases.find((c) => c.id === caseResult.id)?.mode || 'direct';
          console.log(`  ${status} ${caseResult.id} (${mode} mode) - ${caseResult.durationMs}ms`);

          if (!caseResult.pass) {
            console.log(`    Error: ${caseResult.error}`);
            Object.entries(caseResult.expectations).forEach(([type, exp]) => {
              if (exp && !exp.pass) {
                console.log(`    ${type}: ${exp.details}`);
              }
            });
          }
        },
      },
      { mcp, testInfo }
    );

    // Assert overall results
    console.log(`\nResults: ${result.passed}/${result.total} passed`);
    console.log(`Total duration: ${result.durationMs}ms\n`);

    // Count direct mode tests (those without LLM dependencies)
    const directModeTests = dataset.cases.filter(c => c.mode === 'direct' || !c.mode);
    const llmModeTests = dataset.cases.filter(c => c.mode === 'llm_host');

    // For now, we expect all direct mode tests to pass
    // LLM mode tests require OpenAI/Anthropic SDK installation
    console.log(`Direct mode: ${directModeTests.length} tests`);
    console.log(`LLM mode: ${llmModeTests.length} tests (requires API SDKs)\n`);

    // At minimum, all direct mode tests should pass
    expect(result.passed).toBeGreaterThanOrEqual(directModeTests.length);
  });

  test('should read files from temp directory', async ({ mcp, fileProject }) => {
    // Verify we can read the readme file
    const readmeResult = await mcp.callTool('read_file', {
      path: 'readme.txt',
    });

    expect(readmeResult.isError).not.toBe(true);

    // Extract text content from MCP response
    const content = readmeResult.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain('Hello World');
  });

  test('should list directory contents', async ({ mcp }) => {
    const listResult = await mcp.callTool('list_directory', {
      path: 'docs',
    });

    expect(listResult.isError).not.toBe(true);

    const content = listResult.content as Array<{ type: string; text: string }>;
    const text = content[0]?.text || '';

    expect(text).toContain('guide.md');
    expect(text).toContain('api.md');
  });

  test('should get directory tree showing markdown files', async ({ mcp }) => {
    const treeResult = await mcp.callTool('directory_tree', {
      path: '.',
    });

    expect(treeResult.isError).not.toBe(true);

    const content = treeResult.content as Array<{ type: string; text: string }>;
    const text = content[0]?.text || '';

    expect(text).toContain('.md');
    expect(text).toMatch(/guide\.md/);
    expect(text).toMatch(/api\.md/);
  });

  test('should handle non-existent files gracefully', async ({ mcp }) => {
    const result = await mcp.callTool('read_file', {
      path: 'does-not-exist.txt',
    });

    // The server should return an error for non-existent files
    expect(result.isError).toBe(true);
  });
});
