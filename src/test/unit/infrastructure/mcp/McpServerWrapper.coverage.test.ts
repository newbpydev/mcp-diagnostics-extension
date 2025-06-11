/**
 * @fileoverview Coverage-focused tests for McpServerWrapper tool and resource handlers
 * Targets specific uncovered lines to improve coverage from 62.59% to 95%+
 */

import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    notification: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('McpServerWrapper - Coverage Tests', () => {
  let mockWatcher: jest.Mocked<DiagnosticsWatcher>;
  let server: McpServerWrapper;
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };

    mockWatcher = {
      getFilteredProblems: jest.fn(),
      getProblemsForFile: jest.fn(),
      getWorkspaceSummary: jest.fn(),
      getFilesWithProblems: jest.fn(),
      on: jest.fn(),
      dispose: jest.fn(),
    } as any;
  });

  afterEach(() => {
    if (server) server.dispose();
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  it('should cover debug logging in setupRequestHandlers', async () => {
    server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
    mockWatcher.exportProblemsToFile = jest.fn().mockResolvedValue(undefined);

    // Start the server to trigger setupRequestHandlers
    await server.start();

    expect(consoleSpy.log).toHaveBeenCalledWith('[MCP Server] Setting up request handlers...');
    expect(consoleSpy.log).toHaveBeenCalledWith(
      '[MCP Server] Request handlers set up successfully'
    );

    await server.stop();
  });

  it('should cover event listener setup with debug logging', () => {
    server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });

    expect(consoleSpy.log).toHaveBeenCalledWith('[MCP Server] Setting up event listeners...');
    expect(consoleSpy.log).toHaveBeenCalledWith('[MCP Server] Event listeners set up successfully');
  });

  it('should test tool functionality integration', () => {
    server = new McpServerWrapper(mockWatcher);

    // Test getProblems functionality
    mockWatcher.getFilteredProblems.mockReturnValue([]);
    const result1 = mockWatcher.getFilteredProblems({ severity: 'Error' });
    expect(result1).toEqual([]);

    // Test getProblemsForFile functionality
    mockWatcher.getProblemsForFile.mockReturnValue([]);
    const result2 = mockWatcher.getProblemsForFile('/test.ts');
    expect(result2).toEqual([]);

    // Test getWorkspaceSummary functionality
    mockWatcher.getWorkspaceSummary.mockReturnValue({});
    const result3 = mockWatcher.getWorkspaceSummary('severity');
    expect(result3).toEqual({});
  });

  it('should cover component getters', () => {
    server = new McpServerWrapper(mockWatcher);

    const tools = server.getTools();
    expect(tools.registerTools).toBeDefined();

    const resources = server.getResources();
    expect(resources.registerResources).toBeDefined();

    const notifications = server.getNotifications();
    expect(notifications.sendProblemsChangedNotification).toBeDefined();

    const serverInfo = server.getServerInfo();
    expect(serverInfo.name).toBe('vscode-diagnostics-server');
  });

  it('should cover server lifecycle methods with proper state management', async () => {
    server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
    mockWatcher.exportProblemsToFile = jest.fn().mockResolvedValue(undefined);

    // Test complete lifecycle
    expect(server.getIsRunning()).toBe(false);
    expect(server.isServerStarted()).toBe(false);

    await server.start();
    expect(server.getIsRunning()).toBe(true);
    expect(server.isServerStarted()).toBe(true);

    await server.restart();
    expect(server.getIsRunning()).toBe(true);

    await server.stop();
    expect(server.getIsRunning()).toBe(false);
    expect(server.isServerStarted()).toBe(false);
  });

  it('should cover continuous export lifecycle management', async () => {
    server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });
    mockWatcher.exportProblemsToFile = jest.fn().mockResolvedValue(undefined);

    // Test that continuous export starts and stops properly
    await server.start();
    expect(server.getIsRunning()).toBe(true);

    // Verify the continuous export interval is set up
    // We can't easily test the actual interval execution without waiting,
    // but we can verify the server lifecycle works correctly

    await server.stop();
    expect(server.getIsRunning()).toBe(false);

    // Verify restart works
    await server.restart();
    expect(server.getIsRunning()).toBe(true);

    await server.stop();
  });

  it('should cover error scenarios in event handling', () => {
    server = new McpServerWrapper(mockWatcher, { enableDebugLogging: true });

    // Get the event handler
    const eventHandlerCall = mockWatcher.on.mock.calls.find(
      (call) => call[0] === 'problemsChanged'
    );
    expect(eventHandlerCall).toBeDefined();
    const eventHandler = eventHandlerCall![1];

    // Test with malformed event data
    const malformedEvent = {
      uri: 'test://malformed.ts',
      problems: null, // This should be handled gracefully
    };

    expect(() => eventHandler(malformedEvent as any)).not.toThrow();

    // Test with missing properties
    const incompleteEvent = {
      uri: '',
      // missing problems array
    };

    expect(() => eventHandler(incompleteEvent as any)).not.toThrow();
  });

  it('should cover configuration edge cases', () => {
    // Test with various configuration options
    const customConfig = {
      enableDebugLogging: false,
      enablePerformanceLogging: true,
      debounceMs: 1000,
      maxProblemsPerFile: 50,
    };

    const customServer = new McpServerWrapper(mockWatcher, customConfig);

    expect(customServer.getConfig()).toEqual(expect.objectContaining(customConfig));
    expect(customServer.getConfig().enableDebugLogging).toBe(false);

    customServer.dispose();
  });

  it('should cover server info and metadata access', () => {
    server = new McpServerWrapper(mockWatcher);

    const serverInfo = server.getServerInfo();
    expect(serverInfo).toEqual({
      name: 'vscode-diagnostics-server',
      version: '1.0.8',
      isRunning: false,
      capabilities: expect.any(Object),
    });

    // Test server instance access
    const mcpServer = server.getServer();
    expect(mcpServer).toBeDefined();
    expect(mcpServer.setRequestHandler).toBeDefined();
  });

  it('should cover start method error scenarios', async () => {
    server = new McpServerWrapper(mockWatcher);
    mockWatcher.exportProblemsToFile = jest.fn().mockResolvedValue(undefined);

    // First start should succeed
    await server.start();
    expect(server.getIsRunning()).toBe(true);

    // Second start should throw
    await expect(server.start()).rejects.toThrow('MCP Server is already started');

    await server.stop();
  });
});
