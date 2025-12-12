/**
 * Reporter-specific type definitions
 *
 * These types are used by the MCP reporter and UI.
 *
 * @packageDocumentation
 */

import type {
  AuthType,
  ResultSource,
  ExpectationType,
  EvalExpectationResult,
  ExpectationBreakdown,
} from './index.js';

/**
 * Individual conformance check result
 */
export interface MCPConformanceCheck {
  /**
   * Check name (e.g., 'server_info_present', 'list_tools_succeeds')
   */
  name: string;

  /**
   * Whether the check passed
   */
  pass: boolean;

  /**
   * Human-readable message describing the result
   */
  message: string;
}

/**
 * Conformance check result as stored in reporter data
 */
export interface MCPConformanceResultData {
  /**
   * Test title where conformance check was run
   */
  testTitle: string;

  /**
   * Whether all checks passed
   */
  pass: boolean;

  /**
   * Individual check results
   */
  checks: MCPConformanceCheck[];

  /**
   * Server info if available
   */
  serverInfo?: {
    name?: string;
    version?: string;
  };

  /**
   * Number of tools discovered
   */
  toolCount: number;

  /**
   * Auth type used for this check
   */
  authType?: AuthType;

  /**
   * Project name
   */
  project?: string;
}

/**
 * Server capabilities data from mcp-list-tools attachment
 */
export interface MCPServerCapabilitiesData {
  /**
   * Test title where listTools was called
   */
  testTitle: string;

  /**
   * List of tools available on the server
   */
  tools: Array<{
    name: string;
    description?: string;
  }>;

  /**
   * Total number of tools
   */
  toolCount: number;

  /**
   * Auth type used for this test
   */
  authType?: AuthType;

  /**
   * Project name
   */
  project?: string;
}

/**
 * Result of a single eval case
 */
export interface EvalCaseResult {
  /**
   * Case ID
   */
  id: string;

  /**
   * Dataset name this case belongs to
   */
  datasetName: string;

  /**
   * MCP tool name that was called
   */
  toolName: string;

  /**
   * Source of this result
   */
  source: ResultSource;

  /**
   * Overall pass/fail status
   */
  pass: boolean;

  /**
   * Tool response
   */
  response?: unknown;

  /**
   * Error if tool call failed
   */
  error?: string;

  /**
   * Expectation results
   */
  expectations: Partial<Record<ExpectationType, EvalExpectationResult>>;

  /**
   * Authentication type used for this test
   */
  authType?: AuthType;

  /**
   * Playwright project name this test belongs to
   */
  project?: string;

  /**
   * Execution time in milliseconds
   */
  durationMs: number;

  /**
   * @deprecated Mode is inferred from test context, not displayed in reports
   */
  mode?: 'direct' | 'llm_host';
}

/**
 * Aggregated MCP eval run data
 */
export interface MCPEvalRunData {
  /**
   * Run timestamp (ISO 8601)
   */
  timestamp: string;

  /**
   * Total duration in milliseconds
   */
  durationMs: number;

  /**
   * Environment info
   */
  environment: {
    ci: boolean;
    node: string;
    platform: string;
  };

  /**
   * Aggregate metrics
   */
  metrics: {
    /**
     * Total number of eval cases
     */
    total: number;

    /**
     * Number of passed cases
     */
    passed: number;

    /**
     * Number of failed cases
     */
    failed: number;

    /**
     * Pass rate (0-1)
     */
    passRate: number;

    /**
     * Dataset breakdown: dataset name -> count
     */
    datasetBreakdown: Record<string, number>;

    /**
     * Expectation type breakdown
     */
    expectationBreakdown: ExpectationBreakdown;
  };

  /**
   * All eval results from this run
   */
  results: EvalCaseResult[];

  /**
   * Conformance check results (optional)
   */
  conformanceChecks?: MCPConformanceResultData[];

  /**
   * Server capabilities discovered via listTools (optional)
   */
  serverCapabilities?: MCPServerCapabilitiesData[];
}

/**
 * Historical summary for trend charts
 */
export interface MCPEvalHistoricalSummary {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  durationMs: number;
}

/**
 * Complete data structure passed to UI
 */
export interface MCPEvalData {
  runData: MCPEvalRunData;
  historical: MCPEvalHistoricalSummary[];
}
