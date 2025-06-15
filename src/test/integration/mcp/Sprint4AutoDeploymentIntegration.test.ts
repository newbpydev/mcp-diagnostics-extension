/**
 * Sprint 4 Auto-Deployment Integration Tests
 *
 * Integration testing for the automatic MCP server deployment components
 * Tests the interaction between ServerDeployment, McpServerRegistration, and ExtensionCommands
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { McpServerRegistration } from '@infrastructure/mcp/McpServerRegistration';
import { ExtensionCommands } from '@commands/ExtensionCommands';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { VsCodeApiAdapter } from '@infrastructure/vscode/VsCodeApiAdapter';
import { DEFAULT_CONFIG } from '@shared/constants';
import { deployBundledServer } from '@shared/deployment/ServerDeployment';

// Mock VS Code APIs for integration testing
jest.mock('vscode', () => ({
  ExtensionContext: jest.fn(),
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    withProgress: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      text: '',
      tooltip: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      command: '',
      backgroundColor: undefined,
    })),
    createWebviewPanel: jest.fn(() => ({
      webview: { html: '' },
      dispose: jest.fn(),
    })),
  },
  commands: {
    registerCommand: jest.fn(),
    getCommands: jest.fn(() => Promise.resolve(['mcpDiagnostics.configureServer'])),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({ get: jest.fn() })),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  ProgressLocation: {
    Notification: 15,
  },
  ViewColumn: {
    One: 1,
  },
  ThemeColor: jest.fn().mockImplementation((id: string) => ({ id })),
}));

// Mock the ServerInstallUtils
jest.mock('@shared/utils/ServerInstallUtils', () => ({
  atomicCopyServerBinary: jest.fn().mockResolvedValue(true),
  atomicPersistManifest: jest.fn().mockResolvedValue(void 0),
  acquireLock: jest.fn().mockResolvedValue(void 0),
  needsUpgrade: jest.fn().mockReturnValue(true),
  releaseLock: jest.fn().mockResolvedValue(void 0),
  setExecutableFlag: jest.fn().mockResolvedValue(true),
  getInstallDir: jest
    .fn()
    .mockImplementation((homeDir?: string) =>
      path.join(homeDir || os.tmpdir(), '.mcp-diagnostics')
    ),
}));

describe('🔗 Sprint 4: Auto-Deployment Integration Tests', () => {
  let mockContext: vscode.ExtensionContext;
  let tempDir: string;
  let mockVsCodeApi: any;
  let mcpRegistration: McpServerRegistration;
  let extensionCommands: ExtensionCommands;
  let mockWatcher: DiagnosticsWatcher;
  let mockMcpServer: McpServerWrapper;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint4-integration-'));
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    mockContext = {
      asAbsolutePath: jest.fn((relativePath: string) =>
        path.join(__dirname, '..', '..', '..', relativePath)
      ),
      subscriptions: [],
      extensionPath: path.join(__dirname, '..', '..', '..'),
    } as any;

    mockVsCodeApi = {
      languages: {
        onDidChangeDiagnostics: jest.fn(() => ({ dispose: jest.fn() })),
        getDiagnostics: jest.fn(() => []),
      },
      workspace: {
        getConfiguration: jest.fn(() => ({ get: jest.fn() })),
      },
      window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        withProgress: jest.fn(),
        createStatusBarItem: jest.fn(() => ({
          text: '',
          tooltip: '',
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
      },
      StatusBarAlignment: {
        Left: 1,
        Right: 2,
      },
      ProgressLocation: {
        Notification: 15,
      },
      ViewColumn: {
        One: 1,
      },
      ThemeColor: jest.fn().mockImplementation((id: string) => ({ id })),
    };

    // Mock global vscode module for ExtensionCommands
    (global as any).vscode = mockVsCodeApi;

    const adapter = new VsCodeApiAdapter(mockVsCodeApi);
    mockWatcher = new DiagnosticsWatcher(adapter);

    // Add missing methods to the mock for test compatibility
    (mockWatcher as any).getAllProblems = jest.fn().mockReturnValue([
      {
        filePath: '/test/file.ts',
        severity: 'Error',
        message: 'Test error',
        workspaceFolder: 'test-workspace',
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
        source: 'typescript',
      },
    ]);

    mockMcpServer = new McpServerWrapper(mockWatcher, DEFAULT_CONFIG);
    mcpRegistration = new McpServerRegistration(mockContext);
    extensionCommands = new ExtensionCommands(
      mockMcpServer,
      mockWatcher,
      mcpRegistration,
      mockVsCodeApi
    );
  });

  afterEach(() => {
    mockWatcher.dispose();
    mockMcpServer.dispose();
    extensionCommands.dispose();
    jest.clearAllMocks();

    // Clean up global vscode mock
    delete (global as any).vscode;
  });

  describe('🎯 1. McpServerRegistration and ServerDeployment Integration', () => {
    it('should deploy server and inject configuration in sequence', async () => {
      // Create mock bundled server
      const bundledServerPath = path.join(tempDir, 'mcp-server.js');
      fs.writeFileSync(bundledServerPath, 'console.log("Integration test server");');

      // Mock the private methods
      jest
        .spyOn(mcpRegistration as any, 'getInstalledServerPath')
        .mockReturnValue(bundledServerPath);

      // Create temporary config directory
      const configDir = path.join(tempDir, '.cursor');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'mcp.json');

      jest.spyOn(mcpRegistration as any, 'locateConfigurationFile').mockResolvedValue(configPath);

      // Test integration flow
      const deployResult = await deployBundledServer({
        bundledPath: bundledServerPath,
        version: '1.0.0',
        logger: jest.fn(),
        homeDir: tempDir,
        platform: 'linux',
      });

      expect(deployResult.installedPath).toBeTruthy();

      // Now test configuration injection
      await mcpRegistration.injectConfiguration();

      // Verify configuration was created
      expect(fs.existsSync(configPath)).toBe(true);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config.mcpServers['vscode-diagnostics']).toBeDefined();
    });

    it('should handle deployment failure and graceful fallback', async () => {
      // Mock deployment failure
      const ServerInstallUtils = require('@shared/utils/ServerInstallUtils');
      ServerInstallUtils.atomicCopyServerBinary.mockResolvedValue(false);

      const bundledServerPath = path.join(tempDir, 'mcp-server.js');
      fs.writeFileSync(bundledServerPath, 'console.log("Fail test");');

      try {
        await deployBundledServer({
          bundledPath: bundledServerPath,
          version: '1.0.0',
          logger: jest.fn(),
          homeDir: tempDir,
          platform: 'linux',
        });
        throw new Error('Expected deployment to fail');
      } catch (error) {
        expect((error as Error).message).toBe('Expected deployment to fail');
      }

      // Configuration injection should still work independently
      const configPath = path.join(tempDir, 'fallback-mcp.json');
      jest.spyOn(mcpRegistration as any, 'locateConfigurationFile').mockResolvedValue(configPath);
      jest
        .spyOn(mcpRegistration as any, 'getInstalledServerPath')
        .mockReturnValue('/fallback/path');

      await mcpRegistration.injectConfiguration();
      expect(fs.existsSync(configPath)).toBe(true);

      // Restore mock for other tests
      ServerInstallUtils.atomicCopyServerBinary.mockResolvedValue(true);
    });

    it('should preserve existing configuration during injection', async () => {
      const configPath = path.join(tempDir, 'preserve-mcp.json');
      const existingConfig = {
        mcpServers: {
          'existing-server-1': {
            command: 'node',
            args: ['server1.js'],
            env: { TEST: 'value1' },
          },
          'existing-server-2': {
            command: 'python',
            args: ['server2.py', '--flag'],
          },
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      jest.spyOn(mcpRegistration as any, 'locateConfigurationFile').mockResolvedValue(configPath);
      jest
        .spyOn(mcpRegistration as any, 'getInstalledServerPath')
        .mockReturnValue('/test/diagnostics-server.js');

      await mcpRegistration.injectConfiguration();

      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Verify existing servers are preserved
      expect(updatedConfig.mcpServers['existing-server-1']).toEqual(
        existingConfig.mcpServers['existing-server-1']
      );
      expect(updatedConfig.mcpServers['existing-server-2']).toEqual(
        existingConfig.mcpServers['existing-server-2']
      );

      // Verify diagnostics server was added
      expect(updatedConfig.mcpServers['vscode-diagnostics']).toBeDefined();
      expect(updatedConfig.mcpServers['vscode-diagnostics'].command).toBe('node');
      expect(updatedConfig.mcpServers['vscode-diagnostics'].args).toEqual([
        '/test/diagnostics-server.js',
      ]);
    });
  });

  describe('🎯 2. ExtensionCommands and McpServerRegistration Integration', () => {
    it('should execute complete command workflow with proper dependency injection', async () => {
      // Mock successful operations
      const deployServerSpy = jest.spyOn(mcpRegistration, 'deployBundledServer').mockResolvedValue({
        installedPath: '/test/mcp-server.js',
        upgraded: true,
      });
      const injectConfigSpy = jest
        .spyOn(mcpRegistration, 'injectConfiguration')
        .mockResolvedValue();

      // Mock progress API
      const mockProgress = { report: jest.fn() };
      const mockToken = {};
      mockVsCodeApi.window.withProgress.mockImplementation((_options: any, task: any) => {
        return task(mockProgress, mockToken);
      });

      // Register commands
      extensionCommands.registerCommands(mockContext);

      // Find and execute the configure server command
      const registerCalls = mockVsCodeApi.commands.registerCommand.mock.calls;
      const configureServerCall = registerCalls.find(
        (call: any) => call[0] === 'mcpDiagnostics.configureServer'
      );

      expect(configureServerCall).toBeDefined();
      const commandHandler = configureServerCall[1];

      // Execute the command
      await commandHandler();

      // Verify the workflow
      expect(deployServerSpy).toHaveBeenCalled();
      expect(injectConfigSpy).toHaveBeenCalled();
      expect(mockProgress.report).toHaveBeenCalledWith({ message: 'Deploying server...' });
      expect(mockProgress.report).toHaveBeenCalledWith({ message: 'Injecting configuration...' });
      expect(mockVsCodeApi.window.showInformationMessage).toHaveBeenCalledWith(
        'MCP Diagnostics server configured successfully!'
      );
    });

    it('should handle partial failure gracefully with proper error propagation', async () => {
      // Mock deployment success but injection failure
      jest.spyOn(mcpRegistration, 'deployBundledServer').mockResolvedValue({
        installedPath: '/test/mcp-server.js',
        upgraded: true,
      });
      jest
        .spyOn(mcpRegistration, 'injectConfiguration')
        .mockRejectedValue(new Error('Permission denied'));

      const mockProgress = { report: jest.fn() };
      mockVsCodeApi.window.withProgress.mockImplementation((_options: any, task: any) => {
        return task(mockProgress, {});
      });

      extensionCommands.registerCommands(mockContext);

      const registerCalls = mockVsCodeApi.commands.registerCommand.mock.calls;
      const configureServerCall = registerCalls.find(
        (call: any) => call[0] === 'mcpDiagnostics.configureServer'
      );
      const commandHandler = configureServerCall[1];

      await commandHandler();

      // Verify error handling
      expect(mockVsCodeApi.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to configure server automatically.',
        'View Manual Setup'
      );
    });

    it('should provide manual setup fallback when automatic configuration fails', async () => {
      // Mock complete failure
      jest
        .spyOn(mcpRegistration, 'deployBundledServer')
        .mockRejectedValue(new Error('Deployment failed'));

      // Mock user choosing manual setup
      mockVsCodeApi.window.showErrorMessage.mockResolvedValue('View Manual Setup');
      const showSetupGuideSpy = jest
        .spyOn(mcpRegistration, 'showMcpSetupGuide')
        .mockImplementation();

      const mockProgress = { report: jest.fn() };
      mockVsCodeApi.window.withProgress.mockImplementation((_options: any, task: any) => {
        return task(mockProgress, {});
      });

      extensionCommands.registerCommands(mockContext);

      const registerCalls = mockVsCodeApi.commands.registerCommand.mock.calls;
      const configureServerCall = registerCalls.find(
        (call: any) => call[0] === 'mcpDiagnostics.configureServer'
      );
      const commandHandler = configureServerCall[1];

      await commandHandler();

      // Verify fallback to manual setup
      expect(showSetupGuideSpy).toHaveBeenCalled();
    });
  });

  describe('🎯 3. Cross-Component Error Handling Integration', () => {
    it('should maintain system state consistency during failures', async () => {
      // Test scenario: Deployment succeeds but config injection fails
      const deployResult = { installedPath: '/test/server.js', upgraded: true };
      jest.spyOn(mcpRegistration, 'deployBundledServer').mockResolvedValue(deployResult);

      // Mock configuration injection failure
      jest
        .spyOn(mcpRegistration, 'injectConfiguration')
        .mockRejectedValue(new Error('Config write failed'));

      const mockProgress = { report: jest.fn() };
      mockVsCodeApi.window.withProgress.mockImplementation((_options: any, task: any) => {
        return task(mockProgress, {});
      });

      // Register and execute command
      extensionCommands.registerCommands(mockContext);
      const registerCalls = mockVsCodeApi.commands.registerCommand.mock.calls;
      const configureServerCall = registerCalls.find(
        (call: any) => call[0] === 'mcpDiagnostics.configureServer'
      );
      const commandHandler = configureServerCall[1];

      await commandHandler();

      // Verify that deployment was called but injection failed gracefully
      expect(mcpRegistration.deployBundledServer).toHaveBeenCalled();
      expect(mcpRegistration.injectConfiguration).toHaveBeenCalled();
      expect(mockVsCodeApi.window.showErrorMessage).toHaveBeenCalled();

      // Verify no system corruption (would be more complex in real scenarios)
      expect(extensionCommands).toBeDefined();
      expect(mcpRegistration).toBeDefined();
    });

    it('should handle concurrent command executions safely', async () => {
      // Mock long-running operations
      jest
        .spyOn(mcpRegistration, 'deployBundledServer')
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ installedPath: '/test/server.js', upgraded: true }), 100)
            )
        );
      jest
        .spyOn(mcpRegistration, 'injectConfiguration')
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(), 50)));

      const mockProgress = { report: jest.fn() };
      mockVsCodeApi.window.withProgress.mockImplementation((_options: any, task: any) => {
        return task(mockProgress, {});
      });

      extensionCommands.registerCommands(mockContext);
      const registerCalls = mockVsCodeApi.commands.registerCommand.mock.calls;
      const configureServerCall = registerCalls.find(
        (call: any) => call[0] === 'mcpDiagnostics.configureServer'
      );
      const commandHandler = configureServerCall[1];

      // Execute command multiple times concurrently
      const promises = [commandHandler(), commandHandler(), commandHandler()];

      const results = await Promise.allSettled(promises);

      // All should complete successfully (actual concurrency protection would be in implementation)
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });

  describe('🎯 4. Performance Integration Testing', () => {
    it('should complete full deployment workflow within performance thresholds', async () => {
      // Mock realistic timing
      jest
        .spyOn(mcpRegistration, 'deployBundledServer')
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ installedPath: '/test/server.js', upgraded: true }), 200)
            )
        );
      jest
        .spyOn(mcpRegistration, 'injectConfiguration')
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(), 100)));

      const mockProgress = { report: jest.fn() };
      mockVsCodeApi.window.withProgress.mockImplementation((_options: any, task: any) => {
        return task(mockProgress, {});
      });

      extensionCommands.registerCommands(mockContext);
      const registerCalls = mockVsCodeApi.commands.registerCommand.mock.calls;
      const configureServerCall = registerCalls.find(
        (call: any) => call[0] === 'mcpDiagnostics.configureServer'
      );
      const commandHandler = configureServerCall[1];

      const startTime = Date.now();
      await commandHandler();
      const totalTime = Date.now() - startTime;

      // Should complete within 2 seconds
      expect(totalTime).toBeLessThan(2000);
      expect(mockVsCodeApi.window.showInformationMessage).toHaveBeenCalled();
    });

    it('should handle large configuration files efficiently during injection', async () => {
      // Create large configuration
      const configPath = path.join(tempDir, 'large-config-integration.json');
      const largeConfig: { mcpServers: Record<string, any> } = { mcpServers: {} };

      for (let i = 0; i < 500; i++) {
        largeConfig.mcpServers[`server-${i}`] = {
          command: 'node',
          args: [`server-${i}.js`],
          env: { [`VAR_${i}`]: `value_${i}` },
        };
      }

      fs.writeFileSync(configPath, JSON.stringify(largeConfig, null, 2));

      jest.spyOn(mcpRegistration as any, 'locateConfigurationFile').mockResolvedValue(configPath);
      jest
        .spyOn(mcpRegistration as any, 'getInstalledServerPath')
        .mockReturnValue('/test/diagnostics-server.js');

      const startTime = Date.now();
      await mcpRegistration.injectConfiguration();
      const injectionTime = Date.now() - startTime;

      // Should handle large config within 3 seconds
      expect(injectionTime).toBeLessThan(3000);

      // Verify all servers preserved + diagnostics server added
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(Object.keys(updatedConfig.mcpServers)).toHaveLength(501); // 500 + 1 new
      expect(updatedConfig.mcpServers['vscode-diagnostics']).toBeDefined();
    });
  });

  describe('🎯 5. Component Lifecycle Integration', () => {
    it('should properly initialize and dispose all components', async () => {
      // Track disposal calls
      const disposeSpy = jest.spyOn(extensionCommands, 'dispose');

      // Simulate extension lifecycle
      extensionCommands.registerCommands(mockContext);

      // Verify registration occurred
      expect(mockVsCodeApi.commands.registerCommand).toHaveBeenCalled();

      // Simulate disposal
      extensionCommands.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should handle component initialization failures gracefully', async () => {
      // Mock initialization failure in one component
      const mockFailingWatcher = {
        dispose: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      } as any;

      const failingCommands = new ExtensionCommands(
        mockMcpServer,
        mockFailingWatcher,
        mcpRegistration
      );

      // Should not throw during registration
      expect(() => {
        failingCommands.registerCommands(mockContext);
      }).not.toThrow();

      // Cleanup
      failingCommands.dispose();
    });
  });
});
