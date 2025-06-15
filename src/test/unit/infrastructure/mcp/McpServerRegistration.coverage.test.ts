// @ts-nocheck
/* eslint-disable */

import { McpServerRegistration } from '@infrastructure/mcp/McpServerRegistration';
import * as path from 'path';

jest.useFakeTimers();

//---------------------------------------------
// 💡 VS Code Mock (minimal but sufficient)
//---------------------------------------------
const disposables: any[] = [];

class MockDisposable {
  dispose = jest.fn();
}

class MockEventEmitter<T> {
  public event = jest.fn();
  fire = jest.fn();
  dispose = jest.fn();
}

const mockWorkspaceFolders = [
  {
    uri: { fsPath: path.join(__dirname, 'test-workspace') },
  },
];

const writeFileSyncMock = jest.fn();
const existsSyncMock = jest.fn();
const mkdirSyncMock = jest.fn();
const statMock = jest.fn();
const statSyncMock = jest.fn();
const copyFileSyncMock = jest.fn();
const renameSyncMock = jest.fn();
const unlinkSyncMock = jest.fn();
const readFileSyncMock = jest.fn();

jest.mock('fs', () => {
  return {
    existsSync: (...args: any[]) => existsSyncMock(...args),
    mkdirSync: (...args: any[]) => mkdirSyncMock(...args),
    writeFileSync: (...args: any[]) => writeFileSyncMock(...args),
    statSync: (...args: any[]) => statSyncMock(...args),
    copyFileSync: (...args: any[]) => copyFileSyncMock(...args),
    renameSync: (...args: any[]) => renameSyncMock(...args),
    unlinkSync: (...args: any[]) => unlinkSyncMock(...args),
    readFileSync: (...args: any[]) => readFileSyncMock(...args),
  };
});

jest.mock('vscode', () => {
  return {
    workspace: {
      workspaceFolders: [],
      getConfiguration: jest.fn().mockImplementation((section?: string) => {
        if (section === 'mcp') {
          return {
            get: jest.fn((key: string) => (key === 'servers' ? {} : undefined)),
            update: jest.fn(),
          };
        }
        return {
          inspect: jest.fn(() => ({ key: 'mcp.servers' })),
          update: jest.fn(),
          get: jest.fn().mockReturnValue(undefined),
        };
      }),
      fs: {},
    },
    window: {
      showInformationMessage: jest.fn().mockResolvedValue(undefined),
      showErrorMessage: jest.fn().mockResolvedValue('Compile Extension'),
      createWebviewPanel: jest.fn(() => ({ webview: { html: '' }, dispose: jest.fn() })),
    },
    commands: {
      executeCommand: jest.fn(),
    },
    env: {
      openExternal: jest.fn(),
    },
    EventEmitter: class {
      constructor() {
        this.event = jest.fn();
      }
      fire = jest.fn();
      dispose = jest.fn();
    },
    Disposable: class {
      dispose = jest.fn();
    },
    Uri: {
      file: (p: string) => ({ fsPath: p }),
      parse: (s: string) => s,
    },
    ConfigurationTarget: { Global: 1 },
    ViewColumn: { One: 1 },
    lm: {
      registerMcpServerDefinitionProvider: jest.fn(() => ({ dispose: jest.fn() })),
    },
  };
});

// Provide minimal proposed API stub on vscode.lm
const vscode = require('vscode');
(vscode as any).lm = {
  registerMcpServerDefinitionProvider: jest.fn(() => new MockDisposable()),
};

//---------------------------------------------
// Helper: create mock extension context
//---------------------------------------------
function createMockContext() {
  return {
    extensionPath: path.join(__dirname, '..'),
    subscriptions: disposables,
  } as any;
}

//---------------------------------------------
// 🧪 TESTS
//---------------------------------------------

describe('McpServerRegistration - comprehensive coverage', () => {
  let registration: McpServerRegistration;

  beforeEach(() => {
    jest.clearAllMocks();
    existsSyncMock.mockReset();
    writeFileSyncMock.mockReset();
    mkdirSyncMock.mockReset();
    statMock.mockReset();
    statSyncMock.mockReset();
    copyFileSyncMock.mockReset();
    renameSyncMock.mockReset();
    unlinkSyncMock.mockReset();
    readFileSyncMock.mockReset();
    disposables.length = 0;
    // Patch dynamic fields on mocked vscode after hoisting issues
    vscode.workspace.workspaceFolders = mockWorkspaceFolders as any;
    vscode.workspace.fs.stat = statMock as any;
    // Ensure proposed API exists for tests that rely on it
    vscode.lm = {
      registerMcpServerDefinitionProvider: jest.fn(
        () =>
          new (class {
            dispose = jest.fn();
          })()
      ),
    } as any;
    registration = new McpServerRegistration(createMockContext());
  });

  it('tryProposedApiRegistration succeeds when proposed API present', () => {
    // Proposed API is already mocked to exist
    registration.registerMcpServerProvider();
    expect(vscode.lm.registerMcpServerDefinitionProvider).toHaveBeenCalled();
  });

  it('workspace configuration path creates .vscode/mcp.json when missing', () => {
    // Disable proposed API to force workspace path
    (vscode as any).lm.registerMcpServerDefinitionProvider = undefined;

    // Simulate missing .vscode dir + mcp.json
    existsSyncMock
      .mockReturnValueOnce(false) // .vscode
      .mockReturnValueOnce(false); // mcp.json

    registration.registerMcpServerProvider();

    expect(mkdirSyncMock).toHaveBeenCalled();
    expect(writeFileSyncMock).toHaveBeenCalled();
  });

  it('workspace configuration short-circuits when mcp.json already exists', () => {
    (vscode as any).lm.registerMcpServerDefinitionProvider = undefined;
    // .vscode exists, mcp.json exists
    existsSyncMock.mockReturnValue(true);
    registration.registerMcpServerProvider();
    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });

  it('user settings configuration adds server when absent', () => {
    (vscode as any).lm.registerMcpServerDefinitionProvider = undefined;
    // Force no workspace folders so workspace path fails → user settings path
    vscode.workspace.workspaceFolders = undefined;

    const mcpConfigMock = vscode.workspace.getConfiguration('mcp');
    // mcpConfig.get returns {}, update is jest.fn()

    registration.registerMcpServerProvider();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('MCP Diagnostics server is ready!'),
      'Setup MCP',
      'Learn More',
      'Dismiss'
    );
  });

  it('user settings configuration skips when server already exists', () => {
    (vscode as any).lm.registerMcpServerDefinitionProvider = undefined;
    vscode.workspace.workspaceFolders = undefined;

    // Patch mcpConfig.get to return existing server
    const mcpConfigMock = vscode.workspace.getConfiguration('mcp');
    mcpConfigMock.get.mockReturnValue({ mcpDiagnostics: {} });

    registration.registerMcpServerProvider();
    expect(mcpConfigMock.update).not.toHaveBeenCalled();
  });

  it('showManualSetupInstructions runs when all auto strategies fail', async () => {
    (vscode as any).lm.registerMcpServerDefinitionProvider = undefined;
    vscode.workspace.workspaceFolders = undefined;

    // Force inspect to return undefined → user settings path not supported
    vscode.workspace.getConfiguration().inspect.mockReturnValue(undefined);

    registration.registerMcpServerProvider();

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('MCP Diagnostics server is ready!'),
      'Setup MCP',
      'Learn More',
      'Dismiss'
    );
  });

  it('resolveServerDefinition returns server when script exists', async () => {
    statMock.mockResolvedValue({});
    const server = { label: 'MCP Diagnostics' } as any;
    const resolved = await (registration as any).resolveServerDefinition(server);
    expect(resolved).toBe(server);
  });

  it('resolveServerDefinition shows error when script missing', async () => {
    statMock.mockRejectedValue(new Error('missing'));
    const server = { label: 'MCP Diagnostics' } as any;
    const result = await (registration as any).resolveServerDefinition(server);
    expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('dispose cleans up disposables and EventEmitter', () => {
    // Push dummy disposable
    const dummy = new (class {
      dispose = jest.fn();
    })();
    (registration as any).disposables.push(dummy);

    registration.dispose();

    expect(dummy.dispose).toHaveBeenCalled();
  });

  it('createServerDefinitions and refreshServerDefinitions work', () => {
    const defs = (registration as any).createServerDefinitions();
    expect(defs[0]).toHaveProperty('label', 'MCP Diagnostics');

    // Spy on internal didChangeEmitter when available
    const emitter = (registration as any).didChangeEmitter;
    if (emitter) {
      const fireSpy = jest.spyOn(emitter, 'fire');
      (registration as any).refreshServerDefinitions();
      expect(fireSpy).toHaveBeenCalled();
    }
  });

  it('getMcpSetupGuideHtml returns full HTML', () => {
    const html = (registration as any).getMcpSetupGuideHtml();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('MCP Diagnostics Setup Guide');
  });

  it('deployBundledServer copies file when destination missing', async () => {
    const context = createMockContext();
    registration = new McpServerRegistration(context);

    // Mock existsSync: bundled path exists, dest path missing
    const bundledPath = path.join(context.extensionPath, 'dist', 'assets', 'mcp-server.js');
    existsSyncMock.mockImplementation((p: string) => {
      if (p === bundledPath) return true; // bundled exists
      if (p.endsWith('mcp-server.js')) return false; // dest missing
      return false;
    });

    // statSync for src returns size/time, dest not called because dest missing
    statSyncMock.mockImplementation(() => ({ size: 10, mtimeMs: 1 }));

    const result = await registration.deployBundledServer();
    expect(copyFileSyncMock).toHaveBeenCalled();
    expect(result.upgraded).toBe(true);
  });

  it('deployBundledServer skips copy when destination up-to-date', async () => {
    const context = createMockContext();
    registration = new McpServerRegistration(context);

    const bundledPath = path.join(context.extensionPath, 'dist', 'assets', 'mcp-server.js');
    const destPathSuffix = path.join('.mcp-diagnostics', 'mcp-server.js');
    existsSyncMock.mockImplementation((p: string) => {
      if (p === bundledPath) return true;
      if (p.endsWith(destPathSuffix)) return true; // dest exists
      return false;
    });
    // src and dest stats identical (size/time)
    statSyncMock.mockImplementation(() => ({ size: 10, mtimeMs: 1 }));

    const result = await registration.deployBundledServer();
    expect(copyFileSyncMock).not.toHaveBeenCalled();
    expect(result.upgraded).toBe(false);
  });

  it('injectConfiguration completes successfully with default config', async () => {
    // Spy on internal atomicWriteConfiguration to avoid real FS writes
    const atomicSpy = jest
      .spyOn(registration as any, 'atomicWriteConfiguration')
      .mockResolvedValue(undefined);

    // Mock locateConfigurationFile to return a fake path quickly
    jest.spyOn(registration as any, 'locateConfigurationFile').mockResolvedValue('/tmp/mcp.json');

    // Mock fs interactions for loadAndValidateConfiguration path
    existsSyncMock.mockReturnValue(false); // pretend config file does not exist

    await registration.injectConfiguration();

    expect(atomicSpy).toHaveBeenCalled();
  });

  it('injectConfiguration handles error and shows manual setup guide', async () => {
    const locateSpy = jest
      .spyOn(registration as any, 'locateConfigurationFile')
      .mockResolvedValue('/tmp/mcp.json');

    const showErrorMock = vscode.window.showErrorMessage as jest.Mock;
    showErrorMock.mockResolvedValue('View Manual Setup');

    jest
      .spyOn(registration as any, 'loadAndValidateConfiguration')
      .mockRejectedValue(new Error('malformed'));

    // Mock showMcpSetupGuide to avoid UI creation
    const guideSpy = jest.spyOn(registration as any, 'showMcpSetupGuide').mockImplementation();

    await registration.injectConfiguration();

    expect(locateSpy).toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    expect(guideSpy).toHaveBeenCalled();
  });

  it('showSuccessNotification handles "Test Connection" selection', async () => {
    const diagConfigMock = {
      get: jest.fn().mockReturnValue(true),
      update: jest.fn(),
    } as any;

    const originalGetConfiguration = vscode.workspace.getConfiguration.bind(vscode.workspace);
    const getConfigSpy = jest
      .spyOn(vscode.workspace, 'getConfiguration')
      .mockImplementation((section?: string) => {
        if (section === 'mcpDiagnostics') {
          return diagConfigMock;
        }
        // Delegate to original mocked implementation for all other sections
        return originalGetConfiguration(section);
      });

    // Simulate user selecting "Test Connection"
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValueOnce('Test Connection');

    await (registration as any).showSuccessNotification('User Settings');

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mcpDiagnostics.showStatus');

    getConfigSpy.mockRestore();
  });

  it('showSuccessNotification handles "Don\'t Show Again" selection', async () => {
    const diagConfigMock = {
      get: jest.fn().mockReturnValue(true),
      update: jest.fn(),
    } as any;

    const originalGetConfiguration2 = vscode.workspace.getConfiguration.bind(vscode.workspace);
    const getConfigSpy = jest
      .spyOn(vscode.workspace, 'getConfiguration')
      .mockImplementation((section?: string) => {
        if (section === 'mcpDiagnostics') {
          return diagConfigMock;
        }
        return originalGetConfiguration2(section);
      });

    // Simulate user selecting "Don't Show Again"
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValueOnce("Don't Show Again");

    await (registration as any).showSuccessNotification('User Settings');

    expect(diagConfigMock.update).toHaveBeenCalledWith(
      'showAutoRegistrationNotification',
      false,
      vscode.ConfigurationTarget.Global
    );

    getConfigSpy.mockRestore();
  });

  it('loadAndValidateConfiguration handles malformed JSON and creates backup', async () => {
    // Arrange mocks for parse error path
    const badPath = '/tmp/badConfig.json';
    existsSyncMock.mockImplementation((p: string) => p === badPath); // only badPath exists
    readFileSyncMock.mockImplementation(() => '{ invalid json'); // malformed JSON

    // Execute private method via any cast
    const result = await (registration as any).loadAndValidateConfiguration(badPath);

    // Expect default empty config returned
    expect(result).toEqual({ mcpServers: {} });

    // Expect backup file attempted
    expect(copyFileSyncMock).toHaveBeenCalledWith(badPath, `${badPath}.malformed.backup`);
  });

  it('loadAndValidateConfiguration validates correct config', async () => {
    const pathGood = '/tmp/good.json';
    const goodConfig = { mcpServers: { 'vscode-diagnostics': { command: 'node' } } };

    existsSyncMock.mockImplementation((p: string) => p === pathGood);
    readFileSyncMock.mockImplementation(() => JSON.stringify(goodConfig));

    const result = await (registration as any).loadAndValidateConfiguration(pathGood);
    expect(result).toEqual(goodConfig);
  });

  it('getServerInstallDirectory returns path under home directory', () => {
    const mockHome = path.join(path.sep, 'home', 'tester');
    jest.spyOn(require('os'), 'homedir').mockReturnValue(mockHome);

    const dir = (registration as any).getServerInstallDirectory();
    expect(dir).toBe(path.join(mockHome, '.mcp-diagnostics'));
  });

  it('createServerConfiguration includes correct defaults', () => {
    const config = (registration as any).createServerConfiguration();
    expect(config.type).toBe('stdio');
    expect(Array.isArray(config.args)).toBe(true);
    expect(config.env.NODE_ENV).toBe('production');
  });

  it('showManualSetupInstructions triggers showMcpSetupGuide on "Setup MCP" selection', async () => {
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValueOnce('Setup MCP');

    // Spy on createWebviewPanel to ensure called
    const panelSpy = vscode.window.createWebviewPanel as jest.Mock;

    await (registration as any).showManualSetupInstructions();

    expect(panelSpy).toHaveBeenCalled();
  });

  it('showManualSetupInstructions opens external link on "Learn More" selection', async () => {
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValueOnce('Learn More');

    await (registration as any).showManualSetupInstructions();

    expect(vscode.env.openExternal).toHaveBeenCalled();
  });

  it('atomicWriteConfiguration performs successful atomic write', async () => {
    const configPath = '/tmp/atomic.json';
    const tempPath = `${configPath}.tmp`;
    const configObj = { mcpServers: { 'vscode-diagnostics': { command: 'node' } } } as any;

    // Mock fs interactions for success path
    existsSyncMock.mockReturnValue(false); // no original file
    writeFileSyncMock.mockImplementation(() => {});
    readFileSyncMock.mockImplementation((p: string) => {
      if (p === tempPath || p === configPath) {
        return JSON.stringify(configObj);
      }
      return '';
    });

    await (registration as any).atomicWriteConfiguration(configPath, configObj);

    expect(writeFileSyncMock).toHaveBeenCalledWith(tempPath, expect.any(String), 'utf8');
    expect(renameSyncMock).toHaveBeenCalledWith(tempPath, configPath);
    expect(unlinkSyncMock).not.toHaveBeenCalled();
  });

  it('atomicWriteConfiguration rolls back on verification failure', async () => {
    const configPath = '/tmp/atomicFail.json';
    const tempPath = `${configPath}.tmp`;
    const backupPath = `${configPath}.backup`;
    const badConfig = { mcpServers: {} } as any; // will trigger verification failure

    // First call existsSync(configPath) => true (simulate existing file) so backup path created
    // Subsequent calls: existsSync(tempPath) etc.
    existsSyncMock.mockImplementation((p: string) => p === configPath || p === backupPath);

    // copyFileSync for backup should succeed silently
    copyFileSyncMock.mockImplementation(() => {});

    // writeFileSync called for temp path
    writeFileSyncMock.mockImplementation(() => {});

    // readFileSync behaviour
    readFileSyncMock.mockImplementation((p: string) => {
      if (p === tempPath || p === configPath) {
        return JSON.stringify(badConfig);
      }
      return '';
    });

    // renameSync just a noop
    renameSyncMock.mockImplementation(() => {});

    await expect(
      (registration as any).atomicWriteConfiguration(configPath, badConfig)
    ).rejects.toThrow('Verification failed');

    // Verify rollback attempted
    expect(copyFileSyncMock).toHaveBeenCalledWith(backupPath, configPath);
  });

  it('showMcpSetupGuide processes configureServer message', async () => {
    // Craft mock panel with message listener support
    let capturedListener: ((msg: unknown) => void) | undefined;
    const disposeMock = jest.fn();
    const panelMock = {
      webview: {
        html: '',
        onDidReceiveMessage: (listener: (...args: unknown[]) => void) => {
          capturedListener = listener as any;
        },
      },
      dispose: disposeMock,
    } as any;

    const createPanelMock = vscode.window.createWebviewPanel as jest.Mock;
    createPanelMock.mockReturnValueOnce(panelMock);

    const execSpy = vscode.commands.executeCommand as jest.Mock;

    registration.showMcpSetupGuide();

    // Invoke captured listener synchronously
    capturedListener?.({ command: 'configureServer' });

    // Allow async IIFE to resolve
    await Promise.resolve();

    expect(execSpy).toHaveBeenCalledWith('mcpDiagnostics.configureServer');
    expect(disposeMock).toHaveBeenCalled();
  });

  it('mergeWithDiagnosticsServer adds diagnostics server when missing', () => {
    const existing = { mcpServers: {} } as any;
    const merged = (registration as any).mergeWithDiagnosticsServer(existing);
    expect(merged.mcpServers['vscode-diagnostics']).toBeDefined();
  });

  it('getInstalledServerPath returns path ending with script', () => {
    const installedPath = (registration as any).getInstalledServerPath();
    expect(installedPath.endsWith('mcp-server.js')).toBe(true);
  });

  it('refreshServerDefinitions safely handles null emitter', () => {
    // Force didChangeEmitter to null
    (registration as any).didChangeEmitter = null;
    expect(() => registration.refreshServerDefinitions()).not.toThrow();
  });

  it('atomicWriteConfiguration cleans up temp file on early failure', async () => {
    const configPath = '/tmp/earlyFail.json';
    const tempPath = `${configPath}.tmp`;
    const conf = { mcpServers: { 'vscode-diagnostics': { command: 'node' } } } as any;

    existsSyncMock.mockImplementation((p: string) => p === tempPath); // temp file exists after failure

    writeFileSyncMock.mockImplementation(() => {
      throw new Error('disk full');
    });

    await expect((registration as any).atomicWriteConfiguration(configPath, conf)).rejects.toThrow(
      'disk full'
    );

    expect(unlinkSyncMock).toHaveBeenCalledWith(tempPath);
  });

  it('atomicWriteConfiguration creates backup when file exists', async () => {
    const configPath = '/tmp/backup.json';
    const tempPath = `${configPath}.tmp`;
    const backupPath = `${configPath}.backup`;
    const conf = { mcpServers: { 'vscode-diagnostics': { command: 'node' } } } as any;

    existsSyncMock.mockImplementation((p: string) => p === configPath); // existing file

    // Mock read/write operations
    writeFileSyncMock.mockImplementation(() => {});
    readFileSyncMock.mockImplementation(() => JSON.stringify(conf));
    renameSyncMock.mockImplementation(() => {});

    await (registration as any).atomicWriteConfiguration(configPath, conf);

    expect(copyFileSyncMock).toHaveBeenCalledWith(configPath, backupPath);
  });
});

// Removed artificial coverage patch to ensure genuine coverage measurement
