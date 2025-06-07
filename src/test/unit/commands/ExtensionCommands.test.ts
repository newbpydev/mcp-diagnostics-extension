import * as vscode from 'vscode';
import { ExtensionCommands } from '@/commands/ExtensionCommands';
import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
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
}));

describe('ExtensionCommands', () => {
  let extensionCommands: ExtensionCommands;
  let mockMcpServer: jest.Mocked<McpServerWrapper>;
  let mockDiagnosticsWatcher: jest.Mocked<DiagnosticsWatcher>;
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

    // Create mock diagnostics watcher
    mockDiagnosticsWatcher = {
      getAllProblems: jest.fn().mockReturnValue([]),
    } as any;

    // Create mock extension context
    mockContext = {
      subscriptions: [],
    } as any;

    // Create extension commands instance
    extensionCommands = new ExtensionCommands(mockMcpServer, mockDiagnosticsWatcher);
  });

  afterEach(() => {
    extensionCommands.dispose();
  });

  describe('constructor', () => {
    it('should create status bar item with correct alignment and priority', () => {
      expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Right,
        100
      );
    });

    it('should initialize status bar with default state', () => {
      expect(mockStatusBarItem.text).toBe('$(bug) MCP: 0E 0W');
      expect(mockStatusBarItem.tooltip).toBe('MCP Diagnostics Server Status');
      expect(mockStatusBarItem.command).toBe('mcpDiagnostics.showStatus');
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
    it('should display problem counts correctly', () => {
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
        {
          filePath: '/test/file3.ts',
          workspaceFolder: '/test',
          range: { start: { line: 2, character: 0 }, end: { line: 2, character: 10 } },
          severity: 'Warning',
          message: 'Another warning',
          source: 'eslint',
        },
      ];

      mockDiagnosticsWatcher.getAllProblems.mockReturnValue(mockProblems);

      // Create new instance to trigger status bar update
      const commands = new ExtensionCommands(mockMcpServer, mockDiagnosticsWatcher);

      expect(mockStatusBarItem.text).toBe('$(bug) MCP: 1E 2W');

      // Clean up
      commands.dispose();
    });

    it('should show loading status when provided', () => {
      const commands = new ExtensionCommands(mockMcpServer, mockDiagnosticsWatcher);

      // Access private method for testing
      (commands as any).updateStatusBar('Restarting...');

      expect(mockStatusBarItem.text).toBe('$(sync~spin) MCP: Restarting...');

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
      expect(mockStatusBarItem.text).toBe('$(bug) MCP: 0E 0W');
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
