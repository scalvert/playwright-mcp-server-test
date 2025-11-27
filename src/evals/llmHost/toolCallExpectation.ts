/**
 * Tool call expectation for LLM host mode
 *
 * Validates that the LLM made the expected tool calls with correct arguments
 */

import type { EvalExpectation } from '../evalRunner.js';
import type { ExpectedToolCall, LLMToolCall } from './llmHostTypes.js';

/**
 * Checks if two argument objects match (partial match)
 *
 * @param actual - Actual arguments from LLM
 * @param expected - Expected arguments (can be partial)
 * @returns true if all expected keys match actual values
 */
function argumentsMatch(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>
): boolean {
  for (const key of Object.keys(expected)) {
    if (!(key in actual)) {
      return false;
    }

    const actualValue = actual[key];
    const expectedValue = expected[key];

    // Deep equality check
    if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
      return false;
    }
  }

  return true;
}

/**
 * Finds matching tool call in actual calls
 *
 * @param expected - Expected tool call
 * @param actualCalls - Actual tool calls made by LLM
 * @returns Matching tool call or null
 */
function findMatchingCall(
  expected: ExpectedToolCall,
  actualCalls: Array<LLMToolCall>
): LLMToolCall | null {
  for (const actualCall of actualCalls) {
    if (actualCall.name !== expected.name) {
      continue;
    }

    if (!expected.arguments) {
      // Name match is sufficient
      return actualCall;
    }

    if (argumentsMatch(actualCall.arguments, expected.arguments)) {
      return actualCall;
    }
  }

  return null;
}

/**
 * Creates a tool call expectation for LLM host mode
 *
 * Validates that the LLM made the expected tool calls with correct arguments.
 * Supports partial argument matching and optional calls.
 *
 * @returns Expectation function
 *
 * @example
 * ```typescript
 * // In your eval case:
 * {
 *   "id": "weather-london",
 *   "mode": "llm_host",
 *   "scenario": "Get the weather for London",
 *   "expectedToolCalls": [
 *     {
 *       "name": "get_weather",
 *       "arguments": { "city": "London" },
 *       "required": true
 *     }
 *   ]
 * }
 * ```
 */
export function createToolCallExpectation(): EvalExpectation {
  return async (_context, evalCase, response) => {
    // Extract expected tool calls from eval case metadata
    const expectedCalls = evalCase.metadata?.expectedToolCalls as
      | Array<ExpectedToolCall>
      | undefined;

    if (!expectedCalls || expectedCalls.length === 0) {
      return {
        pass: true,
        details: 'No expected tool calls specified',
      };
    }

    // Extract actual tool calls from response
    const responseObj = response as { toolCalls?: Array<LLMToolCall> } | null;
    const actualCalls = responseObj?.toolCalls;

    if (!actualCalls || actualCalls.length === 0) {
      const requiredCalls = expectedCalls.filter(
        (call) => call.required !== false
      );
      if (requiredCalls.length > 0) {
        return {
          pass: false,
          details: `Expected ${requiredCalls.length} tool call(s), but LLM made no tool calls`,
        };
      }
      return {
        pass: true,
        details: 'No tool calls expected or made',
      };
    }

    // Validate each expected call
    const missingCalls: Array<ExpectedToolCall> = [];
    const foundCalls: Array<{
      expected: ExpectedToolCall;
      actual: LLMToolCall;
    }> = [];

    for (const expectedCall of expectedCalls) {
      const matchingCall = findMatchingCall(expectedCall, actualCalls);

      if (!matchingCall) {
        if (expectedCall.required !== false) {
          missingCalls.push(expectedCall);
        }
      } else {
        foundCalls.push({
          expected: expectedCall,
          actual: matchingCall,
        });
      }
    }

    if (missingCalls.length > 0) {
      const missingDetails = missingCalls
        .map((call) => `${call.name}(${JSON.stringify(call.arguments || {})})`)
        .join(', ');

      return {
        pass: false,
        details: `Missing required tool call(s): ${missingDetails}. Actual calls: ${actualCalls.map((c) => c.name).join(', ')}`,
      };
    }

    return {
      pass: true,
      details: `All ${expectedCalls.length} expected tool call(s) were made correctly`,
    };
  };
}
