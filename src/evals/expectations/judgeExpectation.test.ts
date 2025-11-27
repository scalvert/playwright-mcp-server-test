import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createJudgeExpectation, type JudgeConfigs } from './judgeExpectation.js';
import type { EvalCase } from '../datasetTypes.js';
import type { EvalExpectationContext } from '../evalRunner.js';
import type { MCPFixtureApi } from '../../mcp/fixtures/mcpFixture.js';
import type { LLMJudgeClient } from '../../judge/judgeTypes.js';

// Create mock context with optional judge client
function createMockContext(
  judgeClient?: LLMJudgeClient
): EvalExpectationContext {
  return {
    mcp: {} as unknown as MCPFixtureApi,
    judgeClient,
  };
}

// Create mock eval case
function createMockEvalCase(overrides: Partial<EvalCase> = {}): EvalCase {
  return {
    id: 'test-case',
    toolName: 'test_tool',
    args: {},
    ...overrides,
  };
}

// Create mock judge client
function createMockJudgeClient(
  evaluateResult: {
    pass?: boolean;
    score?: number;
    reasoning?: string;
  } = {}
): LLMJudgeClient {
  return {
    evaluate: vi.fn().mockResolvedValue({
      pass: evaluateResult.pass ?? true,
      score: evaluateResult.score,
      reasoning: evaluateResult.reasoning,
    }),
  };
}

describe('judgeExpectation', () => {
  describe('createJudgeExpectation', () => {
    let judgeConfigs: JudgeConfigs;

    beforeEach(() => {
      vi.clearAllMocks();
      judgeConfigs = {
        'semantic-match': {
          rubric: 'Evaluate if the response semantically matches the expected value',
          passingThreshold: 0.7,
        },
        'with-reference': {
          rubric: 'Compare response against the reference',
          reference: 'expected output',
          passingThreshold: 0.8,
        },
        'strict-match': {
          rubric: 'Strict semantic matching',
          passingThreshold: 0.95,
        },
      };
    });

    describe('skip conditions', () => {
      it('skips when no judgeConfigId is defined', async () => {
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext();
        const evalCase = createMockEvalCase(); // no judgeConfigId

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(true);
        expect(result.details).toBe('No judgeConfigId defined, skipping');
      });

      it('fails when no judgeClient is available', async () => {
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(); // no judgeClient
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(false);
        expect(result.details).toBe('No judgeClient available in context');
      });

      it('fails when judge config is not found', async () => {
        const mockJudge = createMockJudgeClient();
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({
          judgeConfigId: 'nonexistent-config',
        });

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(false);
        expect(result.details).toBe('Judge config "nonexistent-config" not found');
      });
    });

    describe('score evaluation', () => {
      it('passes when score meets threshold', async () => {
        const mockJudge = createMockJudgeClient({
          score: 0.85,
          reasoning: 'Good semantic match',
        });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(true);
        expect(result.details).toContain('Judge: PASS');
        expect(result.details).toContain('Score: 0.85 (threshold: 0.7)');
        expect(result.details).toContain('Reasoning: Good semantic match');
      });

      it('fails when score is below threshold', async () => {
        const mockJudge = createMockJudgeClient({
          score: 0.5,
          reasoning: 'Poor match',
        });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(false);
        expect(result.details).toContain('Judge: FAIL');
        expect(result.details).toContain('Score: 0.50 (threshold: 0.7)');
      });

      it('uses pass field when score is undefined', async () => {
        const mockJudge = createMockJudgeClient({ pass: true });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(true);
        expect(result.details).toContain('Score: 1.00');
      });

      it('treats pass=false as score 0 when score is undefined', async () => {
        const mockJudge = createMockJudgeClient({ pass: false });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(false);
        expect(result.details).toContain('Score: 0.00');
      });

      it('respects custom passing threshold', async () => {
        const mockJudge = createMockJudgeClient({ score: 0.9 });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'strict-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(false);
        expect(result.details).toContain('Score: 0.90 (threshold: 0.95)');
      });

      it('uses default threshold of 0.7 when not specified', async () => {
        const configsWithoutThreshold: JudgeConfigs = {
          'no-threshold': {
            rubric: 'Test rubric',
            // passingThreshold not specified
          },
        };
        const mockJudge = createMockJudgeClient({ score: 0.75 });
        const expectation = createJudgeExpectation(configsWithoutThreshold);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'no-threshold' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(true);
        expect(result.details).toContain('threshold: 0.7');
      });
    });

    describe('reference handling', () => {
      it('uses expectedExact as reference when available', async () => {
        const mockJudge = createMockJudgeClient({ score: 0.9 });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({
          judgeConfigId: 'semantic-match',
          expectedExact: 'expected exact value',
        });

        await expectation(context, evalCase, 'response');

        expect(mockJudge.evaluate).toHaveBeenCalledWith(
          'response',
          'expected exact value',
          'Evaluate if the response semantically matches the expected value'
        );
      });

      it('uses config reference when no expectedExact', async () => {
        const mockJudge = createMockJudgeClient({ score: 0.9 });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'with-reference' });

        await expectation(context, evalCase, 'response');

        expect(mockJudge.evaluate).toHaveBeenCalledWith(
          'response',
          'expected output',
          'Compare response against the reference'
        );
      });

      it('passes null as reference when neither is available', async () => {
        const mockJudge = createMockJudgeClient({ score: 0.9 });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        await expectation(context, evalCase, 'response');

        expect(mockJudge.evaluate).toHaveBeenCalledWith(
          'response',
          null,
          'Evaluate if the response semantically matches the expected value'
        );
      });

      it('prioritizes expectedExact over config reference', async () => {
        const mockJudge = createMockJudgeClient({ score: 0.9 });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({
          judgeConfigId: 'with-reference',
          expectedExact: 'override reference',
        });

        await expectation(context, evalCase, 'response');

        expect(mockJudge.evaluate).toHaveBeenCalledWith(
          'response',
          'override reference',
          'Compare response against the reference'
        );
      });
    });

    describe('error handling', () => {
      it('handles evaluation errors gracefully', async () => {
        const mockJudge = {
          evaluate: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')),
        };
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(false);
        expect(result.details).toContain('Judge evaluation failed');
        expect(result.details).toContain('API rate limit exceeded');
      });

      it('handles non-Error exceptions', async () => {
        const mockJudge = {
          evaluate: vi.fn().mockRejectedValue('String error'),
        };
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.pass).toBe(false);
        expect(result.details).toContain('Judge evaluation failed: String error');
      });
    });

    describe('details formatting', () => {
      it('includes reasoning when provided', async () => {
        const mockJudge = createMockJudgeClient({
          score: 0.8,
          reasoning: 'The response matches the expected semantics',
        });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.details).toContain(
          'Reasoning: The response matches the expected semantics'
        );
      });

      it('omits reasoning when not provided', async () => {
        const mockJudge = createMockJudgeClient({ score: 0.8 });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.details).not.toContain('Reasoning:');
      });

      it('formats score to two decimal places', async () => {
        const mockJudge = createMockJudgeClient({ score: 0.333333 });
        const expectation = createJudgeExpectation(judgeConfigs);
        const context = createMockContext(mockJudge);
        const evalCase = createMockEvalCase({ judgeConfigId: 'semantic-match' });

        const result = await expectation(context, evalCase, 'response');

        expect(result.details).toContain('Score: 0.33');
      });
    });
  });
});
