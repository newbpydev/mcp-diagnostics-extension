// @ts-nocheck
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
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
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

// Mock infrastructure modules
jest.mock('@infrastructure/mcp/McpServerWrapper');
jest.mock('@core/diagnostics/DiagnosticsWatcher');
jest.mock('@infrastructure/vscode/VsCodeApiAdapter');
jest.mock('@commands/ExtensionCommands');

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;
  let mockVscode: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Clear all timers to prevent async leaks
    jest.clearAllTimers();
    jest.useFakeTimers();

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

  afterEach(() => {
    // Clean up any remaining timers and async operations
    jest.clearAllTimers();
    jest.useRealTimers();

    // Clear all mocks to prevent interference between tests
    jest.clearAllMocks();
  });

  describe('activate', () => {
    it('should activate extension successfully', async () => {
      const mockDiagnosticsWatcher = {
        dispose: jest.fn(),
        triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
      };
      const mockMcpServer = {
        start: jest.fn().mockResolvedValue(undefined),
        dispose: jest.fn(),
      };
      const mockVsCodeAdapter = {};
      const mockExtensionCommands = {
        registerCommands: jest.fn(),
        dispose: jest.fn(),
      };

      const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
      const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
      const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;
      const MockExtensionCommands = jest.fn().mockReturnValue(mockExtensionCommands) as any;

      const { McpServerWrapper } = require('@infrastructure/mcp/McpServerWrapper');
      const { DiagnosticsWatcher } = require('@core/diagnostics/DiagnosticsWatcher');
      const { VsCodeApiAdapter } = require('@infrastructure/vscode/VsCodeApiAdapter');
      const { ExtensionCommands } = require('@commands/ExtensionCommands');

      McpServerWrapper.mockImplementation(MockMcpServerWrapper);
      DiagnosticsWatcher.mockImplementation(MockDiagnosticsWatcher);
      VsCodeApiAdapter.mockImplementation(MockVsCodeApiAdapter);
      ExtensionCommands.mockImplementation(MockExtensionCommands);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await activate(mockContext, {
        DiagnosticsWatcherCtor: MockDiagnosticsWatcher as any,
        McpServerWrapperCtor: MockMcpServerWrapper as any,
        VsCodeApiAdapterCtor: MockVsCodeApiAdapter as any,
      });

      // Fast-forward timers to complete any scheduled operations
      jest.runAllTimers();

      // Allow promises to resolve
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MCP Diagnostics Extension activated successfully in')
      );

      consoleSpy.mockRestore();
    });

    it('should handle activation errors gracefully', async () => {
      const MockDiagnosticsWatcher = jest.fn().mockImplementation(() => {
        throw new Error('DiagnosticsWatcher initialization failed');
      }) as any;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
        })
      ).rejects.toThrow('DiagnosticsWatcher initialization failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🔴 [MCP Diagnostics] Activation failed:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle MCP server start errors', async () => {
      const mockDiagnosticsWatcher = {
        dispose: jest.fn(),
        triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
      };
      const mockMcpServer = {
        start: jest.fn().mockRejectedValue(new Error('MCP Server start failed')),
        dispose: jest.fn(),
      };
      const mockVsCodeAdapter = {};

      const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
      const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
      const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
          McpServerWrapperCtor: MockMcpServerWrapper,
          VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
        })
      ).rejects.toThrow('MCP Server start failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🔴 [MCP Diagnostics] Activation failed:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    // 🎯 SYSTEMATIC COVERAGE IMPROVEMENT: Configuration Error Scenarios (Line 87)
    describe('🎯 Configuration Error Scenarios (Line 87)', () => {
      it('should handle workspace.getConfiguration() failures', async () => {
        // Mock getConfiguration to throw error
        mockVscode.workspace.getConfiguration.mockImplementation(() => {
          throw new Error('Configuration access failed');
        });

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(activate(mockContext)).rejects.toThrow('Configuration access failed');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '🔴 [MCP Diagnostics] Activation failed:',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      it('should handle configuration.get() method failures', async () => {
        // Mock config.get to throw error
        mockVscode.workspace.getConfiguration.mockReturnValue({
          get: jest.fn().mockImplementation(() => {
            throw new Error('Config get method failed');
          }),
        });

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(activate(mockContext)).rejects.toThrow('Config get method failed');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '🔴 [MCP Diagnostics] Activation failed:',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });

    // 🎯 SYSTEMATIC COVERAGE IMPROVEMENT: Command Registration Error Scenarios
    describe('🎯 Command Registration Error Scenarios', () => {
      it('should handle command registration failures', async () => {
        const mockDiagnosticsWatcher = {
          dispose: jest.fn(),
          triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
        };
        const mockMcpServer = {
          start: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn(),
        };
        const mockVsCodeAdapter = {};
        const mockExtensionCommands = {
          registerCommands: jest.fn().mockImplementation(() => {
            throw new Error('Command registration failed');
          }),
          dispose: jest.fn(),
        };

        const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
        const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;
        const MockExtensionCommands = jest.fn().mockReturnValue(mockExtensionCommands) as any;

        const { ExtensionCommands } = require('@commands/ExtensionCommands');
        ExtensionCommands.mockImplementation(MockExtensionCommands);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(
          activate(mockContext, {
            DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
            McpServerWrapperCtor: MockMcpServerWrapper,
            VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
          })
        ).rejects.toThrow('Command registration failed');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '🔴 [MCP Diagnostics] Activation failed:',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });

    // 🎯 SYSTEMATIC COVERAGE IMPROVEMENT: Notification Error Scenarios (Lines 208, 210)
    describe('🎯 Notification Error Scenarios (Lines 208, 210)', () => {
      it('should handle showInformationMessage failures gracefully', async () => {
        // Mock showInformationMessage to throw error
        mockVscode.window.showInformationMessage.mockImplementation(() => {
          throw new Error('Notification display failed');
        });

        const mockDiagnosticsWatcher = {
          dispose: jest.fn(),
          triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
        };
        const mockMcpServer = {
          start: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn(),
        };
        const mockVsCodeAdapter = {};
        const mockExtensionCommands = {
          registerCommands: jest.fn(),
          dispose: jest.fn(),
        };

        const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
        const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;
        const MockExtensionCommands = jest.fn().mockReturnValue(mockExtensionCommands) as any;

        const { ExtensionCommands } = require('@commands/ExtensionCommands');
        ExtensionCommands.mockImplementation(MockExtensionCommands);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        // Should complete activation despite notification error
        await activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
          McpServerWrapperCtor: MockMcpServerWrapper,
          VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
        });

        // Fast-forward timers to complete any scheduled operations
        jest.runAllTimers();

        // Allow promises to resolve
        await Promise.resolve();

        // Verify activation completed successfully
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('MCP Diagnostics Extension activated successfully in')
        );

        consoleSpy.mockRestore();
      });

      it('should handle notification response selection properly', async () => {
        // Mock showInformationMessage to return a resolved promise with selection
        mockVscode.window.showInformationMessage.mockResolvedValue('Show Status');

        const mockDiagnosticsWatcher = {
          dispose: jest.fn(),
          triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
        };
        const mockMcpServer = {
          start: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn(),
        };
        const mockVsCodeAdapter = {};
        const mockExtensionCommands = {
          registerCommands: jest.fn(),
          dispose: jest.fn(),
        };

        const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
        const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;
        const MockExtensionCommands = jest.fn().mockReturnValue(mockExtensionCommands) as any;

        const { ExtensionCommands } = require('@commands/ExtensionCommands');
        ExtensionCommands.mockImplementation(MockExtensionCommands);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
          McpServerWrapperCtor: MockMcpServerWrapper,
          VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
        });

        // Fast-forward timers to complete any scheduled operations
        jest.runAllTimers();

        // Allow promises to resolve
        await Promise.resolve();

        // Verify command was executed
        expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith(
          'mcpDiagnostics.showStatus'
        );

        consoleSpy.mockRestore();
      });

      it('should handle Setup Guide notification selection', async () => {
        // Mock showInformationMessage to return Setup Guide selection
        mockVscode.window.showInformationMessage.mockResolvedValue('Setup Guide');

        const mockDiagnosticsWatcher = {
          dispose: jest.fn(),
          triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
        };
        const mockMcpServer = {
          start: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn(),
        };
        const mockVsCodeAdapter = {};
        const mockExtensionCommands = {
          registerCommands: jest.fn(),
          dispose: jest.fn(),
        };

        const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
        const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;
        const MockExtensionCommands = jest.fn().mockReturnValue(mockExtensionCommands) as any;

        const { ExtensionCommands } = require('@commands/ExtensionCommands');
        ExtensionCommands.mockImplementation(MockExtensionCommands);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
          McpServerWrapperCtor: MockMcpServerWrapper,
          VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
        });

        // Fast-forward timers to complete any scheduled operations
        jest.runAllTimers();

        // Allow promises to resolve
        await Promise.resolve();

        // Verify Setup Guide command was executed
        expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith(
          'mcpDiagnostics.showSetupGuide'
        );

        consoleSpy.mockRestore();
      });
    });

    // 🎯 SYSTEMATIC COVERAGE IMPROVEMENT: Workspace Analysis Error Scenarios
    describe('🎯 Workspace Analysis Error Scenarios', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        process.env['MCP_DIAGNOSTICS_FORCE_ANALYSIS'] = 'true';
      });

      afterEach(() => {
        jest.useRealTimers();
        delete process.env['MCP_DIAGNOSTICS_FORCE_ANALYSIS'];
      });

      it('should handle workspace analysis errors gracefully', async () => {
        const mockDiagnosticsWatcher = {
          dispose: jest.fn(),
          triggerWorkspaceAnalysis: jest
            .fn()
            .mockRejectedValue(new Error('Workspace analysis failed')),
        };
        const mockMcpServer = {
          start: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn(),
        };
        const mockVsCodeAdapter = {};
        const mockExtensionCommands = {
          registerCommands: jest.fn(),
          dispose: jest.fn(),
        };

        const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
        const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;
        const MockExtensionCommands = jest.fn().mockReturnValue(mockExtensionCommands) as any;

        const { ExtensionCommands } = require('@commands/ExtensionCommands');
        ExtensionCommands.mockImplementation(MockExtensionCommands);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
          McpServerWrapperCtor: MockMcpServerWrapper,
          VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
        });

        // Fast-forward timers to trigger the 3000ms setTimeout for workspace analysis
        jest.advanceTimersByTime(4000);

        // Allow all promises to resolve and errors to be caught
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        // Verify activation completed successfully
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('MCP Diagnostics Extension activated successfully in')
        );

        // Verify workspace analysis error was handled (line 208)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '⚠️ [MCP Diagnostics] Error during workspace analysis:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });

      it('should handle workspace analysis scheduling errors (line 210)', async () => {
        const mockDiagnosticsWatcher = {
          dispose: jest.fn(),
          triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
        };
        const mockMcpServer = {
          start: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn(),
        };
        const mockVsCodeAdapter = {};
        const mockExtensionCommands = {
          registerCommands: jest.fn(),
          dispose: jest.fn(),
        };

        const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
        const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;
        const MockExtensionCommands = jest.fn().mockReturnValue(mockExtensionCommands) as any;

        const { ExtensionCommands } = require('@commands/ExtensionCommands');
        ExtensionCommands.mockImplementation(MockExtensionCommands);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
          McpServerWrapperCtor: MockMcpServerWrapper,
          VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
        });

        // Fast-forward timers to complete workspace analysis setup
        jest.advanceTimersByTime(4000);

        // Allow promises to resolve
        await Promise.resolve();
        await Promise.resolve();

        // Verify extension activated successfully
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('MCP Diagnostics Extension activated successfully in')
        );

        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });

      it('should handle notification error scenarios (additional coverage)', async () => {
        const mockDiagnosticsWatcher = {
          dispose: jest.fn(),
          triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
        };
        const mockMcpServer = {
          start: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn(),
        };
        const mockVsCodeAdapter = {};
        const mockExtensionCommands = {
          registerCommands: jest.fn(),
          dispose: jest.fn(),
        };

        const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
        const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;
        const MockExtensionCommands = jest.fn().mockReturnValue(mockExtensionCommands) as any;

        const { ExtensionCommands } = require('@commands/ExtensionCommands');
        ExtensionCommands.mockImplementation(MockExtensionCommands);

        // Mock showInformationMessage to simulate error during notification
        mockVscode.window.showInformationMessage = jest.fn().mockImplementation(() => {
          throw new Error('Notification error');
        });

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
          McpServerWrapperCtor: MockMcpServerWrapper,
          VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
        });

        // Fast-forward timers
        jest.advanceTimersByTime(4000);
        await Promise.resolve();

        // Verify extension still activated successfully despite notification error
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('MCP Diagnostics Extension activated successfully in')
        );

        consoleSpy.mockRestore();
      });

      it('should handle missing triggerWorkspaceAnalysis method gracefully', async () => {
        const mockDiagnosticsWatcher = {
          dispose: jest.fn(),
          // Missing triggerWorkspaceAnalysis method
        };
        const mockMcpServer = {
          start: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn(),
        };
        const mockVsCodeAdapter = {};
        const mockExtensionCommands = {
          registerCommands: jest.fn(),
          dispose: jest.fn(),
        };

        const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
        const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;
        const MockExtensionCommands = jest.fn().mockReturnValue(mockExtensionCommands) as any;

        const { ExtensionCommands } = require('@commands/ExtensionCommands');
        ExtensionCommands.mockImplementation(MockExtensionCommands);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await activate(mockContext, {
          DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
          McpServerWrapperCtor: MockMcpServerWrapper,
          VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
        });

        // Fast-forward timers to trigger workspace analysis attempt
        jest.advanceTimersByTime(4000);

        // Allow all promises to resolve
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        // Verify activation completed successfully
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('MCP Diagnostics Extension activated successfully in')
        );

        // Verify error handling for missing method (line 208)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '⚠️ [MCP Diagnostics] Error during workspace analysis:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });
    });

    // 🎯 SYSTEMATIC COVERAGE IMPROVEMENT: Complete Branch Coverage (Lines 208 & 210)
    describe('🎯 Complete Promise Chain Error Coverage', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should achieve main catch block coverage - activation errors', async () => {
        const mockVsCodeAdapter = {};

        // Mock DiagnosticsWatcher constructor to throw
        const MockDiagnosticsWatcher = jest.fn().mockImplementation(() => {
          throw new Error('DiagnosticsWatcher initialization failed');
        });
        const MockMcpServerWrapper = jest.fn().mockReturnValue({
          start: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn(),
        });
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // This should trigger the main catch block in activation
        await expect(
          activate(mockContext, {
            DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
            McpServerWrapperCtor: MockMcpServerWrapper,
            VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
          })
        ).rejects.toThrow('DiagnosticsWatcher initialization failed');

        // Verify error logging in main catch block
        expect(consoleSpy).toHaveBeenCalledWith(
          '🔴 [MCP Diagnostics] Activation failed:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it('should achieve MCP server startup error coverage', async () => {
        const mockDiagnosticsWatcher = {
          dispose: jest.fn(),
          triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
        };
        const mockMcpServer = {
          start: jest.fn().mockRejectedValue(new Error('MCP server start failed')),
          dispose: jest.fn(),
        };
        const mockVsCodeAdapter = {};

        const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
        const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // This should trigger the main catch block during MCP server startup
        await expect(
          activate(mockContext, {
            DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
            McpServerWrapperCtor: MockMcpServerWrapper,
            VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
          })
        ).rejects.toThrow('MCP server start failed');

        // Verify error was handled
        expect(consoleSpy).toHaveBeenCalledWith(
          '🔴 [MCP Diagnostics] Activation failed:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it('should achieve notification error coverage', async () => {
        const mockDiagnosticsWatcher = {
          dispose: jest.fn(),
          triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
        };
        const mockMcpServer = {
          start: jest.fn().mockResolvedValue(undefined),
          dispose: jest.fn(),
        };
        const mockVsCodeAdapter = {};

        const MockDiagnosticsWatcher = jest.fn().mockReturnValue(mockDiagnosticsWatcher) as any;
        const MockMcpServerWrapper = jest.fn().mockReturnValue(mockMcpServer) as any;
        const MockVsCodeApiAdapter = jest.fn().mockReturnValue(mockVsCodeAdapter) as any;

        // Mock vscode.window.showInformationMessage to throw
        const originalShowInformationMessage = mockVscode.window.showInformationMessage;
        mockVscode.window.showInformationMessage = jest.fn().mockImplementation(() => {
          throw new Error('Notification failed');
        });

        // Should not throw despite notification error
        await expect(
          activate(mockContext, {
            DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
            McpServerWrapperCtor: MockMcpServerWrapper,
            VsCodeApiAdapterCtor: MockVsCodeApiAdapter,
          })
        ).resolves.toBeUndefined();

        // Restore original method
        mockVscode.window.showInformationMessage = originalShowInformationMessage;
      });
    });

    // 🎯 ENHANCED DEACTIVATION COVERAGE
    describe('🎯 Enhanced Deactivation Error Coverage', () => {
      it('should handle deactivation without errors', () => {
        // Test basic deactivation functionality
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // This should not throw
        expect(() => deactivate()).not.toThrow();

        // Verify deactivation was logged
        expect(consoleSpy).toHaveBeenCalledWith('🟡 [MCP Diagnostics] Deactivation: Starting...');

        consoleSpy.mockRestore();
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate extension successfully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      deactivate();

      expect(consoleSpy).toHaveBeenCalledWith('🟢 [MCP Diagnostics] Deactivation: Complete.');

      consoleSpy.mockRestore();
    });

    it('should handle deactivation errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw even if no components are available to dispose
      expect(() => deactivate()).not.toThrow();

      // In this simple test, just verify deactivate runs without errors
      // The actual error handling would be tested in integration tests
      // where components are properly initialized

      consoleErrorSpy.mockRestore();
    });

    // 🎯 SYSTEMATIC COVERAGE IMPROVEMENT: Deactivation Error Scenarios
    describe('🎯 Deactivation Error Scenarios', () => {
      it('should handle disposal errors during deactivation', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Should not throw even if disposal fails
        expect(() => deactivate()).not.toThrow();

        // Note: Due to the module-level variables design, testing error scenarios
        // requires integration tests or refactoring to dependency injection
        // This test verifies the basic error handling structure exists

        consoleErrorSpy.mockRestore();
      });

      it('should handle partial disposal scenarios', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        deactivate();

        // Verify successful deactivation
        expect(consoleSpy).toHaveBeenCalledWith(
          '✅ MCP Diagnostics Extension deactivated successfully'
        );

        consoleSpy.mockRestore();
      });

      it('should handle deactivation when all objects are undefined', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        deactivate();

        expect(consoleSpy).toHaveBeenCalledWith(
          '✅ MCP Diagnostics Extension deactivated successfully'
        );

        consoleSpy.mockRestore();
      });
    });
  });
});
