import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to define mocks that can be used in vi.mock factories
const mocks = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockClose: vi.fn(),
  mockGetServerVersion: vi.fn(),
  MockClient: vi.fn(),
  MockStdioClientTransport: vi.fn(),
  MockStreamableHTTPClientTransport: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: mocks.MockClient,
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: mocks.MockStdioClientTransport,
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: mocks.MockStreamableHTTPClientTransport,
}));

import { createMCPClientForConfig, closeMCPClient } from './clientFactory.js';

describe('clientFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up mock implementations
    mocks.mockConnect.mockResolvedValue(undefined);
    mocks.mockClose.mockResolvedValue(undefined);
    mocks.mockGetServerVersion.mockReturnValue({ name: 'test-server', version: '1.0.0' });
    mocks.MockClient.mockImplementation(() => ({
      connect: mocks.mockConnect,
      close: mocks.mockClose,
      getServerVersion: mocks.mockGetServerVersion,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMCPClientForConfig', () => {
    describe('stdio transport', () => {
      it('creates client with stdio transport', async () => {
        const config = {
          transport: 'stdio' as const,
          command: 'node',
          args: ['server.js'],
        };

        await createMCPClientForConfig(config);

        expect(mocks.MockClient).toHaveBeenCalledWith(
          {
            name: '@mcp-testing/server-tester',
            version: '0.1.0',
          },
          {
            capabilities: {},
          }
        );
        expect(mocks.MockStdioClientTransport).toHaveBeenCalledWith({
          command: 'node',
          args: ['server.js'],
        });
        expect(mocks.mockConnect).toHaveBeenCalled();
      });

      it('creates client with cwd option', async () => {
        const config = {
          transport: 'stdio' as const,
          command: 'node',
          args: ['server.js'],
          cwd: '/path/to/server',
        };

        await createMCPClientForConfig(config);

        expect(mocks.MockStdioClientTransport).toHaveBeenCalledWith({
          command: 'node',
          args: ['server.js'],
          cwd: '/path/to/server',
        });
      });

      it('creates client with quiet mode', async () => {
        const config = {
          transport: 'stdio' as const,
          command: 'node',
          args: ['server.js'],
          quiet: true,
        };

        await createMCPClientForConfig(config);

        expect(mocks.MockStdioClientTransport).toHaveBeenCalledWith({
          command: 'node',
          args: ['server.js'],
          stderr: 'ignore',
        });
      });

      it('creates client with empty args array when not provided', async () => {
        const config = {
          transport: 'stdio' as const,
          command: 'node',
        };

        await createMCPClientForConfig(config);

        expect(mocks.MockStdioClientTransport).toHaveBeenCalledWith({
          command: 'node',
          args: [],
        });
      });
    });

    describe('http transport', () => {
      it('creates client with http transport', async () => {
        const config = {
          transport: 'http' as const,
          serverUrl: 'http://localhost:3000/mcp',
        };

        await createMCPClientForConfig(config);

        expect(mocks.MockClient).toHaveBeenCalled();
        expect(mocks.MockStreamableHTTPClientTransport).toHaveBeenCalledWith(
          new URL('http://localhost:3000/mcp'),
          { requestInit: undefined }
        );
        expect(mocks.mockConnect).toHaveBeenCalled();
      });

      it('creates client with http headers', async () => {
        const config = {
          transport: 'http' as const,
          serverUrl: 'http://localhost:3000/mcp',
          headers: {
            Authorization: 'Bearer token123',
            'X-Custom-Header': 'value',
          },
        };

        await createMCPClientForConfig(config);

        expect(mocks.MockStreamableHTTPClientTransport).toHaveBeenCalledWith(
          new URL('http://localhost:3000/mcp'),
          {
            requestInit: {
              headers: {
                Authorization: 'Bearer token123',
                'X-Custom-Header': 'value',
              },
            },
          }
        );
      });
    });

    describe('client info', () => {
      it('uses default client info when not provided', async () => {
        await createMCPClientForConfig({
          transport: 'stdio' as const,
          command: 'node',
        });

        expect(mocks.MockClient).toHaveBeenCalledWith(
          {
            name: '@mcp-testing/server-tester',
            version: '0.1.0',
          },
          expect.anything()
        );
      });

      it('uses custom client info when provided', async () => {
        await createMCPClientForConfig(
          {
            transport: 'stdio' as const,
            command: 'node',
          },
          {
            name: 'my-custom-client',
            version: '2.0.0',
          }
        );

        expect(mocks.MockClient).toHaveBeenCalledWith(
          {
            name: 'my-custom-client',
            version: '2.0.0',
          },
          expect.anything()
        );
      });

      it('uses partial custom client info', async () => {
        await createMCPClientForConfig(
          {
            transport: 'stdio' as const,
            command: 'node',
          },
          {
            name: 'my-custom-client',
          }
        );

        expect(mocks.MockClient).toHaveBeenCalledWith(
          {
            name: 'my-custom-client',
            version: '0.1.0',
          },
          expect.anything()
        );
      });
    });

    describe('capabilities', () => {
      it('passes capabilities to client', async () => {
        await createMCPClientForConfig({
          transport: 'stdio' as const,
          command: 'node',
          capabilities: {
            roots: { listChanged: true },
          },
        });

        expect(mocks.MockClient).toHaveBeenCalledWith(expect.anything(), {
          capabilities: {
            roots: { listChanged: true },
          },
        });
      });
    });

    describe('validation errors', () => {
      it('throws on invalid stdio config (missing command)', async () => {
        const config = {
          transport: 'stdio' as const,
        };

        await expect(
          createMCPClientForConfig(config as Parameters<typeof createMCPClientForConfig>[0])
        ).rejects.toThrow();
      });

      it('throws on invalid http config (missing serverUrl)', async () => {
        const config = {
          transport: 'http' as const,
        };

        await expect(
          createMCPClientForConfig(config as Parameters<typeof createMCPClientForConfig>[0])
        ).rejects.toThrow();
      });

      it('throws on invalid http config (invalid URL)', async () => {
        const config = {
          transport: 'http' as const,
          serverUrl: 'not-a-valid-url',
        };

        await expect(createMCPClientForConfig(config)).rejects.toThrow();
      });
    });

    describe('debug logging', () => {
      it('logs debug info for stdio when debugLogging is enabled', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        await createMCPClientForConfig({
          transport: 'stdio' as const,
          command: 'node',
          args: ['server.js'],
          cwd: '/path/to/server',
          debugLogging: true,
        });

        expect(consoleSpy).toHaveBeenCalledWith('[MCP] Connecting via stdio:', {
          command: 'node',
          args: ['server.js'],
          cwd: '/path/to/server',
        });
        expect(consoleSpy).toHaveBeenCalledWith('[MCP] Connected successfully');
        expect(consoleSpy).toHaveBeenCalledWith('[MCP] Server info:', {
          name: 'test-server',
          version: '1.0.0',
        });

        consoleSpy.mockRestore();
      });

      it('logs debug info for http when debugLogging is enabled', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        await createMCPClientForConfig({
          transport: 'http' as const,
          serverUrl: 'http://localhost:3000/mcp',
          headers: { Authorization: 'Bearer token' },
          debugLogging: true,
        });

        expect(consoleSpy).toHaveBeenCalledWith('[MCP] Connecting via HTTP:', {
          serverUrl: 'http://localhost:3000/mcp',
          headers: ['Authorization'],
        });
        expect(consoleSpy).toHaveBeenCalledWith('[MCP] Connected successfully');

        consoleSpy.mockRestore();
      });
    });
  });

  describe('closeMCPClient', () => {
    it('closes client successfully', async () => {
      const mockClient = {
        close: vi.fn().mockResolvedValue(undefined),
      };

      await closeMCPClient(mockClient as unknown as Parameters<typeof closeMCPClient>[0]);

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('throws and logs error when close fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const closeError = new Error('Close failed');
      const mockClient = {
        close: vi.fn().mockRejectedValue(closeError),
      };

      await expect(
        closeMCPClient(mockClient as unknown as Parameters<typeof closeMCPClient>[0])
      ).rejects.toThrow('Close failed');

      expect(errorSpy).toHaveBeenCalledWith('[MCP] Error closing client:', closeError);

      errorSpy.mockRestore();
    });
  });
});
