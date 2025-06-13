import * as path from 'path';

// Mock VS Code API before importing extension
jest.mock('vscode', () => {
  return {
    workspace: {
      getConfiguration: () => ({
        get: (_key: string, def: unknown) => def, // return default value
      }),
    },
    window: {
      showInformationMessage: jest.fn().mockReturnValue(Promise.resolve(undefined)),
      showErrorMessage: jest.fn(),
      withProgress: jest.fn(),
      createStatusBarItem: jest.fn(() => {
        return {
          show: jest.fn(),
          hide: jest.fn(),
          dispose: jest.fn(),
          text: '',
        } as unknown as vscode.StatusBarItem;
      }),
    },
    commands: {
      registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      executeCommand: jest.fn(),
    },
    StatusBarAlignment: { Left: 0, Right: 1 },
    languages: {
      onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    },
  } as unknown;
});

import * as vscode from 'vscode';
import { activate } from '../../../src/extension';
import * as ServerDeployment from '../../../src/shared/deployment/ServerDeployment';

jest.mock('../../../src/shared/deployment/ServerDeployment');

// Mock ExtensionCommands to isolate deployment behaviour
jest.mock('../../../src/commands/ExtensionCommands', () => {
  class ExtensionCommandsMock {
    public registerCommands = jest.fn();
    public dispose = jest.fn();
    constructor() {}
  }
  return { ExtensionCommands: ExtensionCommandsMock };
});

describe('Extension Activation – Server Deployment', () => {
  const mockContext = {
    subscriptions: [] as { dispose(): unknown }[],
    asAbsolutePath: (rel: string) => path.join('/ext', rel),
  } as unknown as vscode.ExtensionContext;

  const mockedDeploy = jest.mocked(ServerDeployment.deployBundledServer);

  beforeEach(() => {
    jest.resetAllMocks();
    mockedDeploy.mockResolvedValue({
      installedPath: '/home/user/.mcp-diagnostics/mcp/mcp-server.js',
      upgraded: true,
    });
  });

  it('should deploy bundled server before starting MCP server', async () => {
    await activate(mockContext);

    expect(mockedDeploy).toHaveBeenCalledTimes(1);
    const arg = mockedDeploy.mock.calls[0]![0] as ServerDeployment.DeployOptions;
    const normalized = arg.bundledPath.replace(/\\/g, '/');
    expect(normalized).toContain('dist/assets/mcp-server.js');
    expect(arg.version).toBeDefined();
  });

  it('should log "server-deployed" event via Console Ninja/console.log', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await activate(mockContext);

    const serverDeployedLogged = consoleSpy.mock.calls.some((c) =>
      String(c[0]).includes('server-deployed')
    );
    expect(serverDeployedLogged).toBe(true);
    consoleSpy.mockRestore();
  });
});
