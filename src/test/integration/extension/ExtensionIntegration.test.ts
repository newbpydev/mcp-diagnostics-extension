// --- MOCKS MUST BE AT THE VERY TOP ---
jest.mock('@core/diagnostics/DiagnosticsWatcher');
jest.mock('@infrastructure/mcp/McpServerWrapper');
jest.mock('@infrastructure/vscode/VsCodeApiAdapter');

// VS Code API mock
const mockVscode = {
  workspace: {
    getConfiguration: jest.fn(),
    getWorkspaceFolder: jest.fn(),
  },
  languages: {
    onDidChangeDiagnostics: jest.fn(),
    getDiagnostics: jest.fn(),
  },
  window: {
    showErrorMessage: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
  },
  Uri: {
    parse: jest.fn(),
  },
};

jest.mock('vscode', () => mockVscode, { virtual: true });

import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { VsCodeApiAdapter } from '@infrastructure/vscode/VsCodeApiAdapter';
import { DEFAULT_CONFIG } from '@shared/constants';

describe('Extension Integration', () => {
  let mockContext: any;
  let mockDiagnosticsWatcher: any;
  let mockMcpServer: any;
  let activate: any;
  let deactivate: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

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
      storagePath: '/test/storage',
      globalStorageUri: {} as any,
      globalStoragePath: '/test/global-storage',
      logUri: {} as any,
      logPath: '/test/logs',
      extension: {} as any,
      extensionMode: 3,
      languageModelAccessInformation: {} as any,
    };

    mockDiagnosticsWatcher = {
      dispose: jest.fn(),
      emit: jest.fn(),
      getAllProblems: jest.fn().mockReturnValue([]),
      getProblemsForFile: jest.fn().mockReturnValue([]),
      getProblemsForWorkspace: jest.fn().mockReturnValue([]),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    mockMcpServer = {
      start: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn(),
    };

    // Mock constructors
    (DiagnosticsWatcher as jest.MockedClass<typeof DiagnosticsWatcher>).mockImplementation(
      () => mockDiagnosticsWatcher
    );
    (McpServerWrapper as jest.MockedClass<typeof McpServerWrapper>).mockImplementation(
      () => mockMcpServer
    );
    (VsCodeApiAdapter as jest.MockedClass<typeof VsCodeApiAdapter>).mockImplementation(() => {
      const instance = Object.create(VsCodeApiAdapter.prototype);
      instance.languages = mockVscode.languages;
      instance.workspace = mockVscode.workspace;
      instance.convertDiagnostics = jest.fn();
      instance.convertDiagnostic = jest.fn();
      instance.convertCode = jest.fn();
      return instance;
    });

    // Mock workspace configuration
    const mockConfig = {
      get: jest.fn((_key: string, defaultValue?: any) => defaultValue),
    };
    mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);

    // Mock VS Code Uri.parse
    mockVscode.Uri.parse.mockImplementation((uriString: string) => ({
      toString: () => uriString,
      fsPath: uriString,
    }));

    // Mock onDidChangeDiagnostics
    mockVscode.languages.onDidChangeDiagnostics.mockReturnValue({
      dispose: jest.fn(),
    });

    // Mock getDiagnostics
    mockVscode.languages.getDiagnostics.mockReturnValue([]);

    activate = undefined;
    deactivate = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Extension Activation', () => {
    it('should activate extension successfully', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(DiagnosticsWatcher).toHaveBeenCalled();
      expect(McpServerWrapper).toHaveBeenCalled();
      expect(mockMcpServer.start).toHaveBeenCalled();
    });

    it('should create DiagnosticsWatcher with VS Code API adapter', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(DiagnosticsWatcher).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should create McpServerWrapper with watcher and config', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(McpServerWrapper).toHaveBeenCalledWith(
        mockDiagnosticsWatcher,
        expect.objectContaining({
          port: DEFAULT_CONFIG.mcpServerPort,
          enableDebugLogging: DEFAULT_CONFIG.enableDebugLogging,
        })
      );
    });

    it('should start MCP server during activation', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(mockMcpServer.start).toHaveBeenCalled();
    });

    it('should add disposables to context subscriptions', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(mockContext.subscriptions).toHaveLength(2);
    });

    it('should read configuration from VS Code workspace', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(mockVscode.workspace.getConfiguration).toHaveBeenCalledWith('mcpDiagnostics');
    });

    it('should use default configuration values when not specified', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      const mockConfig = {
        get: jest.fn((_key: string, defaultValue?: any) => defaultValue),
      };
      mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(mockConfig.get).toHaveBeenCalledWith('server.port', DEFAULT_CONFIG.mcpServerPort);
      expect(mockConfig.get).toHaveBeenCalledWith(
        'enableDebugLogging',
        DEFAULT_CONFIG.enableDebugLogging
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle DiagnosticsWatcher creation errors', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      (DiagnosticsWatcher as jest.MockedClass<typeof DiagnosticsWatcher>).mockImplementation(() => {
        throw new Error('Failed to create watcher');
      });
      await expect(
        activate(mockContext, {
          DiagnosticsWatcherCtor: DiagnosticsWatcher,
          McpServerWrapperCtor: McpServerWrapper,
          VsCodeApiAdapterCtor: VsCodeApiAdapter,
        })
      ).rejects.toThrow('Failed to create watcher');
      expect(mockVscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension failed')
      );
    });

    it('should handle MCP server start errors', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      mockMcpServer.start.mockRejectedValue(new Error('Failed to start server'));
      await expect(
        activate(mockContext, {
          DiagnosticsWatcherCtor: DiagnosticsWatcher,
          McpServerWrapperCtor: McpServerWrapper,
          VsCodeApiAdapterCtor: VsCodeApiAdapter,
        })
      ).rejects.toThrow('Failed to start server');
      expect(mockVscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension failed')
      );
    });

    it('should show error message to user when activation fails', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      (DiagnosticsWatcher as jest.MockedClass<typeof DiagnosticsWatcher>).mockImplementation(() => {
        throw new Error('Some error');
      });
      try {
        await activate(mockContext, {
          DiagnosticsWatcherCtor: DiagnosticsWatcher,
          McpServerWrapperCtor: McpServerWrapper,
          VsCodeApiAdapterCtor: VsCodeApiAdapter,
        });
      } catch {
        // expected
      }
      expect(mockVscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension failed')
      );
    });
  });

  describe('Extension Deactivation', () => {
    it('should provide deactivate function', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      expect(typeof deactivate).toBe('function');
    });

    it('should dispose MCP server on deactivation', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      deactivate();
      expect(mockMcpServer.dispose).toHaveBeenCalled();
    });

    it('should dispose DiagnosticsWatcher on deactivation', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      deactivate();
      expect(mockDiagnosticsWatcher.dispose).toHaveBeenCalled();
    });

    it('should handle deactivation when components are not initialized', async () => {
      const extensionModule = await import('@/extension');
      deactivate = extensionModule.deactivate;
      expect(() => deactivate()).not.toThrow();
    });

    it('should log error if dispose throws during deactivation', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      mockMcpServer.dispose.mockImplementation(() => {
        throw new Error('dispose fail');
      });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      expect(() => deactivate()).not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith('Error during deactivation:', expect.any(Error));
      errorSpy.mockRestore();
    });
  });

  describe('Configuration Management', () => {
    it('should handle custom port configuration', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      const mockConfig = {
        get: jest.fn((key: string, defaultValue?: any) =>
          key === 'server.port' ? 8080 : defaultValue
        ),
      };
      mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(McpServerWrapper).toHaveBeenCalledWith(
        mockDiagnosticsWatcher,
        expect.objectContaining({ port: 8080 })
      );
    });

    it('should handle debug logging configuration', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      const mockConfig = {
        get: jest.fn((key: string, defaultValue?: any) =>
          key === 'enableDebugLogging' ? true : defaultValue
        ),
      };
      mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig);
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(McpServerWrapper).toHaveBeenCalledWith(
        mockDiagnosticsWatcher,
        expect.objectContaining({ enableDebugLogging: true })
      );
    });
  });

  describe('Lifecycle Management', () => {
    it('should track extension state correctly', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(DiagnosticsWatcher).toHaveBeenCalled();
      expect(McpServerWrapper).toHaveBeenCalled();
    });

    it('should handle multiple activation calls gracefully', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(DiagnosticsWatcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Monitoring', () => {
    it('should log activation time', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension activated')
      );
    });

    it('should handle activation within performance threshold', async () => {
      const extensionModule = await import('@/extension');
      activate = extensionModule.activate;
      deactivate = extensionModule.deactivate;
      const startTime = Date.now();
      await activate(mockContext, {
        DiagnosticsWatcherCtor: DiagnosticsWatcher,
        McpServerWrapperCtor: McpServerWrapper,
        VsCodeApiAdapterCtor: VsCodeApiAdapter,
      });
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // 2 second threshold
    });
  });
});
