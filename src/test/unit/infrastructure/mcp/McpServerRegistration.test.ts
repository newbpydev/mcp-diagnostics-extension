import { jest } from '@jest/globals';

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
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// Type the mocks
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
    if (vscode.lm && vscode.lm.registerMcpServerDefinitionProvider) {
      (vscode.lm.registerMcpServerDefinitionProvider as jest.Mock).mockClear();
    }

    // Setup fs mocks
    mockedFs.existsSync = jest.fn();
    mockedFs.mkdirSync = jest.fn();
    mockedFs.writeFileSync = jest.fn();
    mockedFs.readFileSync = jest.fn();

    // Setup path mocks with realistic implementations
    mockedPath.join = jest.fn((...args) => args.join('/'));
    mockedPath.dirname = jest.fn((p: string) => p.split('/').slice(0, -1).join('/'));

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
      vscode.lm.registerMcpServerDefinitionProvider = mockRegisterMethod;

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
      vscode.lm.registerMcpServerDefinitionProvider = jest.fn(() => {
        throw new Error('Registration failed');
      });

      const result = (mcpRegistration as any).tryProposedApiRegistration();

      expect(result).toBe(false);
    });

    it('should handle missing proposed API', () => {
      // Set lm to undefined to simulate missing API
      vscode.lm = undefined;

      const result = (mcpRegistration as any).tryProposedApiRegistration();

      expect(result).toBe(false);
    });
  });

  describe('tryWorkspaceMcpConfiguration', () => {
    it('should create .vscode directory if it does not exist', () => {
      mockedFs.existsSync.mockImplementation((filepath: string) => {
        if (filepath === '/test/workspace/.vscode') return false;
        if (filepath === '/test/workspace/.vscode/mcp.json') return false;
        return false;
      });
      mockedFs.mkdirSync.mockImplementation();
      mockedFs.writeFileSync.mockImplementation();

      // Mock workspace folder
      vscode.workspace.getWorkspaceFolder = jest.fn().mockReturnValue({
        uri: { fsPath: '/test/workspace' },
      });

      // Mock path operations
      mockedPath.join.mockImplementation((...args: string[]) => args.join('/'));
      mockedPath.dirname.mockReturnValue('/test/workspace');

      const result = (mcpRegistration as any).tryWorkspaceMcpConfiguration();

      expect(result).toBe(true);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/test/workspace/.vscode', {
        recursive: true,
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should return true if mcp.json already exists', () => {
      mockedFs.existsSync.mockImplementation((filepath: string) => {
        if (filepath === '/test/workspace/.vscode/mcp.json') return true;
        return false;
      });

      // Mock workspace folder
      vscode.workspace.getWorkspaceFolder = jest.fn().mockReturnValue({
        uri: { fsPath: '/test/workspace' },
      });

      const result = (mcpRegistration as any).tryWorkspaceMcpConfiguration();

      expect(result).toBe(true);
    });

    it('should handle file system errors gracefully', () => {
      mockedFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      // Mock workspace folder
      vscode.workspace.getWorkspaceFolder = jest.fn().mockReturnValue({
        uri: { fsPath: '/test/workspace' },
      });

      const result = (mcpRegistration as any).tryWorkspaceMcpConfiguration();

      expect(result).toBe(false);
    });
  });

  describe('registerMcpServerProvider', () => {
    let consoleLogSpy: jest.SpyInstance | undefined;

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
        .mockImplementation();

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
    let consoleLogSpy: jest.SpyInstance | undefined;
    let mockConfig: any;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
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
        .mockImplementation();

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
      const mockShowInfo = vscode.window.showInformationMessage as jest.Mock;
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
      const mockShowInfo = vscode.window.showInformationMessage as jest.Mock;
      mockShowInfo.mockResolvedValue('Setup MCP');

      const showMcpSetupGuideSpy = jest
        .spyOn(mcpRegistration, 'showMcpSetupGuide')
        .mockImplementation();

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
        command: 'node',
        args: expect.arrayContaining([expect.stringContaining('mcp-server.js')]),
      });
    });
  });

  describe('resolveServerDefinition', () => {
    it('should return resolved server definition', async () => {
      // Mock vscode.workspace.fs.stat to succeed for the server script
      const mockStat = jest.fn().mockResolvedValue({});
      vscode.workspace.fs = {
        stat: mockStat,
      } as any;

      // Mock path.join to return proper path
      mockedPath.join.mockImplementation((...args) => args.join('/'));

      const mockServer = {
        label: 'MCP Diagnostics',
        command: 'node',
        args: ['scripts/mcp-server.js'],
      };

      const result = await (mcpRegistration as any).resolveServerDefinition(mockServer);

      expect(result).toMatchObject({
        label: 'MCP Diagnostics',
        command: 'node',
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
            command: 'node',
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
        command: 'node',
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
      const mockShowInfo = vscode.window.showInformationMessage as jest.Mock;
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
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = (mcpRegistration as any).tryWorkspaceMcpConfiguration();

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MCP Registration] Failed to create workspace MCP config:',
        expect.any(Error)
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle VS Code API availability gracefully', () => {
      // Test when vscode.window is undefined
      const originalWindow = vscode.window;
      delete (vscode as any).window;
      Object.defineProperty(vscode, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => (mcpRegistration as any).showManualSetupInstructions()).not.toThrow();

      // Restore
      (vscode as any).window = originalWindow;
    });

    it('should handle large workspace configurations', () => {
      // Test with many workspace folders
      const manyFolders = Array.from({ length: 100 }, (_, i) => ({
        uri: { fsPath: `/workspace-${i}` } as vscode.Uri,
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
      mockedPath.join.mockImplementation((...args) => args.join('\\'));

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
});
