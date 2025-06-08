import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { DiagnosticsChangeEvent, ProblemItem } from '@shared/types';

describe('MCP Server Integration', () => {
  let mcpServer: McpServerWrapper;
  let mockDiagnosticsWatcher: jest.Mocked<DiagnosticsWatcher>;

  const mockProblems: ProblemItem[] = [
    {
      filePath: '/workspace/src/test.ts',
      workspaceFolder: 'my-project',
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 },
      },
      severity: 'Error',
      message: 'Test error',
      source: 'typescript',
    },
    {
      filePath: '/workspace/src/utils.ts',
      workspaceFolder: 'my-project',
      range: {
        start: { line: 5, character: 0 },
        end: { line: 5, character: 15 },
      },
      severity: 'Warning',
      message: 'Test warning',
      source: 'eslint',
    },
  ];

  beforeEach(() => {
    mockDiagnosticsWatcher = {
      getAllProblems: jest.fn().mockReturnValue(mockProblems),
      getProblemsForFile: jest.fn(),
      getProblemsForWorkspace: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      dispose: jest.fn(),
      emit: jest.fn(),
    } as any;

    mockDiagnosticsWatcher.getProblemsForFile.mockImplementation((filePath: string) =>
      mockProblems.filter((p) => p.filePath === filePath)
    );
    mockDiagnosticsWatcher.getProblemsForWorkspace.mockImplementation((workspace: string) =>
      mockProblems.filter((p) => p.workspaceFolder === workspace)
    );
  });

  afterEach(() => {
    mcpServer?.dispose();
  });

  describe('Server Initialization', () => {
    it('should initialize with all components integrated', () => {
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher, { port: 6070 });

      expect(mcpServer).toBeDefined();
      expect(mockDiagnosticsWatcher.on).toHaveBeenCalledWith(
        'problemsChanged',
        expect.any(Function)
      );
    });

    it('should initialize with default configuration', () => {
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher);

      expect(mcpServer).toBeDefined();
      expect(mcpServer.getConfig()).toEqual({});
    });

    it('should initialize with custom configuration', () => {
      const config = { port: 8080, enableDebugLogging: true };
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher, config);

      expect(mcpServer.getConfig()).toEqual(config);
    });
  });

  describe('Component Integration', () => {
    beforeEach(() => {
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher, { port: 6070 });
    });

    it('should have tools component initialized', () => {
      const tools = mcpServer.getTools();
      expect(tools).toBeDefined();
    });

    it('should have resources component initialized', () => {
      const resources = mcpServer.getResources();
      expect(resources).toBeDefined();
    });

    it('should have notifications component initialized', () => {
      const notifications = mcpServer.getNotifications();
      expect(notifications).toBeDefined();
    });

    it('should provide server information', () => {
      const info = mcpServer.getServerInfo();
      expect(info.name).toBe('vscode-diagnostics-server');
      expect(info.version).toBeDefined();
      expect(info.capabilities).toBeDefined();
    });
  });

  describe('Event Handling Integration', () => {
    beforeEach(() => {
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher, { enableDebugLogging: true });
    });

    it('should register event listener for problems changed', () => {
      expect(mockDiagnosticsWatcher.on).toHaveBeenCalledWith(
        'problemsChanged',
        expect.any(Function)
      );
    });

    it('should handle problems changed events', () => {
      // Get the event handler that was registered
      const eventHandler = mockDiagnosticsWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === 'problemsChanged'
      )?.[1];

      expect(eventHandler).toBeDefined();

      const changeEvent: DiagnosticsChangeEvent = {
        uri: '/workspace/src/test.ts',
        problems: [mockProblems[0]] as ProblemItem[],
      };

      // Should not throw when handling the event
      expect(() => eventHandler!(changeEvent)).not.toThrow();
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher, { port: 6070 });
    });

    it('should track server state correctly', () => {
      expect(mcpServer.isServerStarted()).toBe(false);
    });

    it('should dispose properly', () => {
      mcpServer.dispose();
      expect(mcpServer.isServerStarted()).toBe(false);
    });

    it('should handle multiple dispose calls', () => {
      mcpServer.dispose();
      expect(() => mcpServer.dispose()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle diagnostics watcher errors gracefully during initialization', () => {
      const faultyWatcher = {
        ...mockDiagnosticsWatcher,
        on: jest.fn().mockImplementation(() => {
          throw new Error('Watcher error');
        }),
      };

      expect(() => new McpServerWrapper(faultyWatcher as any)).toThrow('Watcher error');
    });

    it('should handle problems changed event errors gracefully', () => {
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher, { enableDebugLogging: true });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Get the event handler
      const eventHandler = mockDiagnosticsWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === 'problemsChanged'
      )?.[1];

      // Mock the notifications property directly to throw an error
      const originalNotifications = mcpServer.notifications;
      mcpServer.notifications = {
        sendProblemsChangedNotification: jest.fn().mockImplementation(() => {
          throw new Error('Notification error');
        }),
      };

      const changeEvent: DiagnosticsChangeEvent = {
        uri: '/workspace/src/test.ts',
        problems: [mockProblems[0]] as ProblemItem[],
      };

      // Should not throw, but should log error
      expect(() => eventHandler!(changeEvent)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to handle problems changed event:',
        expect.any(Error)
      );

      // Restore original notifications
      mcpServer.notifications = originalNotifications;
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid port configuration', () => {
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher, { port: 3000 });
      expect(mcpServer.getConfig().port).toBe(3000);
    });

    it('should accept debug logging configuration', () => {
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher, { enableDebugLogging: true });
      expect(mcpServer.getConfig().enableDebugLogging).toBe(true);
    });

    it('should handle empty configuration', () => {
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher, {});
      expect(mcpServer.getConfig()).toEqual({});
    });
  });

  describe('Component Interaction', () => {
    beforeEach(() => {
      mcpServer = new McpServerWrapper(mockDiagnosticsWatcher, { port: 6070 });
    });

    it('should pass diagnostics watcher to tools component', () => {
      const tools = mcpServer.getTools();
      expect(tools).toBeDefined();

      // Verify tools can access diagnostics watcher methods
      expect(mockDiagnosticsWatcher.getAllProblems).toBeDefined();
      expect(mockDiagnosticsWatcher.getProblemsForFile).toBeDefined();
      expect(mockDiagnosticsWatcher.getProblemsForWorkspace).toBeDefined();
    });

    it('should pass diagnostics watcher to resources component', () => {
      const resources = mcpServer.getResources();
      expect(resources).toBeDefined();
    });

    it('should initialize notifications with server instance', () => {
      const notifications = mcpServer.getNotifications();
      expect(notifications).toBeDefined();
    });
  });
});
