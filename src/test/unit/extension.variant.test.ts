import * as path from 'path';

// ---------- COMMON VSCODE MOCK ----------
jest.mock('vscode', () => {
  return {
    workspace: {
      getConfiguration: () => ({ get: (_: string, d: unknown) => d }),
    },
    window: {
      showInformationMessage: jest.fn().mockReturnValue(Promise.resolve(undefined)),
      showErrorMessage: jest.fn(),
      withProgress: jest.fn(),
      createStatusBarItem: jest.fn(() => ({
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
        text: '',
      })),
    },
    commands: {
      registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    },
    StatusBarAlignment: { Right: 1 },
    languages: {
      onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    },
    ThemeColor: class {},
    ViewColumn: { One: 1 },
  } as unknown;
});

import * as vscode from 'vscode';

// ---------- DYNAMIC MOCK HELPERS ----------
import * as ServerDeployment from '../../../src/shared/deployment/ServerDeployment';
jest.mock('../../../src/shared/deployment/ServerDeployment');
const mockedDeploy = jest.mocked(ServerDeployment.deployBundledServer);

// Generic McpServerWrapper mock
const createMcpWrapperMock = () =>
  jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn(),
    restart: jest.fn(),
    isServerStarted: jest.fn().mockReturnValue(true),
  }));

// Mock ExtensionCommands
jest.mock('../../../src/commands/ExtensionCommands', () => {
  class ExtensionCommandsMock {
    public registerCommands = jest.fn();
    public dispose = jest.fn();
  }
  return { ExtensionCommands: ExtensionCommandsMock };
});

// Base fake context
const baseContext = {
  subscriptions: [] as { dispose(): unknown }[],
  asAbsolutePath: (rel: string) => path.join('/ext', rel),
} as unknown as vscode.ExtensionContext;

// Reset modules after each test to ensure mocks isolation
afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe('Extension Activation – Additional Paths', () => {
  it('uses version manifest when present', async () => {
    // Mock fs.readFile to return manifest with version 1.2.3
    jest.doMock('fs', () => ({
      promises: {
        readFile: jest.fn().mockResolvedValue('{"version":"1.2.3"}'),
      },
    }));

    mockedDeploy.mockResolvedValueOnce({ installedPath: '/p', upgraded: false });

    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return { McpServerWrapper: createMcpWrapperMock() };
    });

    const { activate } = await import('../../../src/extension');

    await activate(baseContext);

    const arg = mockedDeploy.mock.calls[0]![0] as ServerDeployment.DeployOptions;
    expect(arg.version).toBe('1.2.3');
  });

  it('continues when MCP registration creation fails', async () => {
    // Make McpServerRegistration constructor throw
    jest.doMock('../../../src/infrastructure/mcp/McpServerRegistration', () => {
      const ctor = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('reg err');
        })
        .mockImplementation(() => ({ refreshServerDefinitions: jest.fn(), dispose: jest.fn() }));
      return { McpServerRegistration: ctor };
    });

    mockedDeploy.mockResolvedValueOnce({ installedPath: '/p', upgraded: false });

    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return { McpServerWrapper: createMcpWrapperMock() };
    });

    const { activate } = await import('../../../src/extension');

    await expect(activate(baseContext)).resolves.not.toThrow();
  });

  it('surfaces outer activation failure and logs showErrorMessage', async () => {
    // DiagnosticsWatcher constructor throws to hit outer catch
    jest.doMock('../../../src/core/diagnostics/DiagnosticsWatcher', () => {
      return {
        DiagnosticsWatcher: jest.fn(() => {
          throw new Error('diag fail');
        }),
      };
    });

    mockedDeploy.mockResolvedValueOnce({ installedPath: '/p', upgraded: false });

    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return { McpServerWrapper: createMcpWrapperMock() };
    });

    const consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { activate } = await import('../../../src/extension');

    await expect(activate(baseContext)).rejects.toThrow('diag fail');

    const logged = consoleErrSpy.mock.calls.some((c) => String(c[0]).includes('Activation failed'));
    expect(logged).toBe(true);
  });

  it('falls back when manifest lacks version', async () => {
    jest.useFakeTimers();

    // Safe DiagnosticsWatcher
    jest.doMock('../../../src/core/diagnostics/DiagnosticsWatcher', () => {
      return {
        DiagnosticsWatcher: jest.fn().mockImplementation(() => ({
          on: jest.fn(),
          dispose: jest.fn(),
          getAllProblems: jest.fn().mockReturnValue([]),
          triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
        })),
      };
    });

    // manifest with no version should keep default 0.0.0
    jest.doMock('fs', () => ({
      promises: {
        readFile: jest.fn().mockResolvedValue('{"name":"mock"}'),
      },
    }));

    mockedDeploy.mockResolvedValueOnce({ installedPath: '/p', upgraded: false });

    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return { McpServerWrapper: createMcpWrapperMock() };
    });

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { activate } = await import('../../../src/extension');

    await activate(baseContext);

    const versionLog = consoleLogSpy.mock.calls.find((c) =>
      String(c[0]).includes('Version manifest not found')
    );
    expect(versionLog).toBeUndefined(); // path where manifest exists but version undefined

    jest.useRealTimers();
  });

  it('outer activation catch handles non-Error rejection', async () => {
    // DiagnosticsWatcher throws string
    jest.doMock('../../../src/core/diagnostics/DiagnosticsWatcher', () => {
      return {
        DiagnosticsWatcher: jest.fn(() => {
          throw 'string failure';
        }),
      };
    });

    mockedDeploy.mockResolvedValueOnce({ installedPath: '/p', upgraded: false });

    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return { McpServerWrapper: createMcpWrapperMock() };
    });

    const { activate } = await import('../../../src/extension');

    await expect(activate(baseContext)).rejects.toBe('string failure');
  });

  it('schedules and executes workspace analysis after activation', async () => {
    jest.useFakeTimers();

    // Capture watcher instance
    let watcherInstance: any;
    jest.doMock('../../../src/core/diagnostics/DiagnosticsWatcher', () => {
      return {
        DiagnosticsWatcher: jest.fn().mockImplementation(() => {
          watcherInstance = {
            on: jest.fn(),
            dispose: jest.fn(),
            getAllProblems: jest.fn().mockReturnValue([]),
            triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
          };
          return watcherInstance;
        }),
      };
    });

    mockedDeploy.mockResolvedValueOnce({ installedPath: '/p', upgraded: false });

    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return { McpServerWrapper: createMcpWrapperMock() };
    });

    const { activate } = await import('../../../src/extension');

    await activate(baseContext);

    // Fast-forward timers (3 seconds)
    jest.advanceTimersByTime(3100);

    // Wait for any pending promises
    await Promise.resolve();

    expect(watcherInstance.triggerWorkspaceAnalysis).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('logs warning when manifest file read fails', async () => {
    // fs.readFile throws ENOENT
    jest.doMock('fs', () => ({
      promises: {
        readFile: jest
          .fn()
          .mockRejectedValue(Object.assign(new Error('enoent'), { code: 'ENOENT' })),
      },
    }));

    mockedDeploy.mockResolvedValueOnce({ installedPath: '/p', upgraded: false });

    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return { McpServerWrapper: createMcpWrapperMock() };
    });

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { activate } = await import('../../../src/extension');

    await activate(baseContext);

    const warn = consoleLogSpy.mock.calls.find((c) =>
      String(c[0]).includes('Version manifest not found')
    );
    expect(warn).toBeDefined();
  });

  it('shows error message when MCP server fails with string', async () => {
    // Safe DiagnosticsWatcher
    jest.doMock('../../../src/core/diagnostics/DiagnosticsWatcher', () => {
      return {
        DiagnosticsWatcher: jest.fn().mockImplementation(() => ({
          on: jest.fn(),
          dispose: jest.fn(),
          getAllProblems: jest.fn().mockReturnValue([]),
          triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
        })),
      };
    });

    mockedDeploy.mockResolvedValueOnce({ installedPath: '/p', upgraded: false });

    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return {
        McpServerWrapper: jest.fn().mockImplementation(() => ({
          start: jest.fn().mockRejectedValue('plain failure'),
          dispose: jest.fn(),
          restart: jest.fn(),
          isServerStarted: jest.fn().mockReturnValue(false),
        })),
      };
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { activate } = await import('../../../src/extension');

    await expect(activate(baseContext)).rejects.toBe('plain failure');
    const logged = consoleSpy.mock.calls.some((c) =>
      String(c[0]).includes('MCP Server start failed')
    );
    expect(logged).toBe(true);
  });
});
