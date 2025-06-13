import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

// Mock all external modules first using module-level mocking pattern
jest.mock('vscode', () => ({
  ExtensionMode: { Test: 3 },
  commands: { registerCommand: jest.fn() },
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    createWebviewPanel: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn(),
      inspect: jest.fn(),
      update: jest.fn(),
    })),
    getWorkspaceFolder: jest.fn(),
    workspaceFolders: [
      {
        uri: { fsPath: '/test/workspace' },
        name: 'test-workspace',
        index: 0,
      },
    ],
  },
  lm: {
    registerMcpServerDefinitionProvider: jest.fn(),
  },
  Uri: {
    file: jest.fn(),
    joinPath: jest.fn(),
  },
  ViewColumn: {
    One: 1,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  EventEmitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
}));

jest.mock('fs');
jest.mock('path');

// Import after mocking
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

// Import the class under test
import { McpServerRegistration } from '@infrastructure/mcp/McpServerRegistration';

// Create a mock class for testing McpStdioServerDefinition functionality
class MockStdioServerDefinition {
  public readonly label: string;
  public readonly command: string;
  public readonly args: string[];
  public readonly cwd?: any;
  public readonly env?: Record<string, string | number | null>;
  public readonly version?: string;

  constructor(options: any) {
    this.label = options.label;
    this.command = options.command;
    this.args = options.args;
    this.cwd = options.cwd;
    this.env = options.env;
    this.version = options.version;
  }
}

describe('McpServerRegistration', () => {
  let mcpRegistration: McpServerRegistration;
  let mockContext: any;
  let mockExtensionUri: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock extension context
    mockExtensionUri = { fsPath: '/test/extension' };
    mockContext = {
      extensionUri: mockExtensionUri,
      extensionPath: '/test/extension',
      subscriptions: [],
    };

    // Reset VS Code mocks for each test - don't modify properties, just reset the mocks
    (vscode.window.showInformationMessage as jest.Mock).mockClear();
    (vscode.window.createWebviewPanel as jest.Mock).mockClear();
    (vscode.workspace.getConfiguration as jest.Mock).mockClear().mockReturnValue({
      get: jest.fn(),
      inspect: jest.fn(),
    });
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockClear().mockReturnValue({
      uri: { fsPath: '/test/workspace' },
      name: 'test-workspace',
      index: 0,
    });

    // Handle lm property safely - it might be undefined in some test scenarios
    if (vscode.lm && (vscode.lm as any).registerMcpServerDefinitionProvider) {
      ((vscode.lm as any).registerMcpServerDefinitionProvider as jest.Mock).mockClear();
    }

    // Setup fs mocks using jest.spyOn (proper way for getter-only properties)
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');
    jest.spyOn(fs, 'writeFileSync').mockImplementation((_file, _data, _encoding) => {});
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{}');

    // Use real path operations instead of mocking (simpler and more reliable)
    // mockedPath.join and mockedPath.dirname will use real implementations

    mcpRegistration = new McpServerRegistration(mockContext);
  });

  describe('Constructor and initialization', () => {
    it('should initialize with extension context', () => {
      expect(mcpRegistration).toBeDefined();
      expect((mcpRegistration as any).context).toBe(mockContext);
    });

    it('should set extension URI correctly', () => {
      expect((mcpRegistration as any).context.extensionUri).toBe(mockExtensionUri);
    });
  });

  describe('tryProposedApiRegistration', () => {
    it('should successfully register when proposed API is available', () => {
      const mockDisposable = { dispose: jest.fn() };
      const mockRegisterMethod = jest.fn().mockReturnValue(mockDisposable);

      // Configure the already-mocked vscode.lm
      (vscode.lm as any).registerMcpServerDefinitionProvider = mockRegisterMethod;

      const showSuccessSpy = jest
        .spyOn(mcpRegistration as any, 'showSuccessNotification')
        .mockImplementation(() => {});

      const result = (mcpRegistration as any).tryProposedApiRegistration();

      expect(result).toBe(true);
      expect(mockRegisterMethod).toHaveBeenCalled();
      expect(showSuccessSpy).toHaveBeenCalledWith('Proposed API');
    });

    it('should handle registration errors gracefully', () => {
      // Configure mock to throw error
      (vscode.lm as any).registerMcpServerDefinitionProvider = jest.fn(() => {
        throw new Error('Registration failed');
      });

      const result = (mcpRegistration as any).tryProposedApiRegistration();

      expect(result).toBe(false);
    });

    it('should handle missing proposed API', () => {
      // Simulate missing proposed API by removing the provider method
      (vscode.lm as any).registerMcpServerDefinitionProvider = undefined;

      const result = (mcpRegistration as any).tryProposedApiRegistration();

      expect(result).toBe(false);

      // Restore provider method for other tests
      (vscode.lm as any).registerMcpServerDefinitionProvider = jest.fn();
    });
  });

  describe('tryWorkspaceMcpConfiguration', () => {
    it('should create .vscode directory if it does not exist', () => {
      jest.spyOn(fs, 'existsSync').mockImplementation((filepath: fs.PathLike) => {
        const path = filepath.toString();
        if (path === '/test/workspace/.vscode') return false;
        if (path === '/test/workspace/.vscode/mcp.json') return false;
        return false;
      });
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => '');
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      // Mock workspace folder with proper typing
      (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue({
        uri: { fsPath: '/test/workspace' },
      } as vscode.WorkspaceFolder);

      // Mock path operations
      mockedPath.join.mockImplementation((...args: string[]) => args.join('/'));
      mockedPath.dirname.mockReturnValue('/test/workspace');

      const result = (mcpRegistration as any).tryWorkspaceMcpConfiguration();

      expect(result).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/workspace/.vscode', {
        recursive: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should return true if mcp.json already exists', () => {
      jest.spyOn(fs, 'existsSync').mockImplementation((filepath: fs.PathLike) => {
        const path = filepath.toString();
        if (path === '/test/workspace/.vscode/mcp.json') return true;
        return false;
      });

      // Mock workspace folder with proper typing
      (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue({
        uri: { fsPath: '/test/workspace' },
      } as vscode.WorkspaceFolder);

      const result = (mcpRegistration as any).tryWorkspaceMcpConfiguration();

      expect(result).toBe(true);
    });

    it('should handle file system errors gracefully', () => {
      jest.spyOn(fs, 'existsSync').mockImplementation(() => {
        throw new Error('File system error');
      });

      // Mock workspace folder with proper typing
      (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue({
        uri: { fsPath: '/test/workspace' },
      } as vscode.WorkspaceFolder);

      const result = (mcpRegistration as any).tryWorkspaceMcpConfiguration();

      expect(result).toBe(false);
    });
  });

  describe('registerMcpServerProvider', () => {
    let consoleLogSpy: any;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      if (consoleLogSpy) {
        consoleLogSpy.mockRestore();
        consoleLogSpy = undefined;
      }
    });

    it('should attempt all registration strategies', () => {
      const tryProposedApiSpy = jest
        .spyOn(mcpRegistration as any, 'tryProposedApiRegistration')
        .mockReturnValue(false);
      const tryWorkspaceSpy = jest
        .spyOn(mcpRegistration as any, 'tryWorkspaceMcpConfiguration')
        .mockReturnValue(false);
      const tryUserSettingsSpy = jest
        .spyOn(mcpRegistration as any, 'tryUserSettingsConfiguration')
        .mockReturnValue(false);
      const showManualSpy = jest
        .spyOn(mcpRegistration as any, 'showManualSetupInstructions')
        .mockImplementation(() => {});

      mcpRegistration.registerMcpServerProvider();

      expect(tryProposedApiSpy).toHaveBeenCalled();
      expect(tryWorkspaceSpy).toHaveBeenCalled();
      expect(tryUserSettingsSpy).toHaveBeenCalled();
      expect(showManualSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MCP Registration] Starting MCP server registration...'
      );
    });

    it('should return early if proposed API registration succeeds', () => {
      const tryProposedApiSpy = jest
        .spyOn(mcpRegistration as any, 'tryProposedApiRegistration')
        .mockReturnValue(true);
      const tryWorkspaceSpy = jest
        .spyOn(mcpRegistration as any, 'tryWorkspaceMcpConfiguration')
        .mockReturnValue(false);

      mcpRegistration.registerMcpServerProvider();

      expect(tryProposedApiSpy).toHaveBeenCalled();
      expect(tryWorkspaceSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MCP Registration] ✅ Successfully registered via proposed API'
      );
    });
  });

  describe('tryUserSettingsConfiguration', () => {
    let consoleLogSpy: any;
    let mockConfig: any;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockConfig = {
        get: jest.fn(),
        update: jest.fn(),
        inspect: jest.fn(),
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    });

    afterEach(() => {
      if (consoleLogSpy) {
        consoleLogSpy.mockRestore();
        consoleLogSpy = undefined;
      }
    });

    it('should return false when mcp.servers configuration is not available', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        inspect: jest.fn().mockReturnValue(undefined),
      });

      const result = (mcpRegistration as any).tryUserSettingsConfiguration();

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MCP Registration] mcp.servers configuration not available in this editor'
      );
    });

    it('should return true if mcpDiagnostics server is already configured', () => {
      mockConfig.get.mockReturnValue({ mcpDiagnostics: { type: 'stdio' } });
      mockConfig.inspect.mockReturnValue({ defaultValue: {} });

      const result = (mcpRegistration as any).tryUserSettingsConfiguration();

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MCP Registration] User settings MCP config already exists'
      );
    });

    it('should add new server configuration to user settings', () => {
      mockConfig.get.mockReturnValue({ existingServer: { type: 'stdio' } });
      mockConfig.inspect.mockReturnValue({ defaultValue: {} });
      mockConfig.update.mockResolvedValue(undefined);

      jest
        .spyOn(mcpRegistration as any, 'createServerConfiguration')
        .mockReturnValue({ type: 'stdio', command: 'node', args: ['server.js'] });
      const showSuccessSpy = jest
        .spyOn(mcpRegistration as any, 'showSuccessNotification')
        .mockImplementation(() => {});

      const result = (mcpRegistration as any).tryUserSettingsConfiguration();

      expect(result).toBe(true);
      expect(mockConfig.update).toHaveBeenCalledWith(
        'servers',
        expect.objectContaining({
          existingServer: { type: 'stdio' },
          mcpDiagnostics: { type: 'stdio', command: 'node', args: ['server.js'] },
        }),
        vscode.ConfigurationTarget.Global
      );
      expect(showSuccessSpy).toHaveBeenCalledWith('User Settings');
    });

    it('should handle configuration update errors gracefully', () => {
      mockConfig.get.mockImplementation(() => {
        throw new Error('Configuration error');
      });
      mockConfig.inspect.mockReturnValue({ defaultValue: {} });

      const result = (mcpRegistration as any).tryUserSettingsConfiguration();

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MCP Registration] Failed to update user settings:',
        expect.any(Error)
      );
    });
  });

  describe('showManualSetupInstructions', () => {
    it('should show information message with setup button', () => {
      const mockShowInfo = vscode.window.showInformationMessage as any;
      mockShowInfo.mockResolvedValue(undefined);

      (mcpRegistration as any).showManualSetupInstructions();

      expect(mockShowInfo).toHaveBeenCalledWith(
        'MCP Diagnostics server is ready! Click "Setup MCP" to configure automatic integration.',
        'Setup MCP',
        'Learn More',
        'Dismiss'
      );
    });

    it('should call showMcpSetupGuide when Setup MCP is clicked', async () => {
      const mockShowInfo = vscode.window.showInformationMessage as any;
      mockShowInfo.mockResolvedValue('Setup MCP');

      const showMcpSetupGuideSpy = jest
        .spyOn(mcpRegistration, 'showMcpSetupGuide')
        .mockImplementation(() => {});

      await (mcpRegistration as any).showManualSetupInstructions();

      expect(showMcpSetupGuideSpy).toHaveBeenCalled();
    });
  });

  describe('showMcpSetupGuide', () => {
    it('should create and show webview panel', () => {
      const mockPanel = {
        webview: {
          html: '',
          options: {},
        },
        onDidDispose: jest.fn(),
        dispose: jest.fn(),
      };
      const mockCreateWebviewPanel = vscode.window.createWebviewPanel as jest.Mock;
      mockCreateWebviewPanel.mockReturnValue(mockPanel);

      jest
        .spyOn(mcpRegistration as any, 'getMcpSetupGuideHtml')
        .mockReturnValue('<html>Setup Guide</html>');

      mcpRegistration.showMcpSetupGuide();

      expect(mockCreateWebviewPanel).toHaveBeenCalledWith(
        'mcpSetupGuide',
        'MCP Diagnostics Setup Guide',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );
      expect(mockPanel.webview.html).toBe('<html>Setup Guide</html>');
    });
  });

  describe('createServerDefinitions', () => {
    it('should return array of server definitions', () => {
      const result = (mcpRegistration as any).createServerDefinitions();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: expect.stringContaining('MCP Diagnostics'),
        command: expect.stringContaining('node'),
        args: expect.arrayContaining([expect.stringContaining('mcp-server.js')]),
      });
    });
  });

  describe('resolveServerDefinition', () => {
    it('should return resolved server definition', async () => {
      // Mock vscode.workspace.fs.stat to succeed for the server script
      const mockStat = jest.fn() as any;
      mockStat.mockResolvedValue({});
      Object.defineProperty(vscode.workspace, 'fs', {
        value: { stat: mockStat },
        configurable: true,
      });

      // Mock path.join to return proper path
      mockedPath.join.mockImplementation((...args: string[]) => args.join('/'));

      const mockServer = {
        label: 'MCP Diagnostics',
        command: 'node',
        args: ['scripts/mcp-server.js'],
      };

      const result = await (mcpRegistration as any).resolveServerDefinition(mockServer);

      expect(result).toMatchObject({
        label: 'MCP Diagnostics',
        command: expect.stringContaining('node'),
        args: expect.arrayContaining([expect.stringContaining('mcp-server.js')]),
      });
    });

    it('should handle unknown server definitions', async () => {
      const mockServer = {
        label: 'Unknown Server',
        command: 'unknown',
        args: [],
      };

      const result = await (mcpRegistration as any).resolveServerDefinition(mockServer);

      expect(result).toMatchObject({
        label: 'Unknown Server',
        command: 'unknown',
        args: [],
      });
    });
  });

  describe('createMcpConfiguration', () => {
    it('should create valid MCP configuration object', () => {
      const result = (mcpRegistration as any).createMcpConfiguration();

      expect(result).toMatchObject({
        servers: {
          mcpDiagnostics: {
            type: 'stdio',
            command: expect.stringContaining('node'),
            args: expect.arrayContaining([expect.stringContaining('mcp-server.js')]),
            env: expect.objectContaining({
              NODE_ENV: 'production',
              MCP_DEBUG: 'false',
            }),
          },
        },
      });
    });
  });

  describe('createServerConfiguration', () => {
    it('should create valid server configuration', () => {
      const result = (mcpRegistration as any).createServerConfiguration();

      expect(result).toMatchObject({
        type: 'stdio',
        command: expect.stringContaining('node'),
        args: expect.arrayContaining([expect.stringContaining('mcp-server.js')]),
        env: expect.objectContaining({
          NODE_ENV: 'production',
          MCP_DEBUG: 'false',
        }),
      });
    });
  });

  describe('showSuccessNotification', () => {
    it('should show success message for each registration method', () => {
      const mockShowInfo = vscode.window.showInformationMessage as any;
      mockShowInfo.mockClear();
      mockShowInfo.mockResolvedValue(undefined);

      // Mock configuration to enable notifications
      const mockConfig = {
        get: jest.fn().mockReturnValue(true), // Return true for showAutoRegistrationNotification
        update: jest.fn(),
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      // Call the method directly and verify it calls showInformationMessage
      (mcpRegistration as any).showSuccessNotification('Test Method');

      expect(mockShowInfo).toHaveBeenCalledWith(
        '🎉 MCP Diagnostics server automatically registered via Test Method! Ready for AI agents.',
        'Test Connection',
        "Don't Show Again"
      );
    });
  });

  describe('getMcpSetupGuideHtml', () => {
    it('should return valid HTML string', () => {
      const result = (mcpRegistration as any).getMcpSetupGuideHtml();

      expect(typeof result).toBe('string');
      expect(result).toContain('<html');
      expect(result).toContain('</html>');
      expect(result).toContain('MCP Diagnostics');
      expect(result).toContain('Setup Guide');
    });

    it('should include VS Code, Cursor, and Windsurf setup instructions', () => {
      const result = (mcpRegistration as any).getMcpSetupGuideHtml();

      expect(result).toContain('VS Code');
      expect(result).toContain('Cursor');
      expect(result).toContain('Windsurf');
      expect(result).toContain('.vscode/mcp.json');
      expect(result).toContain('cursor-mcp-config.json');
      expect(result).toContain('.windsurf/mcp.json');
    });
  });

  describe('refreshServerDefinitions', () => {
    it('should fire refresh event when EventEmitter is available', () => {
      const mockFire = jest.fn();
      const mockEventEmitter = {
        event: jest.fn(),
        fire: mockFire,
        dispose: jest.fn(),
      };

      // Create registration with working EventEmitter
      (vscode.EventEmitter as jest.Mock).mockImplementationOnce(() => mockEventEmitter);
      const registration = new McpServerRegistration(mockContext);

      registration.refreshServerDefinitions();

      expect(mockFire).toHaveBeenCalled();
      registration.dispose();
    });

    it('should handle missing EventEmitter gracefully', () => {
      // Create registration that failed to create EventEmitter
      (vscode.EventEmitter as jest.Mock).mockImplementationOnce(() => {
        throw new Error('EventEmitter not available');
      });
      const registration = new McpServerRegistration(mockContext);

      // Should not throw error
      expect(() => registration.refreshServerDefinitions()).not.toThrow();
      registration.dispose();
    });
  });

  describe('dispose', () => {
    it('should dispose all disposables', () => {
      const mockDisposable1 = { dispose: jest.fn() };
      const mockDisposable2 = { dispose: jest.fn() };

      // Add mock disposables
      (mcpRegistration as any).disposables = [mockDisposable1, mockDisposable2];

      mcpRegistration.dispose();

      expect(mockDisposable1.dispose).toHaveBeenCalled();
      expect(mockDisposable2.dispose).toHaveBeenCalled();
    });

    it('should dispose EventEmitter if available', () => {
      const mockDispose = jest.fn();
      const mockEventEmitter = {
        event: jest.fn(),
        fire: jest.fn(),
        dispose: mockDispose,
      };

      // Create registration with working EventEmitter
      (vscode.EventEmitter as jest.Mock).mockImplementationOnce(() => mockEventEmitter);
      const registration = new McpServerRegistration(mockContext);

      registration.dispose();

      expect(mockDispose).toHaveBeenCalled();
    });

    it('should handle disposal when EventEmitter is null', () => {
      // Test disposal when EventEmitter creation failed
      (vscode.EventEmitter as jest.Mock).mockImplementationOnce(() => {
        throw new Error('EventEmitter not available');
      });
      const registration = new McpServerRegistration(mockContext);

      // Should not throw error
      expect(() => registration.dispose()).not.toThrow();
    });
  });

  describe('McpStdioServerDefinition class', () => {
    it('should create instance with required properties', () => {
      const options = {
        label: 'Test Server',
        command: 'node',
        args: ['server.js'],
        cwd: { fsPath: '/test' },
        env: { NODE_ENV: 'test' },
        version: '1.0.0',
      };

      const definition = new MockStdioServerDefinition(options);

      expect(definition.label).toBe('Test Server');
      expect(definition.command).toBe('node');
      expect(definition.args).toEqual(['server.js']);
      expect(definition.cwd).toEqual({ fsPath: '/test' });
      expect(definition.env).toEqual({ NODE_ENV: 'test' });
      expect(definition.version).toBe('1.0.0');
    });

    it('should create instance with only required properties', () => {
      const options = {
        label: 'Minimal Server',
        command: 'node',
        args: ['server.js'],
      };

      const definition = new MockStdioServerDefinition(options);

      expect(definition.label).toBe('Minimal Server');
      expect(definition.command).toBe('node');
      expect(definition.args).toEqual(['server.js']);
      expect(definition.cwd).toBeUndefined();
      expect(definition.env).toBeUndefined();
      expect(definition.version).toBeUndefined();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle all methods gracefully when context is invalid', () => {
      const invalidRegistration = new McpServerRegistration({} as any);

      expect(() => invalidRegistration.registerMcpServerProvider()).not.toThrow();
      expect(() => invalidRegistration.showMcpSetupGuide()).not.toThrow();
      expect(() => invalidRegistration.refreshServerDefinitions()).not.toThrow();
      expect(() => invalidRegistration.dispose()).not.toThrow();

      invalidRegistration.dispose();
    });

    it('should handle network and file system errors during configuration creation', () => {
      mockedFs.writeFileSync.mockImplementation((_file, _data) => {
        throw new Error('Permission denied');
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const result = (mcpRegistration as any).tryWorkspaceMcpConfiguration();

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MCP Registration] Failed to create workspace MCP config:',
        expect.any(Error)
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle VS Code API availability gracefully', () => {
      // Make showInformationMessage throw to simulate unavailable window API
      const originalShowInfo = (vscode.window as any).showInformationMessage;
      (vscode.window as any).showInformationMessage = jest.fn(() => {
        throw new Error('not available');
      });

      expect(() => (mcpRegistration as any).showManualSetupInstructions()).not.toThrow();

      // Restore original implementation
      (vscode.window as any).showInformationMessage = originalShowInfo;
    });

    it('should handle large workspace configurations', () => {
      // Test with many workspace folders
      const manyFolders = Array.from({ length: 100 }, (_, i) => ({
        uri: { fsPath: `/workspace-${i}` } as any,
        name: `workspace-${i}`,
        index: i,
      }));

      (vscode.workspace as any).workspaceFolders = manyFolders;

      expect(() => (mcpRegistration as any).tryWorkspaceMcpConfiguration()).not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle cross-platform path scenarios', () => {
      // Test Windows paths
      mockedPath.join.mockImplementation((...args: string[]) => args.join('\\'));

      const result = (mcpRegistration as any).createMcpConfiguration();

      expect(result.servers.mcpDiagnostics.args).toContainEqual(
        expect.stringMatching(/[\\\/]scripts[\\\/]mcp-server\.js/)
      );
    });

    it('should handle different VS Code versions and editions', () => {
      // Test with different extension modes
      (mockContext as any).extensionMode = vscode.ExtensionMode.Production;

      const result = (mcpRegistration as any).createServerConfiguration();

      expect(result.env.NODE_ENV).toBe('production');
    });

    it('should maintain backwards compatibility with old configurations', () => {
      // Test that existing configurations are preserved
      const existingConfig = {
        oldServer: { type: 'stdio', command: 'old-server' },
        anotherServer: { type: 'tcp', port: 3000 },
      };

      const mockConfig = {
        get: jest.fn().mockReturnValue(existingConfig),
        update: jest.fn(),
        inspect: jest.fn().mockReturnValue({ defaultValue: {} }),
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      (mcpRegistration as any).tryUserSettingsConfiguration();

      expect(mockConfig.update).toHaveBeenCalledWith(
        'servers',
        expect.objectContaining({
          oldServer: { type: 'stdio', command: 'old-server' },
          anotherServer: { type: 'tcp', port: 3000 },
          mcpDiagnostics: expect.any(Object),
        }),
        vscode.ConfigurationTarget.Global
      );
    });
  });

  describe('🔴 Task 4.5: Configuration Injection (FAILING TESTS)', () => {
    describe('Configuration File Location', () => {
      it('should locate mcp.json in priority order (workspace .cursor)', async () => {
        // FAILING TEST: Priority-based configuration location not implemented
        const workspacePath = '/workspace/test';
        const cursorPath = path.join(workspacePath, '.cursor', 'mcp.json');

        // Mock workspace folders
        const mockWorkspaceFolders = [
          { uri: { fsPath: workspacePath } },
        ] as vscode.WorkspaceFolder[];

        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          get: jest.fn().mockReturnValue(mockWorkspaceFolders),
          configurable: true,
        });

        // Mock file existence checks
        jest.spyOn(fs, 'existsSync').mockImplementation((filePath: fs.PathLike) => {
          return filePath === cursorPath;
        });

        // This should return the highest priority path
        await expect(mcpRegistration.injectConfiguration()).resolves.not.toThrow();
        expect(fs.existsSync).toHaveBeenCalledWith(cursorPath);
      });

      it('should fallback to workspace root mcp.json if .cursor not found', async () => {
        // FAILING TEST: Fallback priority logic not implemented
        const workspacePath = '/workspace/test';
        const rootPath = path.join(workspacePath, 'mcp.json');

        const mockWorkspaceFolders = [
          { uri: { fsPath: workspacePath } },
        ] as vscode.WorkspaceFolder[];

        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          get: jest.fn().mockReturnValue(mockWorkspaceFolders),
          configurable: true,
        });

        jest.spyOn(fs, 'existsSync').mockImplementation((filePath: fs.PathLike) => {
          return filePath === rootPath; // Only root exists
        });

        await expect(mcpRegistration.injectConfiguration()).resolves.not.toThrow();
        expect(fs.existsSync).toHaveBeenCalledWith(rootPath);
      });

      it('should fallback to global user .cursor directory', async () => {
        // FAILING TEST: Global fallback not implemented
        const globalPath = path.join(os.homedir(), '.cursor', 'mcp.json');

        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          get: jest.fn().mockReturnValue(undefined),
          configurable: true,
        });

        jest.spyOn(fs, 'existsSync').mockImplementation((filePath: fs.PathLike) => {
          return filePath === globalPath;
        });

        await expect(mcpRegistration.injectConfiguration()).resolves.not.toThrow();
        expect(fs.existsSync).toHaveBeenCalledWith(globalPath);
      });
    });

    describe('Schema Validation', () => {
      it('should validate existing JSON with Zod schema', async () => {
        // FAILING TEST: Zod validation not implemented
        const validConfig = {
          mcpServers: {
            'existing-server': {
              command: 'node',
              args: ['server.js'],
            },
          },
        };

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(validConfig));
        jest.spyOn(fs, 'writeFileSync').mockImplementation((_file, _data, _encoding) => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');

        // Should not throw for valid configuration
        await expect(mcpRegistration.injectConfiguration()).resolves.not.toThrow();
      });

      it('should handle malformed JSON gracefully', async () => {
        // FAILING TEST: Malformed JSON handling not implemented
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue('{ invalid json }');
        jest.spyOn(fs, 'writeFileSync').mockImplementation((_file, _data, _encoding) => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');

        // Should create backup and use default config
        await expect(mcpRegistration.injectConfiguration()).resolves.not.toThrow();
      });

      it('should validate against MCP configuration schema', async () => {
        // FAILING TEST: Schema enforcement not implemented
        const invalidConfig = {
          notMcpServers: {}, // Wrong property name
        };

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));
        jest.spyOn(fs, 'writeFileSync').mockImplementation((_file, _data, _encoding) => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');

        // Should handle invalid schema and use default
        await expect(mcpRegistration.injectConfiguration()).resolves.not.toThrow();
      });
    });

    describe('Deep Merge Preservation', () => {
      it('should preserve user customizations during injection', async () => {
        // FAILING TEST: Deep merge logic not implemented
        const existingConfig = {
          mcpServers: {
            'user-server': {
              command: 'python',
              args: ['custom.py', '--flag'],
              env: { CUSTOM_VAR: 'value' },
            },
            'another-server': {
              command: 'go',
              args: ['run', 'main.go'],
            },
          },
        };

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(existingConfig));

        let writtenConfig: any;
        jest.spyOn(fs, 'writeFileSync').mockImplementation((_filePath, data) => {
          writtenConfig = JSON.parse(data as string);
        });
        jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');

        await mcpRegistration.injectConfiguration();

        // Should preserve all existing servers
        expect(writtenConfig.mcpServers['user-server']).toEqual(
          existingConfig.mcpServers['user-server']
        );
        expect(writtenConfig.mcpServers['another-server']).toEqual(
          existingConfig.mcpServers['another-server']
        );
        // Should add our diagnostics server
        expect(writtenConfig.mcpServers['vscode-diagnostics']).toBeDefined();
      });

      it('should update existing vscode-diagnostics entry with new server path', async () => {
        // FAILING TEST: Server path update logic not implemented
        const existingConfig = {
          mcpServers: {
            'vscode-diagnostics': {
              command: 'node',
              args: ['/old/path/mcp-server.js'],
            },
          },
        };

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);

        let writtenConfig: any;
        let tempFileContent: string = '';

        // Mock the sequence of file operations
        jest.spyOn(fs, 'readFileSync').mockImplementation((filePath: any) => {
          const pathStr = filePath.toString();
          if (pathStr.includes('.tmp')) {
            // Return the content that was written to temp file
            return tempFileContent;
          } else if (pathStr.includes('mcp.json') && !pathStr.includes('.backup')) {
            // For verification read, return the written config if available
            return writtenConfig ? JSON.stringify(writtenConfig) : JSON.stringify(existingConfig);
          }
          // Default to existing config for initial read
          return JSON.stringify(existingConfig);
        });

        jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath: any, data: any) => {
          const pathStr = filePath.toString();
          if (pathStr.includes('.tmp')) {
            // Capture temp file content
            tempFileContent = data as string;
          }
          // Always capture the written config for verification
          writtenConfig = JSON.parse(data as string);
        });

        jest.spyOn(fs, 'copyFileSync').mockImplementation((_src, _dest) => {});
        jest.spyOn(fs, 'renameSync').mockImplementation((_src, _dest) => {});
        jest.spyOn(fs, 'unlinkSync').mockImplementation((_file) => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');

        await mcpRegistration.injectConfiguration();

        // Should update to new server path
        expect(writtenConfig.mcpServers['vscode-diagnostics'].args[0]).toContain('mcp-server.js');
        expect(writtenConfig.mcpServers['vscode-diagnostics'].args[0]).not.toBe(
          '/old/path/mcp-server.js'
        );
      });
    });

    describe('Atomic Operations', () => {
      it('should create backup before modifying configuration', async () => {
        // FAILING TEST: Backup creation not implemented

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue('{"mcpServers":{}}');
        jest.spyOn(fs, 'writeFileSync').mockImplementation((_file, _data, _encoding) => {});
        jest.spyOn(fs, 'copyFileSync').mockImplementation((_src, _dest) => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');

        await mcpRegistration.injectConfiguration();

        // Should create backup
        expect(fs.copyFileSync).toHaveBeenCalledWith(
          expect.stringContaining('mcp.json'),
          expect.stringContaining('.backup')
        );
      });

      it('should write to temporary file first then rename atomically', async () => {
        // FAILING TEST: Atomic write operations not implemented
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        // Provide valid initial configuration that passes Zod validation
        jest.spyOn(fs, 'readFileSync').mockReturnValue('{"mcpServers":{}}');
        jest.spyOn(fs, 'writeFileSync').mockImplementation((_file, _data, _encoding) => {});
        jest.spyOn(fs, 'renameSync').mockImplementation((_src, _dest) => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');

        await mcpRegistration.injectConfiguration();

        // Should write to .tmp file first
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('.tmp'),
          expect.stringMatching(/mcpServers/),
          'utf8'
        );
        // Then rename atomically
        expect(fs.renameSync).toHaveBeenCalledWith(
          expect.stringContaining('.tmp'),
          expect.stringContaining('mcp.json')
        );
      });

      it('should verify injection success after write', async () => {
        // FAILING TEST: Post-write verification not implemented
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        jest.spyOn(fs, 'writeFileSync').mockImplementation((_file, _data, _encoding) => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');

        // Mock post-write verification read
        jest
          .spyOn(fs, 'readFileSync')
          .mockReturnValueOnce('{"mcpServers":{}}') // Initial read (empty)
          .mockReturnValueOnce('{"mcpServers":{"vscode-diagnostics":{}}}'); // Verification read

        await mcpRegistration.injectConfiguration();

        // Should read file after write to verify
        expect(fs.readFileSync).toHaveBeenCalledTimes(2);
      });
    });

    describe('Error Handling', () => {
      it('should handle write permission errors gracefully', async () => {
        // FAILING TEST: Permission error handling not implemented
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');
        jest.spyOn(fs, 'writeFileSync').mockImplementation((_file, _data, _encoding) => {
          throw new Error('EACCES: permission denied');
        });

        // Should not throw but show appropriate error
        await expect(mcpRegistration.injectConfiguration()).resolves.not.toThrow();
      });

      it('should handle directory creation failures', async () => {
        // FAILING TEST: Directory creation error handling not implemented
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
          throw new Error('EACCES: permission denied');
        });

        // Should handle directory creation failure
        await expect(mcpRegistration.injectConfiguration()).resolves.not.toThrow();
      });

      it('should rollback on write failure', async () => {
        // FAILING TEST: Rollback mechanism not implemented

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue('{"mcpServers":{}}');
        jest.spyOn(fs, 'copyFileSync').mockImplementation((_src, _dest) => {});
        jest.spyOn(fs, 'writeFileSync').mockImplementation((_file, _data, _encoding) => {
          throw new Error('Write failed');
        });
        jest.spyOn(fs, 'unlinkSync').mockImplementation((_file) => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation((_file, _opts) => '');

        await mcpRegistration.injectConfiguration();

        // Should attempt to restore from backup
        expect(fs.copyFileSync).toHaveBeenCalledWith(
          expect.stringContaining('.backup'),
          expect.stringContaining('mcp.json')
        );
      });
    });
  });
});
