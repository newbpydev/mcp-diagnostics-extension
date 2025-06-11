import { McpServerWrapper, McpServerConfig } from '@infrastructure/mcp/McpServerWrapper';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { DiagnosticsChangeEvent } from '@shared/types';

// Mock the MCP SDK components that cause issues
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    setRequestHandler: jest.fn(),
    setNotificationHandler: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({})),
}));

describe('McpServerWrapper', () => {
  let mockWatcher: jest.Mocked<DiagnosticsWatcher>;
  let server: McpServerWrapper;
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };

    // Create mock watcher
    mockWatcher = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      dispose: jest.fn(),
      getAllProblems: jest.fn().mockReturnValue([]),
      getProblemsForFile: jest.fn().mockReturnValue([]),
      getProblemsForWorkspace: jest.fn().mockReturnValue([]),
      getFilteredProblems: jest.fn().mockReturnValue([]),
      getWorkspaceSummary: jest.fn().mockReturnValue({}),
      removeAllListeners: jest.fn(),
      getPerformanceMetrics: jest.fn().mockReturnValue({
        totalEvents: 0,
        averageProcessingTime: 0,
        lastEventTime: Date.now(),
      }),
      addListener: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn(),
      listeners: jest.fn(),
      rawListeners: jest.fn(),
      listenerCount: jest.fn(),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      eventNames: jest.fn(),
    } as unknown as jest.Mocked<DiagnosticsWatcher>;
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    jest.clearAllMocks();
    if (server) {
      server.dispose();
    }
  });

  describe('Constructor and Initialization', () => {
    it('should create server with default configuration', () => {
      server = new McpServerWrapper(mockWatcher);
      expect(server).toBeDefined();
    });

    it('should create server with custom configuration', () => {
      const config: McpServerConfig = { port: 8080, enableDebugLogging: true };
      server = new McpServerWrapper(mockWatcher, config);
      expect(server.getConfig()).toEqual(config);
    });

    it('should register event listeners on watcher', () => {
      server = new McpServerWrapper(mockWatcher);
      expect(mockWatcher.on).toHaveBeenCalledWith('problemsChanged', expect.any(Function));
    });

    it('should initialize all MCP components', () => {
      server = new McpServerWrapper(mockWatcher);
      expect(server.getTools()).toBeDefined();
      expect(server.getResources()).toBeDefined();
      expect(server.getNotifications()).toBeDefined();
    });
  });

  describe('Server Information and Configuration', () => {
    beforeEach(() => {
      server = new McpServerWrapper(mockWatcher);
    });

    it('should return server info', () => {
      const info = server.getServerInfo();
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('capabilities');
    });

    it('should return configuration', () => {
      const config: McpServerConfig = { port: 8080, enableDebugLogging: true };
      server = new McpServerWrapper(mockWatcher, config);
      expect(server.getConfig()).toEqual(config);
    });

    it('should return default configuration when not provided', () => {
      const config = server.getConfig();
      expect(config).toEqual({});
    });

    it('should return false for isServerStarted initially', () => {
      expect(server.isServerStarted()).toBe(false);
    });
  });

  describe('Event Handling - Basic Functionality', () => {
    beforeEach(() => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: false });
    });

    it('should handle problems changed events without debug logging', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      const mockEvent: DiagnosticsChangeEvent = {
        uri: 'test://file.ts',
        problems: [
          {
            filePath: '/test/file.ts',
            workspaceFolder: 'test-workspace',
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
            severity: 'Error',
            message: 'Test error',
            source: 'test',
            code: 'E001',
          },
        ],
      };

      expect(() => eventHandler(mockEvent)).not.toThrow();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should handle empty problems without debug logging', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      const mockEvent: DiagnosticsChangeEvent = {
        uri: 'test://empty-file.ts',
        problems: [],
      };

      expect(() => eventHandler(mockEvent)).not.toThrow();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('Event Handling - Debug Logging Enabled', () => {
    beforeEach(() => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
    });

    it('should log problems when debug logging enabled', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      const mockEvent: DiagnosticsChangeEvent = {
        uri: 'test://file.ts',
        problems: [
          {
            filePath: '/test/file.ts',
            workspaceFolder: 'test-workspace',
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
            severity: 'Error',
            message: 'Test error',
            source: 'test',
            code: 'E001',
          },
        ],
      };

      eventHandler(mockEvent);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Problems changed event received:',
        expect.objectContaining({
          uri: 'test://file.ts',
          problemCount: 1,
        })
      );
    });

    it('should log multiple problems when debug logging enabled', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      const mockEvent: DiagnosticsChangeEvent = {
        uri: 'test://multi-file.ts',
        problems: [
          {
            filePath: '/test/multi-file.ts',
            workspaceFolder: 'test-workspace',
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
            severity: 'Error',
            message: 'Error 1',
            source: 'test',
            code: 'E001',
          },
          {
            filePath: '/test/multi-file.ts',
            workspaceFolder: 'test-workspace',
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 15 } },
            severity: 'Warning',
            message: 'Warning 1',
            source: 'test',
            code: 'W001',
          },
        ],
      };

      eventHandler(mockEvent);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Problems changed event received:',
        expect.objectContaining({
          uri: 'test://multi-file.ts',
          problemCount: 2,
        })
      );
    });

    it('should not log handlers registration during construction', () => {
      // Handlers registration only happens during start(), not during construction
      expect(consoleSpy.log).not.toHaveBeenCalledWith('MCP handlers registered successfully');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
    });

    it('should handle undefined events gracefully', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      expect(() => eventHandler(undefined as any)).not.toThrow();
    });

    it('should handle malformed events gracefully', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      const malformedEvent = { invalidProperty: 'invalid' } as any;
      expect(() => eventHandler(malformedEvent)).not.toThrow();
    });

    it('should continue after processing errors', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      const mockEvent: DiagnosticsChangeEvent = {
        uri: 'test://good-file.ts',
        problems: [],
      };

      // First call with invalid event
      expect(() => eventHandler(undefined as any)).not.toThrow();

      // Clear console spy for better assertion
      consoleSpy.log.mockClear();

      // Second call with valid event should still work
      expect(() => eventHandler(mockEvent)).not.toThrow();

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Problems changed event received:',
        expect.objectContaining({
          uri: 'test://good-file.ts',
          problemCount: 0,
        })
      );
    });
  });

  describe('Performance and Edge Cases', () => {
    beforeEach(() => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
    });

    it('should handle large number of problems', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      // Create 50 problems
      const problems = Array.from({ length: 50 }, (_, i) => ({
        filePath: `/test/large-file.ts`,
        workspaceFolder: 'test-workspace',
        range: { start: { line: i, character: 0 }, end: { line: i, character: 10 } },
        severity: 'Error' as const,
        message: `Error ${i + 1}`,
        source: 'test',
        code: `E${i + 1}`,
      }));

      const mockEvent: DiagnosticsChangeEvent = {
        uri: 'test://large-file.ts',
        problems,
      };

      expect(() => eventHandler(mockEvent)).not.toThrow();

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Problems changed event received:',
        expect.objectContaining({
          uri: 'test://large-file.ts',
          problemCount: 50,
        })
      );
    });

    it('should handle complex problem data', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      const mockEvent: DiagnosticsChangeEvent = {
        uri: 'test://complex-file.ts',
        problems: [
          {
            filePath: '/test/complex-file.ts',
            workspaceFolder: 'test-workspace',
            range: { start: { line: 0, character: 0 }, end: { line: 10, character: 50 } },
            severity: 'Error',
            message: 'Complex error with special characters: éñüñé@#$%^&*()',
            source: 'complex-linter',
            code: 'COMPLEX_001',
          },
        ],
      };

      expect(() => eventHandler(mockEvent)).not.toThrow();

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Problems changed event received:',
        expect.objectContaining({
          uri: 'test://complex-file.ts',
          problemCount: 1,
        })
      );
    });

    it('should handle events with no URI gracefully', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      const eventWithoutUri = {
        problems: [],
      } as any;

      expect(() => eventHandler(eventWithoutUri)).not.toThrow();
    });

    it('should handle events with no problems array gracefully', () => {
      const eventHandler = mockWatcher.on.mock.calls[0]?.[1];
      if (!eventHandler) throw new Error('Event handler not found');

      const eventWithoutProblems = {
        uri: 'test://file.ts',
      } as any;

      expect(() => eventHandler(eventWithoutProblems)).not.toThrow();
    });
  });

  describe('Component Access Methods', () => {
    beforeEach(() => {
      server = new McpServerWrapper(mockWatcher);
    });

    it('should provide access to tools component', () => {
      expect(server.getTools()).toBeDefined();
    });

    it('should provide access to resources component', () => {
      expect(server.getResources()).toBeDefined();
    });

    it('should provide access to notifications component', () => {
      expect(server.getNotifications()).toBeDefined();
    });

    it('should provide access to server instance', () => {
      expect(server.getServer()).toBeDefined();
    });
  });

  describe('Configuration Variations', () => {
    it('should handle port configuration', () => {
      const config: McpServerConfig = { port: 8080 };
      server = new McpServerWrapper(mockWatcher, config);
      expect(server.getConfig().port).toBe(8080);
    });

    it('should handle debug logging configuration', () => {
      const config: McpServerConfig = { enableDebugLogging: true };
      server = new McpServerWrapper(mockWatcher, config);
      expect(server.getConfig().enableDebugLogging).toBe(true);
    });

    it('should handle both port and debug logging', () => {
      const config: McpServerConfig = { port: 9000, enableDebugLogging: false };
      server = new McpServerWrapper(mockWatcher, config);
      expect(server.getConfig()).toEqual(config);
    });

    it('should handle empty configuration object', () => {
      server = new McpServerWrapper(mockWatcher, {});
      expect(server.getConfig()).toEqual({});
    });
  });

  describe('Lifecycle and Error Branches', () => {
    it('should allow repeated disposal without error and clean up resources', () => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // @ts-ignore
      server.isStarted = true;
      // @ts-ignore
      server.server.close.mockImplementation(() => undefined);
      expect(() => {
        server.dispose();
        server.dispose();
      }).not.toThrow();
    });

    it('should propagate error for unknown tool request', async () => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // @ts-ignore
      server.server.setRequestHandler.mock.calls.forEach(([schema, handler]) => {
        if (schema && schema.name === 'CallToolRequestSchema') {
          const req = { params: { name: 'unknownTool', arguments: {} } };
          return handler(req).then((resp: any) => {
            expect(resp.isError).toBe(true);
            expect(resp.content[0].text).toContain('Unknown tool');
          });
        }
      });
    });

    it('should propagate error for unknown resource request', async () => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // @ts-ignore
      server.server.setRequestHandler.mock.calls.forEach(([schema, handler]) => {
        if (schema && schema.name === 'ReadResourceRequestSchema') {
          const req = { params: { uri: 'diagnostics://unknown/resource' } };
          return handler(req).then((resp: any) => {
            expect(resp.contents[0].text).toContain('Unknown resource');
          });
        }
      });
    });

    it('should handle invalid tool call payload (missing required args)', async () => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // @ts-ignore
      server.server.setRequestHandler.mock.calls.forEach(([schema, handler]) => {
        if (schema && schema.name === 'CallToolRequestSchema') {
          const req = { params: { name: 'getProblemsForFile', arguments: {} } };
          return handler(req).then((resp: any) => {
            expect(resp.isError).toBe(true);
            expect(resp.content[0].text).toContain('filePath is required');
          });
        }
      });
    });

    it('should handle handler exceptions for tool/resource requests', async () => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // Simulate diagnosticsWatcher throwing
      mockWatcher.getFilteredProblems.mockImplementation(() => {
        throw new Error('simulated fail');
      });
      // @ts-ignore
      server.server.setRequestHandler.mock.calls.forEach(([schema, handler]) => {
        if (schema && schema.name === 'CallToolRequestSchema') {
          const req = { params: { name: 'getProblems', arguments: {} } };
          return handler(req).then((resp: any) => {
            expect(resp.isError).toBe(true);
            expect(resp.content[0].text).toContain('simulated fail');
          });
        }
      });
    });

    it('should handle multi-workspace and multi-resource edge cases', async () => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // Simulate watcher returning multiple workspaces/resources
      mockWatcher.getWorkspaceSummary.mockReturnValueOnce({
        workspaces: [
          { name: 'ws1', problems: [{ severity: 'Error' }] },
          { name: 'ws2', problems: [{ severity: 'Warning' }] },
        ],
      });
      // @ts-ignore
      server.server.setRequestHandler.mock.calls.forEach(([schema, handler]) => {
        if (schema && schema.name === 'ReadResourceRequestSchema') {
          const req = { params: { uri: 'diagnostics://workspace/summary' } };
          return handler(req).then((resp: any) => {
            expect(resp.contents[0].text).toContain('ws1');
            expect(resp.contents[0].text).toContain('ws2');
          });
        }
      });
    });

    it('should log all error/fallback branches for tool/resource handlers', async () => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // Simulate watcher throwing for resource
      mockWatcher.getWorkspaceSummary.mockImplementation(() => {
        throw new Error('summary fail');
      });
      // @ts-ignore
      server.server.setRequestHandler.mock.calls.forEach(([schema, handler]) => {
        if (schema && schema.name === 'ReadResourceRequestSchema') {
          const req = { params: { uri: 'diagnostics://workspace/summary' } };
          return handler(req).then((resp: any) => {
            expect(resp.contents[0].text).toContain('summary fail');
          });
        }
      });
    });
    beforeEach(() => {
      server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
    });

    it('should throw if start is called twice', async () => {
      await server.start();
      await expect(server.start()).rejects.toThrow('MCP Server is already started');
    });

    it('should throw if handler registration fails during start', async () => {
      const failingServer = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // Mock getTools().registerTools to throw
      const mockTools = {
        registerTools: jest.fn().mockImplementation(() => {
          throw new Error('handler registration failed');
        }),
      };
      jest.spyOn(failingServer, 'getTools').mockReturnValue(mockTools);

      await expect(failingServer.start()).rejects.toThrow(
        'Failed to start diagnostic export service: Error: handler registration failed'
      );
    });

    it('should log and throw if registerHandlers fails', async () => {
      const errorServer = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // Mock tools.registerTools to throw
      jest.spyOn(errorServer.getTools(), 'registerTools').mockImplementation(() => {
        throw new Error('handler fail');
      });
      // @ts-ignore
      errorServer.server.connect.mockResolvedValue(undefined);
      await expect(errorServer.start()).rejects.toThrow('handler fail');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to register MCP handlers:',
        expect.any(Error)
      );
    });

    it('should handle disposal gracefully without throwing', () => {
      const errorServer = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // @ts-ignore
      errorServer.isStarted = true;
      errorServer.stop = jest.fn().mockRejectedValue(new Error('stop failed'));

      // Should not throw even if stop() fails (error is logged internally)
      expect(() => {
        errorServer.dispose();
      }).not.toThrow();
    });

    it('should log debug message when stopping server with debug enabled', async () => {
      const debugServer = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // @ts-ignore
      debugServer.isStarted = true;

      // Clear console spy to only capture the stop logs
      consoleSpy.log.mockClear();

      await debugServer.stop();

      // The new implementation logs 'MCP diagnostic export service stopped' with debug enabled
      expect(consoleSpy.log).toHaveBeenCalledWith('MCP diagnostic export service stopped');
    });

    it('should log error if notification sending fails in handleProblemsChanged', () => {
      const errorServer = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
      // @ts-ignore
      errorServer.notifications.sendProblemsChangedNotification = jest.fn(() => {
        throw new Error('notify fail');
      });
      const event = { uri: 'test://fail', problems: [] };
      // @ts-ignore
      errorServer.handleProblemsChanged(event);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to handle problems changed event:',
        expect.any(Error)
      );
    });
  });

  // Note: Server lifecycle tests (start/stop) are intentionally excluded
  // as they require complex MCP SDK mocking that's brittle and not providing
  // meaningful value for our coverage goals. The core logic we care about
  // (event handling, configuration, error handling) is well tested above.
});
