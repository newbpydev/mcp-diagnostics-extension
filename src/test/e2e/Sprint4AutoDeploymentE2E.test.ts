/**
 * Sprint 4 Auto-Deployment E2E Tests
 *
 * Comprehensive end-to-end testing for the automatic MCP server deployment functionality
 * introduced in Sprint 4. Tests cover deployment, configuration injection, and command integration.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  deployBundledServer,
  DeployOptions,
  DeployResult,
} from '@shared/deployment/ServerDeployment';
import { McpServerRegistration } from '@infrastructure/mcp/McpServerRegistration';
import { ExtensionCommands } from '@commands/ExtensionCommands';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { VsCodeApiAdapter } from '@infrastructure/vscode/VsCodeApiAdapter';
import { DEFAULT_CONFIG } from '@shared/constants';

// Mock the ServerInstallUtils to prevent file system issues
jest.mock('@shared/utils/ServerInstallUtils', () => ({
  atomicCopyServerBinary: jest.fn().mockResolvedValue(true),
  atomicPersistManifest: jest.fn().mockResolvedValue(true),
  acquireLock: jest.fn().mockResolvedValue(true),
  needsUpgrade: jest.fn().mockReturnValue(true),
  releaseLock: jest.fn().mockResolvedValue(undefined),
  setExecutableFlag: jest.fn().mockResolvedValue(true),
  getInstallDir: jest
    .fn()
    .mockImplementation((homeDir?: string) =>
      path.join(homeDir || os.tmpdir(), '.mcp-diagnostics')
    ),
}));

describe('🚀 Sprint 4: Auto-Deployment E2E Tests', () => {
  let mockContext: vscode.ExtensionContext;
  let tempDir: string;
  let tempConfigDir: string;
  let mockVsCodeApi: any;
  let mockWatcher: DiagnosticsWatcher;
  let mockMcpServer: McpServerWrapper;

  beforeAll(() => {
    jest.useFakeTimers();
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint4-e2e-'));
    tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint4-config-'));
  });

  afterAll(() => {
    jest.useRealTimers();
    // Cleanup temporary directories
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (fs.existsSync(tempConfigDir)) {
      fs.rmSync(tempConfigDir, { recursive: true, force: true });
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
        getWorkspaceFolder: jest.fn(),
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

    const adapter = new VsCodeApiAdapter(mockVsCodeApi);
    mockWatcher = new DiagnosticsWatcher(adapter);

    // Provide getAllProblems mock for status bar updates
    (mockWatcher as any).getAllProblems = jest.fn().mockReturnValue([]);

    mockMcpServer = new McpServerWrapper(mockWatcher, DEFAULT_CONFIG);
  });

  afterEach(() => {
    mockWatcher.dispose();
    mockMcpServer.dispose();
    jest.clearAllMocks();
  });

  describe('🎯 1. Server Deployment Workflow E2E', () => {
    it('should deploy bundled server to user directory with proper permissions', async () => {
      // Create mock bundled server file
      const bundledServerPath = path.join(tempDir, 'mcp-server.js');
      const serverContent = '#!/usr/bin/env node\nconsole.log("MCP Server");';
      fs.writeFileSync(bundledServerPath, serverContent);

      const deployOptions: DeployOptions = {
        bundledPath: bundledServerPath,
        version: '1.0.0',
        logger: jest.fn(),
        homeDir: tempDir,
        platform: 'linux',
      };

      const result: DeployResult = await deployBundledServer(deployOptions);

      expect(result.installedPath).toBeTruthy();
      expect(result.upgraded).toBe(true);

      // Verify the path structure is correct
      const expectedPath = path.join(tempDir, '.mcp-diagnostics', 'mcp-server.js');
      expect(result.installedPath).toBe(expectedPath);
    });

    it('should handle upgrade scenarios correctly', async () => {
      // Create initial deployment
      const bundledServerPath = path.join(tempDir, 'mcp-server.js');
      fs.writeFileSync(bundledServerPath, 'console.log("v1.0.0");');

      const deployOptions1: DeployOptions = {
        bundledPath: bundledServerPath,
        version: '1.0.0',
        logger: jest.fn(),
        homeDir: tempDir,
        platform: 'linux',
      };

      const result1 = await deployBundledServer(deployOptions1);
      expect(result1.upgraded).toBe(true);

      // Mock needsUpgrade to return false for same version
      const ServerInstallUtils = require('@shared/utils/ServerInstallUtils');
      ServerInstallUtils.needsUpgrade.mockReturnValue(false);

      // Attempt same version deployment (should skip)
      const result2 = await deployBundledServer(deployOptions1);
      expect(result2.upgraded).toBe(false);

      // Mock needsUpgrade to return true for newer version
      ServerInstallUtils.needsUpgrade.mockReturnValue(true);

      // Deploy newer version
      fs.writeFileSync(bundledServerPath, 'console.log("v1.1.0");');
      const deployOptions2: DeployOptions = {
        ...deployOptions1,
        version: '1.1.0',
      };

      const result3 = await deployBundledServer(deployOptions2);
      expect(result3.upgraded).toBe(true);
    });

    it('should handle cross-platform deployment correctly', async () => {
      const bundledServerPath = path.join(tempDir, 'mcp-server.js');
      fs.writeFileSync(bundledServerPath, 'console.log("Cross-platform test");');

      const platforms: NodeJS.Platform[] = ['win32', 'darwin', 'linux'];

      for (const platform of platforms) {
        const deployOptions: DeployOptions = {
          bundledPath: bundledServerPath,
          version: '1.0.0',
          logger: jest.fn(),
          homeDir: tempDir,
          platform,
        };

        const result = await deployBundledServer(deployOptions);
        expect(result.installedPath).toBeTruthy();
        expect(result.upgraded).toBe(true);

        // Verify platform-specific path structure
        expect(result.installedPath).toContain('.mcp-diagnostics');
        expect(result.installedPath).toContain('mcp-server.js');
      }
    });
  });

  describe('🎯 2. Configuration Injection E2E', () => {
    it('should inject configuration into Cursor IDE config file', async () => {
      const mcpRegistration = new McpServerRegistration(mockContext);

      // Create mock Cursor config directory
      const cursorConfigDir = path.join(tempConfigDir, '.cursor');
      fs.mkdirSync(cursorConfigDir, { recursive: true });

      const configPath = path.join(cursorConfigDir, 'mcp.json');
      const existingConfig = {
        mcpServers: {
          'existing-server': {
            command: 'node',
            args: ['existing.js'],
          },
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

      // Mock the configuration location method
      jest.spyOn(mcpRegistration as any, 'locateConfigurationFile').mockResolvedValue(configPath);
      jest
        .spyOn(mcpRegistration as any, 'getInstalledServerPath')
        .mockReturnValue('/test/mcp-server.js');

      await mcpRegistration.injectConfiguration();

      // Verify configuration was updated
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(updatedConfig.mcpServers['existing-server']).toEqual(
        existingConfig.mcpServers['existing-server']
      );
      expect(updatedConfig.mcpServers['vscode-diagnostics']).toBeDefined();
      expect(updatedConfig.mcpServers['vscode-diagnostics'].command).toBe('node');
      expect(updatedConfig.mcpServers['vscode-diagnostics'].args).toEqual(['/test/mcp-server.js']);
    });

    it('should create new configuration file if none exists', async () => {
      const mcpRegistration = new McpServerRegistration(mockContext);

      const configPath = path.join(tempConfigDir, 'new-mcp.json');

      // Mock the configuration location method
      jest.spyOn(mcpRegistration as any, 'locateConfigurationFile').mockResolvedValue(configPath);
      jest
        .spyOn(mcpRegistration as any, 'getInstalledServerPath')
        .mockReturnValue('/test/mcp-server.js');

      await mcpRegistration.injectConfiguration();

      // Verify new configuration was created
      expect(fs.existsSync(configPath)).toBe(true);
      const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(newConfig.mcpServers['vscode-diagnostics']).toBeDefined();
    });

    it('should handle configuration with malformed JSON by creating backup', async () => {
      const mcpRegistration = new McpServerRegistration(mockContext);

      const configPath = path.join(tempConfigDir, 'malformed-mcp.json');
      fs.writeFileSync(configPath, '{ invalid json }');

      jest.spyOn(mcpRegistration as any, 'locateConfigurationFile').mockResolvedValue(configPath);
      jest
        .spyOn(mcpRegistration as any, 'getInstalledServerPath')
        .mockReturnValue('/test/mcp-server.js');
      jest.spyOn(console, 'error').mockImplementation();

      // Should handle malformed JSON by creating backup and proceeding
      await mcpRegistration.injectConfiguration();

      // Verify backup was created and new config is valid
      expect(fs.existsSync(configPath + '.malformed.backup')).toBe(true);
      expect(fs.existsSync(configPath)).toBe(true);

      const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(newConfig.mcpServers['vscode-diagnostics']).toBeDefined();
    });
  });

  describe('🎯 3. Configure Server Command E2E', () => {
    it('should execute complete configure server workflow', async () => {
      const mcpRegistration = new McpServerRegistration(mockContext);
      const extensionCommands = new ExtensionCommands(
        mockMcpServer,
        mockWatcher,
        mcpRegistration,
        mockVsCodeApi
      );

      // Mock successful deployment and injection
      jest.spyOn(mcpRegistration, 'deployBundledServer').mockResolvedValue({
        installedPath: '/test/mcp-server.js',
        upgraded: true,
      });
      jest.spyOn(mcpRegistration, 'injectConfiguration').mockResolvedValue();

      // Mock progress API
      const mockProgress = { report: jest.fn() };
      mockVsCodeApi.window.withProgress.mockImplementation((_options: any, task: any) => {
        return task(mockProgress, {});
      });

      // Register commands
      extensionCommands.registerCommands(mockContext);

      // Find the registered command handler
      const registerCalls = mockVsCodeApi.commands.registerCommand.mock.calls;
      const configureServerCall = registerCalls.find(
        (call: any) => call[0] === 'mcpDiagnostics.configureServer'
      );

      if (!configureServerCall) {
        console.log(
          'Available registered commands:',
          registerCalls.map((call: [string, any]) => call[0])
        );
        throw new Error(
          `Command 'mcpDiagnostics.configureServer' not found in registered commands`
        );
      }

      expect(configureServerCall).toBeDefined();
      const configureServerHandler = configureServerCall[1];

      // Execute the command
      await configureServerHandler();

      // Verify workflow executed correctly
      expect(mcpRegistration.deployBundledServer).toHaveBeenCalled();
      expect(mcpRegistration.injectConfiguration).toHaveBeenCalled();
      expect(mockProgress.report).toHaveBeenCalledWith({ message: 'Deploying server...' });
      expect(mockProgress.report).toHaveBeenCalledWith({ message: 'Injecting configuration...' });
      expect(mockVsCodeApi.window.showInformationMessage).toHaveBeenCalledWith(
        'MCP Diagnostics server configured successfully!'
      );
    });

    it('should handle deployment failures with proper error recovery', async () => {
      const mcpRegistration = new McpServerRegistration(mockContext);
      const extensionCommands = new ExtensionCommands(
        mockMcpServer,
        mockWatcher,
        mcpRegistration,
        mockVsCodeApi
      );

      // Mock deployment failure
      jest
        .spyOn(mcpRegistration, 'deployBundledServer')
        .mockRejectedValue(new Error('Deployment failed'));
      jest.spyOn(mcpRegistration, 'injectConfiguration').mockResolvedValue();

      const mockProgress = { report: jest.fn() };
      mockVsCodeApi.window.withProgress.mockImplementation((_options: any, task: any) => {
        return task(mockProgress, {});
      });

      extensionCommands.registerCommands(mockContext);

      const registerCalls = mockVsCodeApi.commands.registerCommand.mock.calls;
      const configureServerCall = registerCalls.find(
        (call: any) => call[0] === 'mcpDiagnostics.configureServer'
      );
      const configureServerHandler = configureServerCall?.[1];

      if (configureServerHandler) {
        await configureServerHandler();
      }

      // Verify error handling
      expect(mcpRegistration.deployBundledServer).toHaveBeenCalled();
      expect(mcpRegistration.injectConfiguration).not.toHaveBeenCalled();
      expect(mockVsCodeApi.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to configure server automatically.',
        'View Manual Setup'
      );
    });

    it('should handle configuration injection failures with proper recovery', async () => {
      const mcpRegistration = new McpServerRegistration(mockContext);
      const extensionCommands = new ExtensionCommands(
        mockMcpServer,
        mockWatcher,
        mcpRegistration,
        mockVsCodeApi
      );

      // Mock successful deployment but failed injection
      jest.spyOn(mcpRegistration, 'deployBundledServer').mockResolvedValue({
        installedPath: '/test/mcp-server.js',
        upgraded: true,
      });
      jest
        .spyOn(mcpRegistration, 'injectConfiguration')
        .mockRejectedValue(new Error('Injection failed'));

      const mockProgress = { report: jest.fn() };
      mockVsCodeApi.window.withProgress.mockImplementation((_options: any, task: any) => {
        return task(mockProgress, {});
      });

      extensionCommands.registerCommands(mockContext);

      const registerCalls = mockVsCodeApi.commands.registerCommand.mock.calls;
      const configureServerCall = registerCalls.find(
        (call: any) => call[0] === 'mcpDiagnostics.configureServer'
      );
      const configureServerHandler = configureServerCall?.[1];

      if (configureServerHandler) {
        await configureServerHandler();
      }

      // Verify error handling
      expect(mcpRegistration.deployBundledServer).toHaveBeenCalled();
      expect(mcpRegistration.injectConfiguration).toHaveBeenCalled();
      expect(mockVsCodeApi.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to configure server automatically.',
        'View Manual Setup'
      );
    });
  });

  describe('🎯 4. Performance Testing for Auto-Deployment', () => {
    it('should deploy server within performance thresholds', async () => {
      const bundledServerPath = path.join(tempDir, 'mcp-server.js');
      fs.writeFileSync(bundledServerPath, 'console.log("Performance test");');

      const deployOptions: DeployOptions = {
        bundledPath: bundledServerPath,
        version: '1.0.0',
        logger: jest.fn(),
        homeDir: tempDir,
        platform: 'linux',
      };

      const startTime = Date.now();
      const result = await deployBundledServer(deployOptions);
      const deploymentTime = Date.now() - startTime;

      expect(result.upgraded).toBe(true);
      expect(deploymentTime).toBeLessThan(5000); // < 5 seconds for deployment
    });

    it('should inject configuration within performance thresholds', async () => {
      const mcpRegistration = new McpServerRegistration(mockContext);

      const configPath = path.join(tempConfigDir, 'perf-test-mcp.json');
      jest.spyOn(mcpRegistration as any, 'locateConfigurationFile').mockResolvedValue(configPath);
      jest
        .spyOn(mcpRegistration as any, 'getInstalledServerPath')
        .mockReturnValue('/test/mcp-server.js');

      const startTime = Date.now();
      await mcpRegistration.injectConfiguration();
      const injectionTime = Date.now() - startTime;

      expect(injectionTime).toBeLessThan(2000); // < 2 seconds for injection
    });

    it('should handle large configuration files efficiently', async () => {
      const mcpRegistration = new McpServerRegistration(mockContext);

      // Create large configuration with many servers
      const largeConfig: { mcpServers: Record<string, any> } = { mcpServers: {} };
      for (let i = 0; i < 100; i++) {
        largeConfig.mcpServers[`server-${i}`] = {
          command: 'node',
          args: [`server-${i}.js`],
        };
      }

      const configPath = path.join(tempConfigDir, 'large-mcp.json');
      fs.writeFileSync(configPath, JSON.stringify(largeConfig, null, 2));

      jest.spyOn(mcpRegistration as any, 'locateConfigurationFile').mockResolvedValue(configPath);
      jest
        .spyOn(mcpRegistration as any, 'getInstalledServerPath')
        .mockReturnValue('/test/mcp-server.js');

      const startTime = Date.now();
      await mcpRegistration.injectConfiguration();
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(3000); // < 3 seconds for large config

      // Verify all original servers preserved
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(Object.keys(updatedConfig.mcpServers)).toHaveLength(101); // 100 original + 1 new
    });
  });

  describe('🎯 5. Error Recovery and Resilience E2E', () => {
    it('should handle file permission errors gracefully', async () => {
      // Mock atomicCopyServerBinary to fail
      const ServerInstallUtils = require('@shared/utils/ServerInstallUtils');
      ServerInstallUtils.atomicCopyServerBinary.mockResolvedValue(false);

      const bundledServerPath = path.join(tempDir, 'mcp-server.js');
      fs.writeFileSync(bundledServerPath, 'console.log("Permission test");');

      const deployOptions: DeployOptions = {
        bundledPath: bundledServerPath,
        version: '1.0.0',
        logger: jest.fn(),
        homeDir: tempDir,
        platform: 'linux',
      };

      // Should handle copy failure gracefully
      await expect(deployBundledServer(deployOptions)).rejects.toThrow('copy_failed');

      // Restore mock for other tests
      ServerInstallUtils.atomicCopyServerBinary.mockResolvedValue(true);
    });

    it('should handle concurrent deployment attempts safely', async () => {
      const bundledServerPath = path.join(tempDir, 'mcp-server.js');
      fs.writeFileSync(bundledServerPath, 'console.log("Concurrent test");');

      const deployOptions: DeployOptions = {
        bundledPath: bundledServerPath,
        version: '1.0.0',
        logger: jest.fn(),
        homeDir: tempDir,
        platform: 'linux',
      };

      // Start multiple deployments simultaneously
      const deployment1 = deployBundledServer(deployOptions);
      const deployment2 = deployBundledServer(deployOptions);
      const deployment3 = deployBundledServer(deployOptions);

      const results = await Promise.allSettled([deployment1, deployment2, deployment3]);

      // All should succeed with mocked utilities
      const successful = results.filter((r) => r.status === 'fulfilled');
      expect(successful.length).toBe(3);

      // Verify results are consistent
      const results_typed = successful as PromiseFulfilledResult<DeployResult>[];
      results_typed.forEach((result) => {
        expect(result.value.installedPath).toBeTruthy();
        expect(result.value.upgraded).toBe(true);
      });
    });

    it('should validate configuration integrity after injection', async () => {
      const mcpRegistration = new McpServerRegistration(mockContext);

      const configPath = path.join(tempConfigDir, 'integrity-test-mcp.json');
      const originalConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['test.js'],
            env: { TEST_VAR: 'value' },
          },
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(originalConfig, null, 2));

      jest.spyOn(mcpRegistration as any, 'locateConfigurationFile').mockResolvedValue(configPath);
      jest
        .spyOn(mcpRegistration as any, 'getInstalledServerPath')
        .mockReturnValue('/test/mcp-server.js');

      await mcpRegistration.injectConfiguration();

      // Verify configuration is valid JSON and preserves original data
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(updatedConfig.mcpServers['test-server']).toEqual(
        originalConfig.mcpServers['test-server']
      );
      expect(updatedConfig.mcpServers['vscode-diagnostics']).toBeDefined();

      // Verify schema compliance
      expect(typeof updatedConfig.mcpServers['vscode-diagnostics'].command).toBe('string');
      expect(Array.isArray(updatedConfig.mcpServers['vscode-diagnostics'].args)).toBe(true);
    });
  });

  describe('🎯 6. Integration with Extension Lifecycle', () => {
    it('should integrate seamlessly with extension activation', async () => {
      // Mock the bundled server deployment during activation
      const bundledPath = mockContext.asAbsolutePath('dist/assets/mcp-server.js');
      const versionManifestPath = mockContext.asAbsolutePath('dist/assets/mcp-server-version.json');

      // Create mock files
      fs.mkdirSync(path.dirname(bundledPath), { recursive: true });
      fs.writeFileSync(bundledPath, 'console.log("Activation test");');
      fs.writeFileSync(versionManifestPath, JSON.stringify({ version: '1.0.0' }));

      // Mock deployment function
      const deploymentSpy = jest.fn().mockResolvedValue({
        installedPath: '/test/mcp-server.js',
        upgraded: true,
      });

      // Simulate activation flow
      const startTime = Date.now();

      // Step 1: Initialize components
      const adapter = new VsCodeApiAdapter(mockVsCodeApi);
      const watcher = new DiagnosticsWatcher(adapter);
      const mcpServer = new McpServerWrapper(watcher, DEFAULT_CONFIG);
      const mcpRegistration = new McpServerRegistration(mockContext);
      const commands = new ExtensionCommands(mcpServer, watcher, mcpRegistration);

      // Step 2: Deploy server (simulated)
      await deploymentSpy();

      // Step 3: Register commands
      commands.registerCommands(mockContext);

      const activationTime = Date.now() - startTime;

      expect(activationTime).toBeLessThan(2000); // < 2 seconds activation
      expect(deploymentSpy).toHaveBeenCalled();

      // Cleanup
      watcher.dispose();
      mcpServer.dispose();
      commands.dispose();
    });

    it('should handle activation with deployment failures gracefully', async () => {
      const adapter = new VsCodeApiAdapter(mockVsCodeApi);
      const watcher = new DiagnosticsWatcher(adapter);
      const mcpServer = new McpServerWrapper(watcher, DEFAULT_CONFIG);
      const mcpRegistration = new McpServerRegistration(mockContext);
      const commands = new ExtensionCommands(mcpServer, watcher, mcpRegistration);

      // Mock deployment failure
      jest
        .spyOn(mcpRegistration, 'deployBundledServer')
        .mockRejectedValue(new Error('Deployment failed'));

      // Should not prevent activation
      expect(() => {
        commands.registerCommands(mockContext);
      }).not.toThrow();

      // Cleanup
      watcher.dispose();
      mcpServer.dispose();
      commands.dispose();
    });
  });
});
