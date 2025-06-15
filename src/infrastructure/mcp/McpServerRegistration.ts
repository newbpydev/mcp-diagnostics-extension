import * as vscode from 'vscode';
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { z } from 'zod';

// Type definitions for MCP configuration
interface McpServerConfig {
  type: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface McpConfiguration {
  servers: {
    mcpDiagnostics: McpServerConfig;
  };
}

// Type definitions for the proposed MCP API
interface McpServerDefinitionProvider {
  onDidChangeMcpServerDefinitions?: vscode.Event<void>;
  provideMcpServerDefinitions(
    token: vscode.CancellationToken
  ): vscode.ProviderResult<McpServerDefinition[]>;
  resolveMcpServerDefinition?(
    server: McpServerDefinition,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<McpServerDefinition>;
}

interface McpServerDefinition {
  label: string;
  version?: string;
}

interface McpStdioServerDefinitionOptions {
  label: string;
  command: string;
  args: string[];
  cwd?: vscode.Uri;
  env?: Record<string, string | number | null>;
  version?: string;
}

// Extended VS Code API for proposed features
interface ExtendedLanguageModels {
  registerMcpServerDefinitionProvider?(
    id: string,
    provider: McpServerDefinitionProvider
  ): vscode.Disposable;
}

export class McpStdioServerDefinition implements McpServerDefinition {
  public readonly label: string;
  public readonly command: string;
  public readonly args: string[];
  public readonly cwd?: vscode.Uri;
  public readonly env?: Record<string, string | number | null>;
  public readonly version?: string;

  constructor(options: McpStdioServerDefinitionOptions) {
    this.label = options.label;
    this.command = options.command;
    this.args = options.args;
    if (options.cwd !== undefined) {
      this.cwd = options.cwd;
    }
    if (options.env !== undefined) {
      this.env = options.env;
    }
    if (options.version !== undefined) {
      this.version = options.version;
    }
  }
}

// Zod schema for MCP configuration validation
const McpServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

const McpConfigurationSchema = z.object({
  mcpServers: z.record(McpServerConfigSchema),
});

type ValidatedMcpConfiguration = z.infer<typeof McpConfigurationSchema>;

/**
 * Handles automatic MCP server registration for VS Code and Cursor
 * This provides the seamless "one-click" integration experience
 */
export class McpServerRegistration {
  private disposables: vscode.Disposable[] = [];
  private didChangeEmitter: vscode.EventEmitter<void> | null = null;

  constructor(private context: vscode.ExtensionContext) {
    // Initialize EventEmitter only if available (not in test environment)
    try {
      this.didChangeEmitter = new vscode.EventEmitter<void>();
    } catch {
      console.log('[MCP Registration] EventEmitter not available (likely test environment)');
      this.didChangeEmitter = null;
    }
  }

  /**
   * Copies the bundled `mcp-server.js` file that ships with the extension
   * into the per-user installation directory (`~/.mcp-diagnostics`).
   * The copy is skipped if the destination already exists with identical
   * file size and modified time (very cheap heuristic – enough for MVP).
   *
   * Returns the destination path and whether the file was (re)deployed.
   */
  public async deployBundledServer(): Promise<{ installedPath: string; upgraded: boolean }> {
    // Priority order: always prefer the fully-featured development script; the
    // `dist/assets` copy may be a tiny stub used by the bundler for tree-shaken
    // production builds.  Choosing it first led to a 29-byte file that only
    // prints "Activation test" – the root cause of the empty server you saw
    // in C:\Users\<user>\.mcp-diagnostics .

    const bundledPathVariants = [
      // 1️⃣ Raw script in repo (development & CI) – **always** the full file
      path.join(this.context.extensionPath, 'scripts', 'mcp-server.js'),
      // 2️⃣ Compiled asset produced by rollup/webpack for marketplace builds
      path.join(this.context.extensionPath, 'dist', 'assets', 'mcp-server.js'),
    ];

    const bundledPath = bundledPathVariants.find((p) => fs.existsSync(p));
    if (!bundledPath) {
      throw new Error('Bundled MCP server binary not found.');
    }

    const installDir = this.getServerInstallDirectory();
    const destPath = path.join(installDir, 'mcp-server.js');

    // Ensure install directory exists
    fs.mkdirSync(installDir, { recursive: true });

    let upgraded = false;
    try {
      const needCopy = (() => {
        if (!fs.existsSync(destPath)) return true;
        const srcStat = fs.statSync(bundledPath);
        const dstStat = fs.statSync(destPath);
        return srcStat.size !== dstStat.size || srcStat.mtimeMs > dstStat.mtimeMs;
      })();

      if (needCopy) {
        try {
          fs.copyFileSync(bundledPath, destPath);
          upgraded = true;
          console.log('[MCP Registration] Deployed bundled server to:', destPath);
        } catch (copyError) {
          const code =
            copyError && typeof copyError === 'object' && 'code' in copyError
              ? (copyError as NodeJS.ErrnoException).code
              : undefined;

          // Windows locks the file if the previous process has not released the
          // handle yet.  Rather than failing the whole activation we tolerate
          // the common lock codes and keep using the previously deployed copy.
          if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') {
            console.warn(
              '[MCP Registration] Destination file locked – using existing server binary'
            );
            upgraded = false;
          } else {
            throw copyError;
          }
        }
      } else {
        console.log('[MCP Registration] Existing server up-to-date at:', destPath);
      }
    } catch (error) {
      console.error('[MCP Registration] Failed to deploy server:', error);
      throw error;
    }

    return { installedPath: destPath, upgraded };
  }

  /**
   * Injects MCP configuration into the user's IDE configuration files
   * Handles Cursor, VS Code, and other MCP-compatible editors
   */
  public async injectConfiguration(): Promise<void> {
    try {
      console.log('[MCP Configuration] Starting configuration injection...');

      // Phase 1: Locate configuration file with priority fallback
      const configPath = await this.locateConfigurationFile();
      console.log('[MCP Configuration] Target config path:', configPath);

      // Phase 2: Load and validate existing configuration
      const existingConfig = await this.loadAndValidateConfiguration(configPath);
      console.log('[MCP Configuration] Loaded existing configuration');

      // Phase 3: Merge with diagnostics server configuration
      const updatedConfig = this.mergeWithDiagnosticsServer(existingConfig);
      console.log('[MCP Configuration] Merged configurations');

      // Phase 4: Atomic write with backup and verification
      await this.atomicWriteConfiguration(configPath, updatedConfig);
      console.log('[MCP Configuration] ✅ Configuration injection completed successfully');

      // Show success notification
      vscode.window.showInformationMessage(
        'MCP Diagnostics server configuration injected successfully!'
      );
    } catch (error) {
      console.error('[MCP Configuration] ❌ Failed to inject configuration:', error);

      // Show user-friendly error message
      const action = await vscode.window.showErrorMessage(
        'Failed to inject MCP configuration automatically.',
        'View Manual Setup',
        'Retry'
      );

      if (action === 'View Manual Setup') {
        this.showMcpSetupGuide();
      } else if (action === 'Retry') {
        // Retry once
        try {
          await this.injectConfiguration();
        } catch (retryError) {
          console.error('[MCP Configuration] Retry failed:', retryError);
          this.showMcpSetupGuide();
        }
      }
    }
  }

  /**
   * Locates the appropriate configuration file for MCP server injection
   * Prioritizes global user config when using deployed server
   */
  private async locateConfigurationFile(): Promise<string> {
    const configPaths = this.getConfigurationPaths();

    // Check if we have a deployed server in the user directory
    const deployedServerPath = this.getInstalledServerPath();
    const isServerDeployed = fs.existsSync(deployedServerPath);

    let targetPath: string;

    if (isServerDeployed) {
      // When server is deployed to user directory, prioritize global user config
      // This ensures the configuration points to the deployed server location
      const homeDir = os.homedir();
      if (!homeDir) {
        throw new Error('Unable to determine home directory');
      }
      targetPath = path.join(homeDir, '.cursor', 'mcp.json');
      console.log('[MCP Configuration] Using global user config for deployed server:', targetPath);
    } else {
      // Fallback to existing priority order for development/workspace scenarios
      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          console.log('[MCP Configuration] Found existing configuration at:', configPath);
          return configPath;
        }
      }

      // If no existing file found, create in highest priority location
      const firstPath = configPaths[0];
      if (!firstPath) {
        throw new Error('No configuration paths available');
      }
      targetPath = firstPath;
      console.log('[MCP Configuration] Will create new configuration at:', targetPath);
    }

    const targetDir = path.dirname(targetPath);

    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
      console.log('[MCP Configuration] Creating directory:', targetDir);
      fs.mkdirSync(targetDir, { recursive: true });
    }

    return targetPath;
  }

  /**
   * Gets configuration file paths in priority order
   */
  private getConfigurationPaths(): string[] {
    const paths: string[] = [];

    // Priority 1: Workspace .cursor directory
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      // Use non-null assertion since we've verified length > 0
      const workspacePath = workspaceFolders[0]!.uri.fsPath;
      paths.push(path.join(workspacePath, '.cursor', 'mcp.json'));
      paths.push(path.join(workspacePath, 'mcp.json'));
    }

    // Priority 3: Global user .cursor directory
    const homeDir = os.homedir();
    if (homeDir) {
      paths.push(path.join(homeDir, '.cursor', 'mcp.json'));
    }

    return paths;
  }

  /**
   * Loads and validates existing configuration using Zod schema
   */
  private async loadAndValidateConfiguration(
    configPath: string
  ): Promise<ValidatedMcpConfiguration> {
    if (!fs.existsSync(configPath)) {
      console.log('[MCP Configuration] No existing configuration, using default');
      return { mcpServers: {} };
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      // Validate with Zod schema
      const validatedConfig = McpConfigurationSchema.parse(parsedConfig);
      console.log('[MCP Configuration] Configuration validation successful');

      return validatedConfig;
    } catch (parseError) {
      console.warn('[MCP Configuration] Failed to parse existing configuration:', parseError);

      // Create backup of malformed file
      const backupPath = `${configPath}.malformed.backup`;
      try {
        fs.copyFileSync(configPath, backupPath);
        console.log('[MCP Configuration] Created backup of malformed file:', backupPath);
      } catch (backupError) {
        console.warn('[MCP Configuration] Failed to create backup:', backupError);
      }

      // Return default configuration
      return { mcpServers: {} };
    }
  }

  /**
   * Merges existing configuration with diagnostics server configuration
   * Preserves user customizations and updates diagnostics server entry
   */
  private mergeWithDiagnosticsServer(
    existingConfig: ValidatedMcpConfiguration
  ): ValidatedMcpConfiguration {
    // Get the current server installation path
    const serverPath = this.getInstalledServerPath();

    // Create diagnostics server configuration
    const diagnosticsServerConfig = {
      command: 'node',
      args: [serverPath],
      env: {
        NODE_ENV: 'production',
        MCP_DEBUG: 'false',
        MCP_NODE_MODULES_PATH: path.join(this.context.extensionPath, 'node_modules'),
      },
    };

    // Deep merge: preserve all existing servers, update/add diagnostics server
    const mergedConfig: ValidatedMcpConfiguration = {
      mcpServers: {
        ...existingConfig.mcpServers,
        'vscode-diagnostics': diagnosticsServerConfig,
      },
    };

    console.log('[MCP Configuration] Merged configuration with diagnostics server');
    return mergedConfig;
  }

  /**
   * Performs atomic write with backup, temp file, and verification
   */
  private async atomicWriteConfiguration(
    configPath: string,
    config: ValidatedMcpConfiguration
  ): Promise<void> {
    const backupPath = `${configPath}.backup`;
    const tempPath = `${configPath}.tmp`;

    try {
      // Step 1: Create backup if file exists
      if (fs.existsSync(configPath)) {
        fs.copyFileSync(configPath, backupPath);
        console.log('[MCP Configuration] Created backup:', backupPath);
      }

      // Step 2: Write to temporary file
      const configJson = JSON.stringify(config, null, 2);
      fs.writeFileSync(tempPath, configJson, 'utf8');
      console.log('[MCP Configuration] Wrote to temporary file:', tempPath);

      // Step 3: Validate the written content
      const writtenContent = fs.readFileSync(tempPath, 'utf8');
      const parsedWritten = JSON.parse(writtenContent);
      McpConfigurationSchema.parse(parsedWritten);
      console.log('[MCP Configuration] Validated written content');

      // Step 4: Atomic rename
      fs.renameSync(tempPath, configPath);
      console.log('[MCP Configuration] Atomic rename completed');

      // Step 5: Final verification
      const finalContent = fs.readFileSync(configPath, 'utf8');
      const finalParsed = JSON.parse(finalContent);
      const finalValidated = McpConfigurationSchema.parse(finalParsed);

      if (!finalValidated.mcpServers['vscode-diagnostics']) {
        throw new Error(
          'Verification failed: vscode-diagnostics server not found in final configuration'
        );
      }

      console.log('[MCP Configuration] Final verification successful');

      // Clean up backup on success
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        console.log('[MCP Configuration] Cleaned up backup file');
      }
    } catch (error) {
      console.error('[MCP Configuration] Atomic write failed:', error);

      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupError) {
          console.warn('[MCP Configuration] Failed to cleanup temp file:', cleanupError);
        }
      }

      // Attempt rollback from backup
      if (fs.existsSync(backupPath)) {
        try {
          fs.copyFileSync(backupPath, configPath);
          console.log('[MCP Configuration] Rolled back from backup');
        } catch (rollbackError) {
          console.error('[MCP Configuration] Rollback failed:', rollbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Gets the installed server path from the deployment service
   */
  private getInstalledServerPath(): string {
    // Use the same logic as ServerInstallUtils to get consistent path
    const installDir = this.getServerInstallDirectory();
    return path.join(installDir, 'mcp-server.js');
  }

  /**
   * Gets the server installation directory (cross-platform)
   */
  private getServerInstallDirectory(): string {
    const homeDir = os.homedir();
    if (!homeDir) {
      throw new Error('Unable to determine home directory');
    }
    return path.join(homeDir, '.mcp-diagnostics');
  }

  /**
   * Registers the MCP server definition provider for automatic discovery
   * Uses multiple strategies for maximum compatibility
   */
  public registerMcpServerProvider(): void {
    console.log('[MCP Registration] Starting MCP server registration...');

    // Strategy 1: Try proposed API (VS Code Insiders)
    if (this.tryProposedApiRegistration()) {
      console.log('[MCP Registration] ✅ Successfully registered via proposed API');
      return;
    }

    // Strategy 2: Create workspace MCP configuration
    if (this.tryWorkspaceMcpConfiguration()) {
      console.log('[MCP Registration] ✅ Successfully created workspace MCP configuration');
    }

    // Strategy 3: Create user settings configuration
    if (this.tryUserSettingsConfiguration()) {
      console.log('[MCP Registration] ✅ Successfully created user settings configuration');
    }

    // Strategy 4: Show manual setup instructions
    this.showManualSetupInstructions();
  }

  /**
   * Strategy 1: Try the proposed API registration (VS Code Insiders only)
   */
  private tryProposedApiRegistration(): boolean {
    try {
      // Check if the proposed API is available
      const lm = vscode.lm as unknown as ExtendedLanguageModels;
      if (!lm || !lm.registerMcpServerDefinitionProvider) {
        console.log('[MCP Registration] Proposed API not available (stable VS Code)');
        return false;
      }

      console.log('[MCP Registration] Proposed API available, registering provider...');

      const provider: McpServerDefinitionProvider = {
        ...(this.didChangeEmitter && {
          onDidChangeMcpServerDefinitions: this.didChangeEmitter.event,
        }),
        provideMcpServerDefinitions: async () => {
          return this.createServerDefinitions();
        },
        resolveMcpServerDefinition: async (server: McpServerDefinition) => {
          return this.resolveServerDefinition(server);
        },
      };

      const disposable = lm.registerMcpServerDefinitionProvider('mcpDiagnosticsProvider', provider);
      this.disposables.push(disposable);

      // Show success notification
      this.showSuccessNotification('Proposed API');
      return true;
    } catch (error) {
      console.log('[MCP Registration] Proposed API registration failed:', error);
      return false;
    }
  }

  /**
   * Strategy 2: Create workspace MCP configuration (.vscode/mcp.json)
   */
  private tryWorkspaceMcpConfiguration(): boolean {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        console.log('[MCP Registration] No workspace folders available');
        return false;
      }

      const workspaceFolder = workspaceFolders[0];
      if (!workspaceFolder) {
        console.log('[MCP Registration] No valid workspace folder found');
        return false;
      }

      const vscodeDir = path.join(workspaceFolder.uri.fsPath, '.vscode');
      const mcpConfigPath = path.join(vscodeDir, 'mcp.json');

      // Create .vscode directory if it doesn't exist
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
      }

      // Check if mcp.json already exists
      if (fs.existsSync(mcpConfigPath)) {
        console.log('[MCP Registration] Workspace MCP config already exists');
        return true;
      }

      const mcpConfig = this.createMcpConfiguration();
      fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));

      console.log('[MCP Registration] Created workspace MCP configuration at:', mcpConfigPath);
      this.showSuccessNotification('Workspace Configuration');
      return true;
    } catch (error) {
      console.log('[MCP Registration] Failed to create workspace MCP config:', error);
      return false;
    }
  }

  /**
   * Strategy 3: Create user settings configuration
   */
  private tryUserSettingsConfiguration(): boolean {
    try {
      console.log('[MCP Registration] Attempting user settings configuration...');

      // Check if mcp.servers configuration is available
      const config = vscode.workspace.getConfiguration();
      const inspection = config.inspect('mcp.servers');

      if (!inspection) {
        console.log('[MCP Registration] mcp.servers configuration not available in this editor');
        return false;
      }

      const mcpConfig = vscode.workspace.getConfiguration('mcp');
      const existingServers = mcpConfig.get('servers', {});

      // Check if our server is already configured
      if (
        existingServers &&
        typeof existingServers === 'object' &&
        'mcpDiagnostics' in existingServers
      ) {
        console.log('[MCP Registration] User settings MCP config already exists');
        return true;
      }

      // Add our server to user settings
      const serverConfig = this.createServerConfiguration();
      const updatedServers = {
        ...existingServers,
        mcpDiagnostics: serverConfig,
      };

      // Update user settings
      mcpConfig.update('servers', updatedServers, vscode.ConfigurationTarget.Global);

      console.log('[MCP Registration] Added MCP server to user settings');
      this.showSuccessNotification('User Settings');
      return true;
    } catch (error) {
      console.log('[MCP Registration] Failed to update user settings:', error);
      return false;
    }
  }

  /**
   * Strategy 4: Show manual setup instructions
   */
  private showManualSetupInstructions(): void {
    const message =
      'MCP Diagnostics server is ready! Click "Setup MCP" to configure automatic integration.';

    try {
      const notificationPromise = vscode.window.showInformationMessage(
        message,
        'Setup MCP',
        'Learn More',
        'Dismiss'
      );

      // Handle the notification response if available
      void notificationPromise?.then((selection) => {
        if (selection === 'Setup MCP') {
          this.showMcpSetupGuide();
        } else if (selection === 'Learn More') {
          void vscode.env.openExternal(
            vscode.Uri.parse(
              'https://github.com/newbpydev/mcp-diagnostics-extension#mcp-integration'
            )
          );
        }
      });
    } catch {
      // Ignore notification errors in test environments
      console.log('[MCP Registration] Notification not available (likely test environment)');
    }
  }

  /**
   * Show MCP setup guide
   */
  public showMcpSetupGuide(): void {
    if (process.env['NODE_ENV'] === 'test') {
      // Debug log to help unit tests confirm invocation order

      console.log('[Debug] showMcpSetupGuide invoked');
    }
    const panel = vscode.window.createWebviewPanel(
      'mcpSetupGuide',
      'MCP Diagnostics Setup Guide',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    // If the mock webview implementation doesn't expose the messaging API we
    // can safely exit – the setup guide is a purely informational UI that
    // isn't required for backend functionality and therefore should never
    // cause unit-test failures.
    if (
      typeof (panel.webview as { onDidReceiveMessage?: unknown }).onDidReceiveMessage !== 'function'
    ) {
      return;
    }

    // Handle messages from the webview (mock-friendly: only attach if available)
    try {
      const onMessageFn = (panel.webview as { onDidReceiveMessage?: unknown })
        .onDidReceiveMessage as (
        listener: (...args: unknown[]) => void,
        thisArg?: unknown,
        disposables?: vscode.Disposable[]
      ) => void;

      onMessageFn(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (message: any): void => {
          if (message.command === 'configureServer') {
            void (async () => {
              try {
                await vscode.commands.executeCommand('mcpDiagnostics.configureServer');
                panel.dispose();
              } catch (error) {
                console.error('[MCP Setup Guide] Configure server error:', error);
                vscode.window.showErrorMessage(
                  `Failed to configure server: ${error instanceof Error ? error.message : String(error)}`
                );
              }
            })();
          }
        },
        undefined,
        this.disposables
      );
    } catch {
      // In test environments the mock may not fully implement webview messaging.
    }

    panel.webview.html = this.getMcpSetupGuideHtml();
  }

  /**
   * Create server definitions for the proposed API
   */
  private createServerDefinitions(): McpServerDefinition[] {
    const serverScriptPath = path.join(this.context.extensionPath, 'scripts', 'mcp-server.js');

    const server = new McpStdioServerDefinition({
      label: 'MCP Diagnostics',
      command: process.execPath,
      args: [serverScriptPath],
      cwd: vscode.Uri.file(this.context.extensionPath),
      env: {
        NODE_ENV: 'production',
        MCP_DEBUG: 'false',
        MCP_NODE_MODULES_PATH: path.join(this.context.extensionPath, 'node_modules'),
      },
      version: '1.0.0',
    });

    return [server];
  }

  /**
   * Resolve server definition (for proposed API)
   */
  private async resolveServerDefinition(
    server: McpServerDefinition
  ): Promise<McpServerDefinition | undefined> {
    if (server.label === 'MCP Diagnostics') {
      const serverScriptPath = path.join(this.context.extensionPath, 'scripts', 'mcp-server.js');

      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(serverScriptPath));
        console.log('[MCP Registration] Server script found, server ready to start');
        return server;
      } catch {
        console.error('[MCP Registration] Server script not found:', serverScriptPath);
        const errorPromise = vscode.window.showErrorMessage(
          'MCP Diagnostics server script not found. Please ensure the extension is properly compiled.',
          'Compile Extension'
        );

        void errorPromise?.then((selection) => {
          if (selection === 'Compile Extension') {
            void vscode.commands.executeCommand('workbench.action.tasks.runTask', 'npm: compile');
          }
        });
        return undefined;
      }
    }

    return server;
  }

  /**
   * Create MCP configuration object
   */
  private createMcpConfiguration(): McpConfiguration {
    return {
      servers: {
        mcpDiagnostics: this.createServerConfiguration(),
      },
    };
  }

  /**
   * Create server configuration
   */
  private createServerConfiguration(): McpServerConfig {
    const serverScriptPath = path.join(this.context.extensionPath, 'scripts', 'mcp-server.js');

    return {
      type: 'stdio',
      command: process.execPath,
      args: [serverScriptPath],
      env: {
        NODE_ENV: 'production',
        MCP_DEBUG: 'false',
        MCP_NODE_MODULES_PATH: path.join(this.context.extensionPath, 'node_modules'),
      },
    };
  }

  /**
   * Show success notification
   */
  private showSuccessNotification(method: string): void {
    const config = vscode.workspace.getConfiguration('mcpDiagnostics');
    const showNotification = config.get('showAutoRegistrationNotification', true);

    if (showNotification) {
      const notificationPromise = vscode.window.showInformationMessage(
        `🎉 MCP Diagnostics server automatically registered via ${method}! Ready for AI agents.`,
        'Test Connection',
        "Don't Show Again"
      );

      void notificationPromise?.then((selection) => {
        if (selection === 'Test Connection') {
          void vscode.commands.executeCommand('mcpDiagnostics.showStatus');
        } else if (selection === "Don't Show Again") {
          void config.update(
            'showAutoRegistrationNotification',
            false,
            vscode.ConfigurationTarget.Global
          );
        }
      });
    }
  }

  /**
   * Get MCP setup guide HTML
   */
  /* istanbul ignore next -- large static HTML, excluded from coverage */
  private getMcpSetupGuideHtml(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
        <title>MCP Diagnostics Setup Guide</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }

          .container {
            max-width: 800px;
            margin: 0 auto;
          }

          .step {
            margin: 24px 0;
            padding: 20px;
            border-left: 4px solid var(--vscode-button-background);
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 0 8px 8px 0;
          }

          .step h3 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .code-block {
            background: var(--vscode-textCodeBlock-background);
            padding: 16px;
            border-radius: 8px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            border: 1px solid var(--vscode-panel-border);
            position: relative;
            overflow-x: auto;
          }

          .code-block pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
          }

          .copy-button {
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            opacity: 0.8;
            transition: opacity 0.2s;
          }

          .copy-button:hover {
            opacity: 1;
            background: var(--vscode-button-hoverBackground);
          }

          .success {
            color: var(--vscode-testing-iconPassed);
            font-weight: 600;
          }

          .warning {
            color: var(--vscode-testing-iconQueued);
            font-weight: 600;
          }

          .info {
            color: var(--vscode-textLink-foreground);
            font-weight: 600;
          }

          .highlight {
            background-color: var(--vscode-editor-findMatchHighlightBackground);
            padding: 2px 4px;
            border-radius: 3px;
          }

          ul, ol {
            padding-left: 20px;
          }

          li {
            margin: 8px 0;
          }

          .json-config {
            position: relative;
          }

          .config-title {
            margin-bottom: 12px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
          }

          .path-highlight {
            color: var(--vscode-debugTokenExpression-string);
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 MCP Diagnostics Setup Guide</h1>

          <div class="step">
            <h3><span class="success">✅</span> Extension Ready</h3>
            <p>Your MCP Diagnostics extension is installed and running!</p>
          </div>

          <div class="step">
            <h3><span class="success">⚡</span> One-Click Auto-Setup (Recommended)</h3>
            <p>Skip manual configuration and let the extension do everything automatically:</p>
            <div style="margin: 16px 0;">
              <button
                onclick="configureServer()"
                style="
                  background: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  padding: 12px 24px;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                  transition: background-color 0.2s;
                "
                onmouseover="this.style.background='var(--vscode-button-hoverBackground)'"
                onmouseout="this.style.background='var(--vscode-button-background)'"
              >
                🚀 Configure Server Automatically
              </button>
            </div>
            <p><strong>What this does:</strong></p>
            <ul>
              <li>✅ Deploys MCP server to your user directory</li>
              <li>✅ Automatically configures Cursor/MCP client settings</li>
              <li>✅ Creates backup of existing configurations</li>
              <li>✅ Works across Windows, macOS, and Linux</li>
            </ul>
            <p class="info">💡 <strong>Recommended:</strong> Try the automatic setup first. If it doesn't work, use the manual instructions below.</p>
          </div>

          <div class="step">
            <h3><span class="info">🔧</span> For VS Code Users</h3>
            <p>The extension has automatically configured MCP integration in your <code>.vscode/mcp.json</code> file. You can now:</p>
            <ul>
              <li>Use <span class="highlight">Agent Mode</span> in GitHub Copilot Chat</li>
              <li>Access MCP tools via the <span class="highlight">Tools</span> button</li>
              <li>Run <code>MCP: List Servers</code> to see available servers</li>
            </ul>
          </div>

          <div class="step">
            <h3><span class="warning">🎯</span> For Cursor Users</h3>
            <div class="config-title">Add this configuration to your Cursor MCP settings for <strong>real VS Code diagnostics</strong>:</div>
            <div class="json-config">
              <div class="code-block">
                <button class="copy-button" onclick="copyToClipboard('cursor-config')">Copy</button>
                <pre id="cursor-config">{
  "mcpServers": {
    "vscode-diagnostics": {
      "command": "node",
      "args": [
        "<span class="path-highlight">${this.context.extensionPath?.replace(/\\/g, '/') || '/path/to/extension'}/scripts/mcp-server.js</span>"
      ],
      "env": {
        "NODE_ENV": "production",
        "MCP_DEBUG": "false",
        "MCP_NODE_MODULES_PATH": "${path.join(this.context.extensionPath, 'node_modules')}"
      }
    }
  }
}</pre>
              </div>
            </div>
            <p><strong>Note:</strong> Replace the highlighted path with your actual extension path if needed. You can also use the provided <code>cursor-mcp-config.json</code> template file.</p>
          </div>

          <div class="step">
            <h3><span class="info">🌊</span> For Windsurf Users</h3>
            <div class="config-title">Add this configuration to your <code>.windsurf/mcp.json</code> file:</div>
            <div class="json-config">
              <div class="code-block">
                <button class="copy-button" onclick="copyToClipboard('windsurf-config')">Copy</button>
                <pre id="windsurf-config">{
  "servers": {
    "vscode-diagnostics": {
      "type": "stdio",
      "command": "node",
      "args": [
        "<span class="path-highlight">${this.context.extensionPath?.replace(/\\/g, '/') || '/path/to/extension'}/scripts/mcp-server.js</span>"
      ],
      "env": {
        "NODE_ENV": "production",
        "MCP_DEBUG": "false",
        "MCP_NODE_MODULES_PATH": "${path.join(this.context.extensionPath, 'node_modules')}"
      }
    }
  }
}</pre>
              </div>
            </div>
            <p><strong>Note:</strong> Create the <code>.windsurf</code> directory in your project root if it doesn't exist.</p>
          </div>

          <div class="step">
            <h3><span class="info">🧪</span> Test Your Setup</h3>
            <p>Try these commands to verify everything is working:</p>
            <ul>
              <li><code>MCP Diagnostics: Show Status</code> - View current problems</li>
              <li><code>MCP Diagnostics: Restart Server</code> - Restart the MCP server</li>
            </ul>
          </div>

          <div class="step">
            <h3><span class="info">📚</span> Available MCP Tools</h3>
            <ul>
              <li><strong>getProblems</strong> - Get all current diagnostics with filtering options</li>
              <li><strong>getProblemsForFile</strong> - Get problems for a specific file path</li>
              <li><strong>getWorkspaceSummary</strong> - Get summary statistics grouped by severity</li>
            </ul>
          </div>

          <div class="step">
            <h3><span class="success">🎉</span> You're All Set!</h3>
            <p class="success">Your AI agents can now access VS Code diagnostics via MCP.</p>
            <p>The MCP server will automatically start when VS Code loads and provide real-time diagnostic information to connected clients.</p>
          </div>
        </div>

        <script>
          function configureServer() {
            // Call the VS Code command to configure the server automatically
            if (typeof acquireVsCodeApi !== 'undefined') {
              const vscode = acquireVsCodeApi();
              vscode.postMessage({
                command: 'configureServer'
              });
            } else {
              // Fallback: show instructions to run the command manually
              alert('Please run the command "MCP Diagnostics: Configure Server" from the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)');
            }
          }

          function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;

            // Remove HTML tags and clean up the text
            const cleanText = text
              .replace(/<[^>]*>/g, '')
              .replace(/Copy/g, '')
              .trim();

            navigator.clipboard.writeText(cleanText).then(() => {
              const button = element.parentElement.querySelector('.copy-button');
              const originalText = button.textContent;
              button.textContent = 'Copied!';
              button.style.background = 'var(--vscode-testing-iconPassed)';

              setTimeout(() => {
                button.textContent = originalText;
                button.style.background = 'var(--vscode-button-background)';
              }, 2000);
            }).catch(err => {
              console.error('Failed to copy text: ', err);
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Refresh server definitions (for proposed API)
   */
  public refreshServerDefinitions(): void {
    if (this.didChangeEmitter) {
      this.didChangeEmitter.fire();
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.disposables.forEach((d) => {
      if (d && typeof d.dispose === 'function') {
        d.dispose();
      }
    });
    this.disposables = [];

    if (this.didChangeEmitter) {
      if (typeof this.didChangeEmitter.dispose === 'function') {
        this.didChangeEmitter.dispose();
      }
      this.didChangeEmitter = null;
    }
  }
}
