import * as vscode from 'vscode';
import { ExtensionCommands } from '@/commands/ExtensionCommands';
import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { McpServerRegistration } from '@infrastructure/mcp/McpServerRegistration';
import { ProblemItem } from '@shared/types';

// Mock VS Code API
jest.mock('vscode', () => ({
  window: {
    createStatusBarItem: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    createWebviewPanel: jest.fn(),
    withProgress: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
  },
  StatusBarAlignment: {
    Right: 2,
  },
  ViewColumn: {
    One: 1,
  },
  ProgressLocation: {
    Notification: 15,
  },
  ThemeColor: jest.fn().mockImplementation((id) => ({ id })),
}));

describe('ExtensionCommands', () => {
  let extensionCommands: ExtensionCommands;
  let mockMcpServer: jest.Mocked<McpServerWrapper>;
  let mockDiagnosticsWatcher: jest.Mocked<DiagnosticsWatcher>;
  let mockMcpRegistration: jest.Mocked<McpServerRegistration>;
  let mockStatusBarItem: jest.Mocked<vscode.StatusBarItem>;
  let mockContext: jest.Mocked<vscode.ExtensionContext>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock status bar item
    mockStatusBarItem = {
      text: '',
      tooltip: '',
      command: '',
      backgroundColor: undefined,
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    } as any;

    // Mock VS Code window.createStatusBarItem
    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);

    // Create mock MCP server
    mockMcpServer = {
      dispose: jest.fn(),
      start: jest.fn(),
      restart: jest.fn(),
      isServerStarted: jest.fn().mockReturnValue(true),
    } as any;

    // Create mock diagnostics watcher with EventEmitter methods
    mockDiagnosticsWatcher = {
      getAllProblems: jest.fn().mockReturnValue([]),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    // Create mock MCP registration
    mockMcpRegistration = {
      showMcpSetupGuide: jest.fn(),
      deployBundledServer: jest.fn(),
      injectConfiguration: jest.fn(),
      dispose: jest.fn(),
    } as any;

    // Create mock extension context
    mockContext = {
      subscriptions: [],
    } as any;

    // Create extension commands instance
    extensionCommands = new ExtensionCommands(
      mockMcpServer,
      mockDiagnosticsWatcher,
      mockMcpRegistration
    );
  });

  afterEach(() => {
    if (extensionCommands) {
      extensionCommands.dispose();
    }
  });

  describe('constructor', () => {
    it('should create status bar item with correct alignment and priority', () => {
      expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Right,
        100
      );
    });

    it('should initialize status bar with default state', () => {
      expect(mockStatusBarItem.text).toBe('$(check) MCP: 0E 0W');
      expect(mockStatusBarItem.tooltip).toBe(
        'MCP Diagnostics Server Status\nErrors: 0, Warnings: 0\nClick to show details'
      );
      expect(mockStatusBarItem.command).toBe('mcpDiagnostics.showStatus');
      expect(mockStatusBarItem.backgroundColor).toBeUndefined();
    });

    it('should set up event listener for problems changed', () => {
      expect(mockDiagnosticsWatcher.on).toHaveBeenCalledWith(
        'problemsChanged',
        expect.any(Function)
      );
    });
  });

  describe('registerCommands', () => {
    it('should register restart command', () => {
      extensionCommands.registerCommands(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'mcpDiagnostics.restart',
        expect.any(Function)
      );
    });

    it('should register show status command', () => {
      extensionCommands.registerCommands(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'mcpDiagnostics.showStatus',
        expect.any(Function)
      );
    });

    it('should add commands and status bar to context subscriptions', () => {
      const mockDisposable = { dispose: jest.fn() };
      (vscode.commands.registerCommand as jest.Mock).mockReturnValue(mockDisposable);

      extensionCommands.registerCommands(mockContext);

      expect(mockContext.subscriptions).toContain(mockDisposable);
      expect(mockContext.subscriptions).toContain(mockStatusBarItem);
    });

    it('should show status bar item', () => {
      extensionCommands.registerCommands(mockContext);

      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });
  });

  describe('updateStatusBar', () => {
    it('should display problem counts correctly with error styling', () => {
      const mockProblems: ProblemItem[] = [
        {
          filePath: '/test/file1.ts',
          workspaceFolder: '/test',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
          severity: 'Error',
          message: 'Test error',
          source: 'typescript',
        },
        {
          filePath: '/test/file2.ts',
          workspaceFolder: '/test',
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
          severity: 'Warning',
          message: 'Test warning',
          source: 'eslint',
        },
      ];

      mockDiagnosticsWatcher.getAllProblems.mockReturnValue(mockProblems);

      // Create new instance to trigger status bar update
      const commands = new ExtensionCommands(
        mockMcpServer,
        mockDiagnosticsWatcher,
        mockMcpRegistration
      );

      expect(mockStatusBarItem.text).toBe('$(error) MCP: 1E 1W');
      expect(mockStatusBarItem.backgroundColor).toEqual({ id: 'statusBarItem.errorBackground' });

      // Clean up
      commands.dispose();
    });

    it('should display warning styling when only warnings present', () => {
      const mockProblems: ProblemItem[] = [
        {
          filePath: '/test/file2.ts',
          workspaceFolder: '/test',
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
          severity: 'Warning',
          message: 'Test warning',
          source: 'eslint',
        },
      ];

      mockDiagnosticsWatcher.getAllProblems.mockReturnValue(mockProblems);

      // Create new instance to trigger status bar update
      const commands = new ExtensionCommands(
        mockMcpServer,
        mockDiagnosticsWatcher,
        mockMcpRegistration
      );

      expect(mockStatusBarItem.text).toBe('$(warning) MCP: 0E 1W');
      expect(mockStatusBarItem.backgroundColor).toEqual({ id: 'statusBarItem.warningBackground' });

      // Clean up
      commands.dispose();
    });

    it('should show loading status when provided', () => {
      const commands = new ExtensionCommands(
        mockMcpServer,
        mockDiagnosticsWatcher,
        mockMcpRegistration
      );

      // Access private method for testing
      (commands as any).updateStatusBar('Restarting...');

      expect(mockStatusBarItem.text).toBe('$(sync~spin) MCP: Restarting...');
      expect(mockStatusBarItem.backgroundColor).toBeUndefined();

      // Clean up
      commands.dispose();
    });
  });

  describe('restartServer command', () => {
    it('should restart server successfully', async () => {
      mockMcpServer.restart.mockResolvedValue(undefined);
      mockMcpServer.isServerStarted.mockReturnValue(true);

      extensionCommands.registerCommands(mockContext);

      // Get the registered restart command handler
      const restartHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        (call) => call[0] === 'mcpDiagnostics.restart'
      )[1];

      await restartHandler();

      expect(mockMcpServer.restart).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'MCP Diagnostics Server restarted successfully! Server is running.'
      );
    });

    it('should handle restart errors gracefully', async () => {
      const error = new Error('Failed to restart server');
      mockMcpServer.restart.mockRejectedValue(error);

      extensionCommands.registerCommands(mockContext);

      // Get the registered restart command handler
      const restartHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        (call) => call[0] === 'mcpDiagnostics.restart'
      )[1];

      await restartHandler();

      expect(mockMcpServer.restart).toHaveBeenCalled();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to restart MCP server: Failed to restart server'
      );
    });

    it('should handle non-Error restart failures', async () => {
      const error = 'String error message';
      mockMcpServer.restart.mockRejectedValue(error);

      extensionCommands.registerCommands(mockContext);

      const restartHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        (call) => call[0] === 'mcpDiagnostics.restart'
      )[1];

      await restartHandler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to restart MCP server: String error message'
      );
    });

    it('should update status bar during restart', async () => {
      mockMcpServer.restart.mockResolvedValue(undefined);
      mockMcpServer.isServerStarted.mockReturnValue(true);

      extensionCommands.registerCommands(mockContext);

      const restartHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        (call) => call[0] === 'mcpDiagnostics.restart'
      )[1];

      await restartHandler();

      // Should show restarting status, then return to normal
      expect(mockStatusBarItem.text).toBe('$(check) MCP: 0E 0W');
    });

    it('should show proper feedback when stopped', async () => {
      mockMcpServer.restart.mockResolvedValue(undefined);
      mockMcpServer.isServerStarted.mockReturnValue(false);

      extensionCommands.registerCommands(mockContext);

      const restartHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        (call) => call[0] === 'mcpDiagnostics.restart'
      )[1];

      await restartHandler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'MCP Diagnostics Server restarted successfully! Server is stopped.'
      );
    });
  });

  describe('showStatus command', () => {
    it('should create webview panel with correct configuration', async () => {
      const mockPanel = {
        webview: { html: '' },
      };
      (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);

      extensionCommands.registerCommands(mockContext);

      const showStatusHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        (call) => call[0] === 'mcpDiagnostics.showStatus'
      )[1];

      await showStatusHandler();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'mcpDiagnosticsStatus',
        'MCP Diagnostics Status',
        vscode.ViewColumn.One,
        { enableScripts: true }
      );
    });

    it('should generate HTML with problem statistics', async () => {
      const mockProblems: ProblemItem[] = [
        {
          filePath: '/test/file1.ts',
          workspaceFolder: '/test',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
          severity: 'Error',
          message: 'Test error',
          source: 'typescript',
        },
        {
          filePath: '/test/file2.ts',
          workspaceFolder: '/test',
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
          severity: 'Warning',
          message: 'Test warning',
          source: 'eslint',
        },
      ];

      mockDiagnosticsWatcher.getAllProblems.mockReturnValue(mockProblems);

      const mockPanel = {
        webview: { html: '' },
      };
      (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);

      extensionCommands.registerCommands(mockContext);

      const showStatusHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        (call) => call[0] === 'mcpDiagnostics.showStatus'
      )[1];

      await showStatusHandler();

      expect(mockPanel.webview.html).toContain('<strong>Total Problems:</strong> 2');
      expect(mockPanel.webview.html).toContain('🔴 Errors: 1');
      expect(mockPanel.webview.html).toContain('🟡 Warnings: 1');
      expect(mockPanel.webview.html).toContain('✅ Running');
    });
  });

  describe('dispose', () => {
    it('should dispose status bar item', () => {
      extensionCommands.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });

  describe('groupBy utility', () => {
    it('should group items by specified key', () => {
      const items = [
        { type: 'error', file: 'a.ts' },
        { type: 'warning', file: 'b.ts' },
        { type: 'error', file: 'c.ts' },
      ];

      const result = (extensionCommands as any).groupBy(items, 'type');

      expect(result).toEqual({
        error: 2,
        warning: 1,
      });
    });
  });

  describe('🔴 Task 4.4: Configure Server Command (FAILING TESTS)', () => {
    describe('Command Registration', () => {
      it('should register mcpDiagnostics.configureServer command', async () => {
        const registerCommandSpy = jest.spyOn(vscode.commands, 'registerCommand');

        extensionCommands.registerCommands(mockContext);

        expect(registerCommandSpy).toHaveBeenCalledWith(
          'mcpDiagnostics.configureServer',
          expect.any(Function)
        );
      });

      it('should add configureServer command to context subscriptions', () => {
        const mockDisposable = { dispose: jest.fn() };
        jest.spyOn(vscode.commands, 'registerCommand').mockReturnValue(mockDisposable);

        extensionCommands.registerCommands(mockContext);

        expect(mockContext.subscriptions).toContain(mockDisposable);
      });
    });

    describe('Progress Integration', () => {
      it('should show progress with VS Code withProgress API during configuration', async () => {
        const progressSpy = jest.spyOn(vscode.window, 'withProgress');
        const mockProgress = {
          report: jest.fn(),
        };
        progressSpy.mockImplementation(
          <T>(
            _options: vscode.ProgressOptions,
            task: (
              progress: vscode.Progress<{ message?: string; increment?: number }>,
              token: vscode.CancellationToken
            ) => Thenable<T>
          ): Thenable<T> => {
            const mockToken = {} as vscode.CancellationToken;
            return task(mockProgress as any, mockToken);
          }
        );

        // Extract the configureServer handler
        const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
        extensionCommands.registerCommands(mockContext);

        const configureServerHandler = registerSpy.mock.calls.find(
          (call) => call[0] === 'mcpDiagnostics.configureServer'
        )?.[1];

        expect(configureServerHandler).toBeDefined();
        if (configureServerHandler) {
          await configureServerHandler();
        }

        expect(progressSpy).toHaveBeenCalledWith(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Configuring MCP Server...',
            cancellable: false,
          },
          expect.any(Function)
        );
      });

      it('should report progress steps during configuration', async () => {
        const mockProgress = {
          report: jest.fn(),
        };
        jest
          .spyOn(vscode.window, 'withProgress')
          .mockImplementation(
            <T>(
              _options: vscode.ProgressOptions,
              task: (
                progress: vscode.Progress<{ message?: string; increment?: number }>,
                token: vscode.CancellationToken
              ) => Thenable<T>
            ): Thenable<T> => {
              const mockToken = {} as vscode.CancellationToken;
              return task(mockProgress as any, mockToken);
            }
          );

        // Mock successful deployment
        jest
          .spyOn(mockMcpRegistration, 'deployBundledServer')
          .mockResolvedValue({ installedPath: '/test/path', upgraded: true });
        jest.spyOn(mockMcpRegistration, 'injectConfiguration').mockResolvedValue();

        const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
        extensionCommands.registerCommands(mockContext);

        const configureServerHandler = registerSpy.mock.calls.find(
          (call) => call[0] === 'mcpDiagnostics.configureServer'
        )?.[1];

        if (configureServerHandler) {
          await configureServerHandler();
        }

        expect(mockProgress.report).toHaveBeenCalledWith({
          message: 'Deploying server...',
        });
        expect(mockProgress.report).toHaveBeenCalledWith({
          message: 'Injecting configuration...',
        });
      });

      it('should not call injectConfiguration if deployment fails', async () => {
        const injectConfigSpy = jest.spyOn(mockMcpRegistration, 'injectConfiguration');

        // Mock deployment failure
        jest
          .spyOn(mockMcpRegistration, 'deployBundledServer')
          .mockRejectedValue(new Error('Deployment failed'));

        const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
        extensionCommands.registerCommands(mockContext);

        const configureServerHandler = registerSpy.mock.calls.find(
          (call) => call[0] === 'mcpDiagnostics.configureServer'
        )?.[1];

        if (configureServerHandler) {
          await configureServerHandler();
        }

        expect(injectConfigSpy).not.toHaveBeenCalled();
      });
    });

    describe('Success Handling', () => {
      it('should show success notification when configuration completes', async () => {
        const showInfoSpy = jest.spyOn(vscode.window, 'showInformationMessage');

        // Mock successful operations
        jest
          .spyOn(mockMcpRegistration, 'deployBundledServer')
          .mockResolvedValue({ installedPath: '/test/path', upgraded: true });
        jest.spyOn(mockMcpRegistration, 'injectConfiguration').mockResolvedValue();

        const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
        extensionCommands.registerCommands(mockContext);

        const configureServerHandler = registerSpy.mock.calls.find(
          (call) => call[0] === 'mcpDiagnostics.configureServer'
        )?.[1];

        if (configureServerHandler) {
          await configureServerHandler();
        }

        expect(showInfoSpy).toHaveBeenCalledWith('MCP Diagnostics server configured successfully!');
      });
    });

    describe('Error Handling', () => {
      it('should show error notification with fallback when deployment fails', async () => {
        const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage');

        // Mock deployment failure
        jest
          .spyOn(mockMcpRegistration, 'deployBundledServer')
          .mockRejectedValue(new Error('Deployment failed'));

        const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
        extensionCommands.registerCommands(mockContext);

        const configureServerHandler = registerSpy.mock.calls.find(
          (call) => call[0] === 'mcpDiagnostics.configureServer'
        )?.[1];

        if (configureServerHandler) {
          await configureServerHandler();
        }

        expect(showErrorSpy).toHaveBeenCalledWith(
          'Failed to configure server automatically.',
          'View Manual Setup'
        );
      });

      it('should show error notification when configuration injection fails', async () => {
        const showErrorSpy = jest.spyOn(vscode.window, 'showErrorMessage');

        // Mock successful deployment but failed injection
        jest
          .spyOn(mockMcpRegistration, 'deployBundledServer')
          .mockResolvedValue({ installedPath: '/test/path', upgraded: true });
        jest
          .spyOn(mockMcpRegistration, 'injectConfiguration')
          .mockRejectedValue(new Error('Configuration injection failed'));

        const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
        extensionCommands.registerCommands(mockContext);

        const configureServerHandler = registerSpy.mock.calls.find(
          (call) => call[0] === 'mcpDiagnostics.configureServer'
        )?.[1];

        if (configureServerHandler) {
          await configureServerHandler();
        }

        expect(showErrorSpy).toHaveBeenCalledWith(
          'Failed to configure server automatically.',
          'View Manual Setup'
        );
      });

      it('should handle user clicking View Manual Setup button', async () => {
        const mockProgress = {
          report: jest.fn(),
        };
        jest
          .spyOn(vscode.window, 'withProgress')
          .mockImplementation(
            <T>(
              _options: vscode.ProgressOptions,
              task: (
                progress: vscode.Progress<{ message?: string; increment?: number }>,
                token: vscode.CancellationToken
              ) => Thenable<T>
            ): Thenable<T> => {
              const mockToken = {} as vscode.CancellationToken;
              return task(mockProgress as any, mockToken);
            }
          );

        const showErrorSpy = jest
          .spyOn(vscode.window, 'showErrorMessage')
          .mockResolvedValue('View Manual Setup' as any);
        const showSetupGuideSpy = jest.spyOn(mockMcpRegistration, 'showMcpSetupGuide');

        // Mock deployment failure
        jest
          .spyOn(mockMcpRegistration, 'deployBundledServer')
          .mockRejectedValue(new Error('Deployment failed'));

        const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
        extensionCommands.registerCommands(mockContext);

        const configureServerHandler = registerSpy.mock.calls.find(
          (call) => call[0] === 'mcpDiagnostics.configureServer'
        )?.[1];

        if (configureServerHandler) {
          await configureServerHandler();
        }

        expect(showErrorSpy).toHaveBeenCalledWith(
          'Failed to configure server automatically.',
          'View Manual Setup'
        );
        expect(showSetupGuideSpy).toHaveBeenCalled();
      });
    });

    describe('Integration with Deployment Services', () => {
      it('should call deployBundledServer during configuration', async () => {
        const deployServerSpy = jest
          .spyOn(mockMcpRegistration, 'deployBundledServer')
          .mockResolvedValue({ installedPath: '/test/path', upgraded: true });

        const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
        extensionCommands.registerCommands(mockContext);

        const configureServerHandler = registerSpy.mock.calls.find(
          (call) => call[0] === 'mcpDiagnostics.configureServer'
        )?.[1];

        if (configureServerHandler) {
          await configureServerHandler();
        }

        expect(deployServerSpy).toHaveBeenCalled();
      });

      it('should call injectConfiguration after successful deployment', async () => {
        const injectConfigSpy = jest
          .spyOn(mockMcpRegistration, 'injectConfiguration')
          .mockResolvedValue();

        // Mock successful deployment
        jest
          .spyOn(mockMcpRegistration, 'deployBundledServer')
          .mockResolvedValue({ installedPath: '/test/path', upgraded: true });

        const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
        extensionCommands.registerCommands(mockContext);

        const configureServerHandler = registerSpy.mock.calls.find(
          (call) => call[0] === 'mcpDiagnostics.configureServer'
        )?.[1];

        if (configureServerHandler) {
          await configureServerHandler();
        }

        expect(injectConfigSpy).toHaveBeenCalled();
      });

      it('should not call injectConfiguration if deployment fails', async () => {
        const injectConfigSpy = jest.spyOn(mockMcpRegistration, 'injectConfiguration');

        // Mock deployment failure
        jest
          .spyOn(mockMcpRegistration, 'deployBundledServer')
          .mockRejectedValue(new Error('Deployment failed'));

        const registerSpy = jest.spyOn(vscode.commands, 'registerCommand');
        extensionCommands.registerCommands(mockContext);

        const configureServerHandler = registerSpy.mock.calls.find(
          (call) => call[0] === 'mcpDiagnostics.configureServer'
        )?.[1];

        if (configureServerHandler) {
          await configureServerHandler();
        }

        expect(injectConfigSpy).not.toHaveBeenCalled();
      });
    });
  });
});
