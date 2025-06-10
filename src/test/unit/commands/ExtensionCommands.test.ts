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
      mockMcpServer.start.mockResolvedValue(undefined);

      extensionCommands.registerCommands(mockContext);

      // Get the registered restart command handler
      const restartHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        (call) => call[0] === 'mcpDiagnostics.restart'
      )[1];

      await restartHandler();

      expect(mockMcpServer.dispose).toHaveBeenCalled();
      expect(mockMcpServer.start).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'MCP Diagnostics Server restarted successfully'
      );
    });

    it('should handle restart errors gracefully', async () => {
      const error = new Error('Failed to start server');
      mockMcpServer.start.mockRejectedValue(error);

      extensionCommands.registerCommands(mockContext);

      // Get the registered restart command handler
      const restartHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        (call) => call[0] === 'mcpDiagnostics.restart'
      )[1];

      await restartHandler();

      expect(mockMcpServer.dispose).toHaveBeenCalled();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to restart MCP server: Error: Failed to start server'
      );
    });

    it('should update status bar during restart process', async () => {
      mockMcpServer.start.mockResolvedValue(undefined);

      extensionCommands.registerCommands(mockContext);

      const restartHandler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        (call) => call[0] === 'mcpDiagnostics.restart'
      )[1];

      await restartHandler();

      // Should show restarting status, then return to normal
      expect(mockStatusBarItem.text).toBe('$(check) MCP: 0E 0W');
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
});
