/**
 * Debug logging utilities
 *
 * Uses the `debug` package for conditional logging.
 * Enable via DEBUG environment variable:
 *
 * @example
 * ```bash
 * # Enable all mcp-testing logs
 * DEBUG=mcp-testing:* npm test
 *
 * # Enable only client logs
 * DEBUG=mcp-testing:client npm test
 *
 * # Enable only OAuth logs
 * DEBUG=mcp-testing:oauth npm test
 * ```
 */

import createDebug from 'debug';

const NAMESPACE = 'mcp-testing';

/**
 * Debug logger for MCP client operations
 */
export const debugClient = createDebug(`${NAMESPACE}:client`);

/**
 * Debug logger for OAuth operations
 */
export const debugOAuth = createDebug(`${NAMESPACE}:oauth`);

/**
 * Debug logger for eval operations
 */
export const debugEval = createDebug(`${NAMESPACE}:eval`);
