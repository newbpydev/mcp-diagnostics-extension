import * as path from 'path';

// VSCode mocks
jest.mock('vscode', () => {
  return {
    workspace: { getConfiguration: () => ({ get: (_: string, v: unknown) => v }) },
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
    commands: { registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }) },
    StatusBarAlignment: { Right: 1 },
    languages: { onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }) },
    ThemeColor: class {},
    ViewColumn: { One: 1 },
  } as unknown;
});

import * as vscode from 'vscode';

import * as ServerDeployment from '../../../src/shared/deployment/ServerDeployment';
jest.mock('../../../src/shared/deployment/ServerDeployment');
const mockedDeploy = jest.mocked(ServerDeployment.deployBundledServer);

// create disposable spies
const createMcpWrapperMock = () => {
  const dispose = jest.fn();
  return {
    start: jest.fn().mockResolvedValue(undefined),
    dispose,
    restart: jest.fn(),
    isServerStarted: jest.fn().mockReturnValue(true),
    __disposeSpy: dispose,
  };
};

// Mock ExtensionCommands to track dispose
jest.mock('../../../src/commands/ExtensionCommands', () => {
  return {
    ExtensionCommands: jest.fn().mockImplementation(() => ({
      registerCommands: jest.fn(),
      dispose: jest.fn(),
      __disposeSpy: jest.fn(),
    })),
  };
});

const baseContext = {
  subscriptions: [] as { dispose(): unknown }[],
  asAbsolutePath: (rel: string) => path.join('/ext', rel),
} as unknown as vscode.ExtensionContext;

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe('Extension Deactivation path', () => {
  it('disposes resources without throwing', async () => {
    mockedDeploy.mockResolvedValueOnce({ installedPath: '/p', upgraded: false });

    // Provide McpServerWrapper mock instance with dispose spy
    const wrapperInstance = createMcpWrapperMock();
    jest.doMock('../../../src/infrastructure/mcp/McpServerWrapper', () => {
      return { McpServerWrapper: jest.fn(() => wrapperInstance) };
    });

    const { activate, deactivate } = await import('../../../src/extension');

    await activate(baseContext);

    expect(() => deactivate()).not.toThrow();
  });
});
