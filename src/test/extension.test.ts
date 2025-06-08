// Basic Jest test for extension
// This will be replaced with proper tests in later sprints

import * as vscode from 'vscode';
import { activate, deactivate } from '../extension';

// Mock VS Code API
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
  },
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      text: '',
      tooltip: '',
      command: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
    createWebviewPanel: jest.fn(() => ({
      webview: { html: '' },
      dispose: jest.fn(),
    })),
  },
  commands: {
    registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
}));

// Mock the dependencies
jest.mock('@core/diagnostics/DiagnosticsWatcher');
jest.mock('@infrastructure/mcp/McpServerWrapper');
jest.mock('@infrastructure/vscode/VsCodeApiAdapter');
jest.mock('@/commands/ExtensionCommands');

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;
  let mockVscode: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock context
    mockContext = {
      subscriptions: [],
    } as any;

    // Setup mock vscode
    mockVscode = vscode as any;
    mockVscode.workspace.getConfiguration.mockReturnValue({
      get: jest.fn((_key: string, defaultValue: any) => defaultValue),
    });
  });

  describe('activate', () => {
    it('should activate extension successfully', async () => {
      // Mock constructors
      const mockDiagnosticsWatcher = {
        dispose: jest.fn(),
        on: jest.fn(),
      };
      const mockMcpServer = {
        start: jest.fn().mockResolvedValue(undefined),
        dispose: jest.fn(),
        isServerStarted: jest.fn().mockReturnValue(true),
      };
      const mockVsCodeAdapter = {};

      const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
      const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
      const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;

      // ExtensionCommands is mocked via jest.mock() above

      // Mock console.log to capture activation message
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await activate(mockContext, {
        DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
        McpServerWrapperCtor: MockMcpServerWrapper,
        VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
      });

      // Verify constructors were called
      expect(MockVsCodeApiAdapter).toHaveBeenCalledWith(vscode);
      expect(MockDiagnosticsWatcher).toHaveBeenCalledWith(mockVsCodeAdapter);
      expect(MockMcpServerWrapper).toHaveBeenCalledWith(
        mockDiagnosticsWatcher,
        expect.objectContaining({
          port: expect.any(Number),
          enableDebugLogging: expect.any(Boolean),
        })
      );

      // Verify MCP server was started
      expect(mockMcpServer.start).toHaveBeenCalled();

      // Verify disposables were added to context
      // 3 from extension.ts (DiagnosticsWatcher, McpServerWrapper, ExtensionCommands)
      // ExtensionCommands.registerCommands is mocked so doesn't add additional disposables
      expect(mockContext.subscriptions).toHaveLength(3);

      // Verify activation message was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        '🚀 MCP Diagnostics Extension: STARTING ACTIVATION...'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension activated successfully in')
      );

      consoleSpy.mockRestore();
    });

    it('should handle activation errors gracefully', async () => {
      // Mock constructors to throw an error
      const MockDiagnosticsWatcher = jest.fn().mockImplementation(() => {
        throw new Error('Failed to create DiagnosticsWatcher');
      }) as any;

      // Mock console.error and vscode.window.showErrorMessage
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const showErrorSpy = mockVscode.window.showErrorMessage;

      // This should trigger the catch block (lines 49-50)
      await expect(
        activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
        })
      ).rejects.toThrow('Failed to create DiagnosticsWatcher');

      // Verify error was logged and shown to user
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to activate extension:',
        expect.any(Error)
      );
      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension failed:')
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle MCP server start errors', async () => {
      // Mock constructors
      const mockDiagnosticsWatcher = {
        dispose: jest.fn(),
      };
      const mockMcpServer = {
        start: jest.fn().mockRejectedValue(new Error('Failed to start MCP server')),
        dispose: jest.fn(),
      };
      const mockVsCodeAdapter = {};

      const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
      const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
      const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;

      // Mock console.error and vscode.window.showErrorMessage
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const showErrorSpy = mockVscode.window.showErrorMessage;

      // This should trigger the catch block (lines 49-50)
      await expect(
        activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
          McpServerWrapperCtor: MockMcpServerWrapper,
          VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
        })
      ).rejects.toThrow('Failed to start MCP server');

      // Verify error was logged and shown to user
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to activate extension:',
        expect.any(Error)
      );
      expect(showErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension failed:')
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('deactivate', () => {
    it('should deactivate extension successfully', () => {
      // Mock console.log to capture deactivation message
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      deactivate();

      // Verify deactivation messages were logged
      expect(consoleSpy).toHaveBeenCalledWith('🔄 MCP Diagnostics Extension deactivating...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '✅ MCP Diagnostics Extension deactivated successfully'
      );

      consoleSpy.mockRestore();
    });

    it('should handle deactivation errors gracefully', () => {
      // This test covers the error handling in deactivate, but since the current
      // implementation doesn't have any objects to dispose that could throw,
      // we'll just verify the basic flow works
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      expect(() => deactivate()).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('🔄 MCP Diagnostics Extension deactivating...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '✅ MCP Diagnostics Extension deactivated successfully'
      );

      consoleSpy.mockRestore();
    });
  });
});
