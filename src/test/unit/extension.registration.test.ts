// @ts-nocheck

import * as vscode from 'vscode';
import { activate, deactivate } from '../../extension';

// Jest mocks for VS Code API
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn((_k: string, def: any) => def),
    }),
  },
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
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
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  StatusBarAlignment: { Left: 1, Right: 2 },
  ViewColumn: { One: 1, Two: 2, Three: 3 },
}));

// Prepare mocks for extension dependencies
const mockDiagnosticsWatcher = {
  dispose: jest.fn(),
  triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
};
const MockDiagnosticsWatcher = jest.fn().mockImplementation(() => mockDiagnosticsWatcher);

const mockMcpServer = {
  start: jest.fn().mockResolvedValue(undefined),
  dispose: jest.fn(),
};
const MockMcpServerWrapper = jest.fn().mockImplementation(() => mockMcpServer);

const mockVsCodeApiAdapter = {};
const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeApiAdapter);

// --- MCP Registration mock with failure on first construction ---
let constructionCount = 0;
const mockRegistrationInstance = {
  refreshServerDefinitions: jest.fn(),
  dispose: jest.fn(),
};

jest.mock('@infrastructure/mcp/McpServerRegistration', () => {
  return {
    McpServerRegistration: jest.fn().mockImplementation(() => {
      constructionCount += 1;
      if (constructionCount === 1) {
        throw new Error('Intentional registration failure');
      }
      return mockRegistrationInstance;
    }),
  };
});

// Mock external classes before importing them
jest.mock('@infrastructure/mcp/McpServerWrapper');
jest.mock('@core/diagnostics/DiagnosticsWatcher');
jest.mock('@infrastructure/vscode/VsCodeApiAdapter');
jest.mock('@commands/ExtensionCommands', () => {
  return {
    ExtensionCommands: jest.fn().mockImplementation(() => ({
      registerCommands: jest.fn(),
      dispose: jest.fn(),
    })),
  };
});

// Import after mocks are set up to ensure mocked classes are used
import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { VsCodeApiAdapter } from '@infrastructure/vscode/VsCodeApiAdapter';

// Override implementations with our mocks
(McpServerWrapper as unknown as jest.Mock).mockImplementation(MockMcpServerWrapper);
(DiagnosticsWatcher as unknown as jest.Mock).mockImplementation(MockDiagnosticsWatcher);
(VsCodeApiAdapter as unknown as jest.Mock).mockImplementation(MockVsCodeApiAdapter);

describe('🎯 MCP Registration Fallback & Disposal Coverage', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    constructionCount = 0;
    mockContext = { subscriptions: [] } as any;
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('should recover from initial MCP registration failure and register fallback', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Activation should succeed despite the first registration failure
    await expect(
      activate(mockContext, {
        DiagnosticsWatcherCtor: MockDiagnosticsWatcher as any,
        McpServerWrapperCtor: MockMcpServerWrapper as any,
        VsCodeApiAdapterCtor: MockVsCodeApiAdapter as any,
      })
    ).resolves.toBeUndefined();

    // Flush timers for workspace analysis scheduling
    jest.advanceTimersByTime(4000);
    await Promise.resolve();

    // The fallback constructor should have been called twice in total
    expect(constructionCount).toBe(2);

    // Ensure activation success log exists
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('MCP Diagnostics Extension activated successfully')
    );

    consoleSpy.mockRestore();
  });

  it('should execute disposable lambdas pushed into context.subscriptions', async () => {
    await activate(mockContext, {
      DiagnosticsWatcherCtor: MockDiagnosticsWatcher as any,
      McpServerWrapperCtor: MockMcpServerWrapper as any,
      VsCodeApiAdapterCtor: MockVsCodeApiAdapter as any,
    });

    // Call every disposable manually to hit arrow functions coverage
    mockContext.subscriptions.forEach((item) => {
      if (typeof item.dispose === 'function') {
        item.dispose();
      }
    });

    // Verify underlying object dispose() methods were invoked
    expect(mockDiagnosticsWatcher.dispose).toHaveBeenCalled();
    expect(mockMcpServer.dispose).toHaveBeenCalled();
    // Note: mcpRegistration instance is not pushed to subscriptions in fallback path,
    // so dispose may not be invoked automatically. We only ensure core disposables run.
  });

  it('should handle errors while scheduling workspace analysis (line 210)', async () => {
    // Patch setTimeout to throw synchronously
    const originalSetTimeout = global.setTimeout;
    (global as any).setTimeout = jest.fn(() => {
      throw new Error('setTimeout scheduling failed');
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      activate(mockContext, {
        DiagnosticsWatcherCtor: MockDiagnosticsWatcher as any,
        McpServerWrapperCtor: MockMcpServerWrapper as any,
        VsCodeApiAdapterCtor: MockVsCodeApiAdapter as any,
      })
    ).resolves.toBeUndefined();

    // Allow any pending microtasks from the Promise chain to execute
    await Promise.resolve();
    await Promise.resolve();

    // Verify the specific scheduling error path was logged
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Restore original setTimeout
    (global as any).setTimeout = originalSetTimeout;
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    // Clean up global singletons
    deactivate();
  });
});
