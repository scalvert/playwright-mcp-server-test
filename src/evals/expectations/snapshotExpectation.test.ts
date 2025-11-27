import { describe, it, expect, vi } from 'vitest';
import { createSnapshotExpectation } from './snapshotExpectation.js';
import type { EvalCase } from '../datasetTypes.js';
import type { EvalExpectationContext } from '../evalRunner.js';
import type { MCPFixtureApi } from '../../mcp/fixtures/mcpFixture.js';

function createMockMCP(): MCPFixtureApi {
  return {
    client: {} as MCPFixtureApi['client'],
    getServerInfo: vi.fn(),
    listTools: vi.fn(),
    callTool: vi.fn(),
  };
}

function createContext(options: {
  expectFn?: (value: unknown) => { toMatchSnapshot: (name: string) => Promise<void> };
}): EvalExpectationContext {
  return {
    mcp: createMockMCP(),
    expect: options.expectFn as unknown as EvalExpectationContext['expect'],
  };
}

function createEvalCase(overrides: Partial<EvalCase> = {}): EvalCase {
  return {
    id: 'test-case',
    toolName: 'test-tool',
    args: {},
    ...overrides,
  };
}

describe('createSnapshotExpectation', () => {
  describe('when no expectedSnapshot defined', () => {
    it('should skip and return pass true', async () => {
      const expectation = createSnapshotExpectation();
      const context = createContext({});
      const evalCase = createEvalCase({ expectedSnapshot: undefined });

      const result = await expectation(context, evalCase, 'response');

      expect(result.pass).toBe(true);
      expect(result.details).toContain('No expectedSnapshot defined');
    });
  });

  describe('when expect function is missing', () => {
    it('should fail with helpful message', async () => {
      const expectation = createSnapshotExpectation();
      const context = createContext({ expectFn: undefined });
      const evalCase = createEvalCase({ expectedSnapshot: 'my-snapshot' });

      const result = await expectation(context, evalCase, 'response');

      expect(result.pass).toBe(false);
      expect(result.details).toContain('expect function in context');
    });
  });

  describe('snapshot matching', () => {
    it('should pass when snapshot matches', async () => {
      const mockToMatchSnapshot = vi.fn().mockResolvedValue(undefined);
      const mockExpect = vi.fn().mockReturnValue({
        toMatchSnapshot: mockToMatchSnapshot,
      });

      const expectation = createSnapshotExpectation();
      const context = createContext({ expectFn: mockExpect });
      const evalCase = createEvalCase({ expectedSnapshot: 'my-snapshot' });

      const result = await expectation(context, evalCase, 'response data');

      expect(result.pass).toBe(true);
      expect(result.details).toContain('matches snapshot');
      expect(result.details).toContain('my-snapshot');
      expect(mockExpect).toHaveBeenCalledWith('response data');
      expect(mockToMatchSnapshot).toHaveBeenCalledWith('my-snapshot');
    });

    it('should fail when snapshot mismatches', async () => {
      const mockToMatchSnapshot = vi.fn().mockRejectedValue(
        new Error('Snapshot mismatch: expected "abc" but got "xyz"')
      );
      const mockExpect = vi.fn().mockReturnValue({
        toMatchSnapshot: mockToMatchSnapshot,
      });

      const expectation = createSnapshotExpectation();
      const context = createContext({ expectFn: mockExpect });
      const evalCase = createEvalCase({ expectedSnapshot: 'my-snapshot' });

      const result = await expectation(context, evalCase, 'response');

      expect(result.pass).toBe(false);
      expect(result.details).toContain('Snapshot mismatch');
    });

    it('should handle non-Error throws', async () => {
      const mockToMatchSnapshot = vi.fn().mockRejectedValue('string error');
      const mockExpect = vi.fn().mockReturnValue({
        toMatchSnapshot: mockToMatchSnapshot,
      });

      const expectation = createSnapshotExpectation();
      const context = createContext({ expectFn: mockExpect });
      const evalCase = createEvalCase({ expectedSnapshot: 'my-snapshot' });

      const result = await expectation(context, evalCase, 'response');

      expect(result.pass).toBe(false);
      expect(result.details).toContain('Snapshot expectation failed');
    });
  });

  describe('response normalization', () => {
    it('should extract content from structuredContent format', async () => {
      const mockToMatchSnapshot = vi.fn().mockResolvedValue(undefined);
      const mockExpect = vi.fn().mockReturnValue({
        toMatchSnapshot: mockToMatchSnapshot,
      });

      const expectation = createSnapshotExpectation();
      const context = createContext({ expectFn: mockExpect });
      const evalCase = createEvalCase({ expectedSnapshot: 'test-snapshot' });

      const response = { content: 'extracted text content' };
      await expectation(context, evalCase, response);

      expect(mockExpect).toHaveBeenCalledWith('extracted text content');
    });

    it('should extract text from MCP array format', async () => {
      const mockToMatchSnapshot = vi.fn().mockResolvedValue(undefined);
      const mockExpect = vi.fn().mockReturnValue({
        toMatchSnapshot: mockToMatchSnapshot,
      });

      const expectation = createSnapshotExpectation();
      const context = createContext({ expectFn: mockExpect });
      const evalCase = createEvalCase({ expectedSnapshot: 'test-snapshot' });

      const response = [
        { type: 'text', text: 'First line' },
        { type: 'text', text: 'Second line' },
      ];
      await expectation(context, evalCase, response);

      expect(mockExpect).toHaveBeenCalledWith('First line\nSecond line');
    });

    it('should filter out non-text content blocks', async () => {
      const mockToMatchSnapshot = vi.fn().mockResolvedValue(undefined);
      const mockExpect = vi.fn().mockReturnValue({
        toMatchSnapshot: mockToMatchSnapshot,
      });

      const expectation = createSnapshotExpectation();
      const context = createContext({ expectFn: mockExpect });
      const evalCase = createEvalCase({ expectedSnapshot: 'test-snapshot' });

      const response = [
        { type: 'text', text: 'Hello' },
        { type: 'image', data: 'base64...' },
        { type: 'text', text: 'World' },
      ];
      await expectation(context, evalCase, response);

      expect(mockExpect).toHaveBeenCalledWith('Hello\nWorld');
    });

    it('should pass through raw response when no text extracted from array', async () => {
      const mockToMatchSnapshot = vi.fn().mockResolvedValue(undefined);
      const mockExpect = vi.fn().mockReturnValue({
        toMatchSnapshot: mockToMatchSnapshot,
      });

      const expectation = createSnapshotExpectation();
      const context = createContext({ expectFn: mockExpect });
      const evalCase = createEvalCase({ expectedSnapshot: 'test-snapshot' });

      const response = [{ type: 'image', data: 'base64...' }];
      await expectation(context, evalCase, response);

      // Original array is passed through since no text content found
      expect(mockExpect).toHaveBeenCalledWith(response);
    });

    it('should handle empty array', async () => {
      const mockToMatchSnapshot = vi.fn().mockResolvedValue(undefined);
      const mockExpect = vi.fn().mockReturnValue({
        toMatchSnapshot: mockToMatchSnapshot,
      });

      const expectation = createSnapshotExpectation();
      const context = createContext({ expectFn: mockExpect });
      const evalCase = createEvalCase({ expectedSnapshot: 'test-snapshot' });

      const response: unknown[] = [];
      await expectation(context, evalCase, response);

      expect(mockExpect).toHaveBeenCalledWith(response);
    });

    it('should pass primitives through unchanged', async () => {
      const mockToMatchSnapshot = vi.fn().mockResolvedValue(undefined);
      const mockExpect = vi.fn().mockReturnValue({
        toMatchSnapshot: mockToMatchSnapshot,
      });

      const expectation = createSnapshotExpectation();
      const context = createContext({ expectFn: mockExpect });
      const evalCase = createEvalCase({ expectedSnapshot: 'test-snapshot' });

      await expectation(context, evalCase, 'plain string');
      expect(mockExpect).toHaveBeenCalledWith('plain string');

      await expectation(context, evalCase, 42);
      expect(mockExpect).toHaveBeenCalledWith(42);

      await expectation(context, evalCase, null);
      expect(mockExpect).toHaveBeenCalledWith(null);
    });
  });
});
