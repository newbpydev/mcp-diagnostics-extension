import * as path from 'path';

// ---------- VSCODE MOCKS ----------
jest.mock('vscode', () => {
  return {
    workspace: {
      getConfiguration: () => ({
        get: (_key: string, def: unknown) => def,
      }),
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
      executeCommand: jest.fn(),
    },
    StatusBarAlignment: { Left: 0, Right: 1 },
    languages: {
      onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    },
    ThemeColor: class {},
    ViewColumn: { One: 1 },
  } as unknown;
});

import * as vscode from 'vscode';

// ---------- INTERNAL MODULE MOCKS ----------

// Mock DiagnosticsWatcher to avoid real VS Code events
jest.mock('../../../src/core/diagnostics/DiagnosticsWatcher', () => {
  return {
    DiagnosticsWatcher: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      dispose: jest.fn(),
      getAllProblems: jest.fn().mockReturnValue([]),
      triggerWorkspaceAnalysis: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock ExtensionCommands to isolate behaviour
jest.mock('../../../src/commands/ExtensionCommands', () => {
  class ExtensionCommandsMock {
    public registerCommands = jest.fn();
    public dispose = jest.fn();
  }
  return { ExtensionCommands: ExtensionCommandsMock };
});

// Allow dynamic control of deployment mock per-test
import * as ServerDeployment from '../../../src/shared/deployment/ServerDeployment';
jest.mock('../../../src/shared/deployment/ServerDeployment');
const mockedDeploy = jest.mocked(ServerDeployment.deployBundledServer);

// Create a helper to mock McpServerWrapper with controllable start result
const createMcpWrapperMock = (startImpl: () => Promise<void>) => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn(startImpl),
    restart: jest.fn(),
    dispose: jest.fn(),
    isServerStarted: jest.fn().mockReturnValue(true),
  }));
};

// We will swap the mock implementation inside tests before importing extension

// ---------- TESTS ----------

describe('Extension Activation – Error Paths', () => {
  const baseContext = {
    subscriptions: [] as { dispose(): unknown }[],
    asAbsolutePath: (rel: string) => path.join('/ext', rel),
  } as unknown as vscode.ExtensionContext;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should continue activation when deployment fails', async () => {
    // Arrange mocks
    mockedDeploy.mockRejectedValueOnce(new Error('deploy fail'));

    // Mock McpServerWrapper with successful start
    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return { McpServerWrapper: createMcpWrapperMock(async () => Promise.resolve()) };
    });

    // Re-import extension inside isolated module to apply mocks
    const { activate } = await import('../../../src/extension');

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act
    await expect(activate(baseContext)).resolves.not.toThrow();

    // Assert – deployment error logged
    const loggedDeployError = consoleErrorSpy.mock.calls.some((c) =>
      String(c[0]).includes('Bundled server deployment failed')
    );
    expect(loggedDeployError).toBe(true);
  });

  it('should surface error when MCP server start fails', async () => {
    // Arrange mocks
    mockedDeploy.mockResolvedValueOnce({ installedPath: '/some', upgraded: false });

    // MCP wrapper mock with failing start
    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return {
        McpServerWrapper: createMcpWrapperMock(async () => {
          throw new Error('start failed');
        }),
      };
    });

    const { activate } = await import('../../../src/extension');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act / Assert
    await expect(activate(baseContext)).rejects.toThrow('start failed');

    const serverStartErrorLogged = consoleErrorSpy.mock.calls.some((c) =>
      String(c[0]).includes('MCP Server start failed')
    );
    expect(serverStartErrorLogged).toBe(true);
  });
});
