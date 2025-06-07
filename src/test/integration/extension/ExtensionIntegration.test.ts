import * as vscode from 'vscode';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { DEFAULT_CONFIG } from '@shared/constants';

// Mock the extension module dependencies
jest.mock('@core/diagnostics/DiagnosticsWatcher');
jest.mock('@infrastructure/mcp/McpServerWrapper');
jest.mock('@infrastructure/vscode/VsCodeApiAdapter');

// Mock VS Code API
const mockVscode = {
  workspace: {
    getConfiguration: jest.fn(),
  },
  languages: {
    onDidChangeDiagnostics: jest.fn(),
    getDiagnostics: jest.fn(),
  },
  window: {
    showErrorMessage: jest.fn(),
  },
};

// Replace the actual vscode import with our mock
jest.mock('vscode', () => mockVscode, { virtual: true });

describe('Extension Integration', () => {
  let mockContext: vscode.ExtensionContext;
  let mockDiagnosticsWatcher: jest.Mocked<DiagnosticsWatcher>;
  let mockMcpServer: jest.Mocked<McpServerWrapper>;
  let activate: any;
  let deactivate: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock context
    mockContext = {
      subscriptions: [],
      workspaceState: {} as any,
      globalState: {} as any,
      secrets: {} as any,
      extensionUri: {} as any,
      extensionPath: '/test/path',
      environmentVariableCollection: {} as any,
      asAbsolutePath: jest.fn(),
      storageUri: {} as any,
      extension: {} as any,
      extensionMode: 3, // ExtensionMode.Test
      languageModelAccessInformation: {} as any,
    };

    // Create mock instances
    mockDiagnosticsWatcher = {
      dispose: jest.fn(),
      emit: jest.fn(),
      getAllProblems: jest.fn().mockReturnValue([]),
      getProblemsForFile: jest.fn().mockReturnValue([]),
      getProblemsForWorkspace: jest.fn().mockReturnValue([]),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    mockMcpServer = {
      start: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn(),
    } as any;

    // Mock constructors
    (DiagnosticsWatcher as jest.MockedClass<typeof DiagnosticsWatcher>).mockImplementation(
      () => mockDiagnosticsWatcher
    );
    (McpServerWrapper as jest.MockedClass<typeof McpServerWrapper>).mockImplementation(
      () => mockMcpServer
    );

    // Mock workspace configuration
    const mockConfig = {
      get: jest.fn((_key: string, defaultValue?: any) => defaultValue),
    };
    mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);

    // Clear module cache and re-import extension
    jest.resetModules();
    const extensionModule = await import('@/extension');
    activate = extensionModule.activate;
    deactivate = extensionModule.deactivate;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Extension Activation', () => {
    it('should activate extension successfully', async () => {
      await activate(mockContext);

      expect(DiagnosticsWatcher).toHaveBeenCalled();
      expect(McpServerWrapper).toHaveBeenCalled();
      expect(mockMcpServer.start).toHaveBeenCalled();
    });

    it('should create DiagnosticsWatcher with VS Code API adapter', async () => {
      await activate(mockContext);

      expect(DiagnosticsWatcher).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should create McpServerWrapper with watcher and config', async () => {
      await activate(mockContext);

      expect(McpServerWrapper).toHaveBeenCalledWith(
        mockDiagnosticsWatcher,
        expect.objectContaining({
          port: DEFAULT_CONFIG.mcpServerPort,
          enableDebugLogging: DEFAULT_CONFIG.enableDebugLogging,
        })
      );
    });

    it('should start MCP server during activation', async () => {
      await activate(mockContext);

      expect(mockMcpServer.start).toHaveBeenCalled();
    });

    it('should add disposables to context subscriptions', async () => {
      await activate(mockContext);

      expect(mockContext.subscriptions).toHaveLength(2);
    });

    it('should read configuration from VS Code workspace', async () => {
      await activate(mockContext);

      expect(mockVscode.workspace.getConfiguration).toHaveBeenCalledWith('mcpDiagnostics');
    });

    it('should use default configuration values when not specified', async () => {
      const mockConfig = {
        get: jest.fn((_key: string, defaultValue?: any) => defaultValue),
      };
      mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);

      await activate(mockContext);

      expect(mockConfig.get).toHaveBeenCalledWith('server.port', DEFAULT_CONFIG.mcpServerPort);
      expect(mockConfig.get).toHaveBeenCalledWith(
        'enableDebugLogging',
        DEFAULT_CONFIG.enableDebugLogging
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle DiagnosticsWatcher creation errors', async () => {
      (DiagnosticsWatcher as jest.MockedClass<typeof DiagnosticsWatcher>).mockImplementation(() => {
        throw new Error('Failed to create watcher');
      });

      await expect(activate(mockContext)).rejects.toThrow('Failed to create watcher');
      expect(mockVscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension failed')
      );
    });

    it('should handle MCP server start errors', async () => {
      mockMcpServer.start.mockRejectedValue(new Error('Failed to start server'));

      await expect(activate(mockContext)).rejects.toThrow('Failed to start server');
      expect(mockVscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension failed')
      );
    });

    it('should show error message to user when activation fails', async () => {
      (DiagnosticsWatcher as jest.MockedClass<typeof DiagnosticsWatcher>).mockImplementation(() => {
        throw new Error('Test error');
      });

      try {
        await activate(mockContext);
      } catch {
        // Expected to throw
      }

      expect(mockVscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension failed')
      );
    });
  });

  describe('Extension Deactivation', () => {
    it('should provide deactivate function', () => {
      expect(typeof deactivate).toBe('function');
    });

    it('should dispose MCP server on deactivation', async () => {
      await activate(mockContext);
      deactivate();

      expect(mockMcpServer.dispose).toHaveBeenCalled();
    });

    it('should dispose DiagnosticsWatcher on deactivation', async () => {
      await activate(mockContext);
      deactivate();

      expect(mockDiagnosticsWatcher.dispose).toHaveBeenCalled();
    });

    it('should handle deactivation when components are not initialized', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    it('should handle custom port configuration', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'server.port') return 8080;
          return defaultValue;
        }),
      };
      mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);

      await activate(mockContext);

      expect(McpServerWrapper).toHaveBeenCalledWith(
        mockDiagnosticsWatcher,
        expect.objectContaining({ port: 8080 })
      );
    });

    it('should handle debug logging configuration', async () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'enableDebugLogging') return true;
          return defaultValue;
        }),
      };
      mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);

      await activate(mockContext);

      expect(McpServerWrapper).toHaveBeenCalledWith(
        mockDiagnosticsWatcher,
        expect.objectContaining({ enableDebugLogging: true })
      );
    });
  });

  describe('Lifecycle Management', () => {
    it('should track extension state correctly', async () => {
      await activate(mockContext);

      expect(DiagnosticsWatcher).toHaveBeenCalled();
      expect(McpServerWrapper).toHaveBeenCalled();
    });

    it('should handle multiple activation calls gracefully', async () => {
      await activate(mockContext);
      await activate(mockContext);

      expect(DiagnosticsWatcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Monitoring', () => {
    it('should log activation time', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await activate(mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension activated')
      );

      consoleSpy.mockRestore();
    });

    it('should handle activation within performance threshold', async () => {
      const startTime = Date.now();
      await activate(mockContext);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // 2 second threshold
    });
  });
});
