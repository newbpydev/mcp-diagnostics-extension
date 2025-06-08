/**
 * VS Code MCP Diagnostics Extension
 *
 * This extension monitors VS Code's diagnostic problems (errors, warnings, etc.)
 * in real-time and exposes them via a Model Context Protocol (MCP) server for
 * consumption by AI agents and other MCP-enabled tools.
 *
 * @author Your Name <your.email@example.com>
 * @version 1.0.0
 * @license MIT
 */

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DiagnosticsWatcher } from './core/diagnostics/DiagnosticsWatcher';
import { McpServerWrapper } from './infrastructure/mcp/McpServerWrapper';
import { VsCodeApiAdapter } from './infrastructure/vscode/VsCodeApiAdapter';
import { ExtensionCommands } from './commands/ExtensionCommands';
import { DEFAULT_CONFIG } from './shared/constants';

/**
 * Global DiagnosticsWatcher instance for the extension lifecycle
 */
let diagnosticsWatcher: DiagnosticsWatcher | undefined;

/**
 * Global MCP server instance for the extension lifecycle
 */
let mcpServer: McpServerWrapper | undefined;

/**
 * Global extension commands instance for the extension lifecycle
 */
let extensionCommands: ExtensionCommands | undefined;

/**
 * Interface for dependency injection during testing
 */
export interface ExtensionDependencies {
  DiagnosticsWatcherCtor?: typeof DiagnosticsWatcher;
  McpServerWrapperCtor?: typeof McpServerWrapper;
  VsCodeApiAdapterCtor?: typeof VsCodeApiAdapter;
}

/**
 * Activates the MCP Diagnostics Extension
 *
 * This method is called when the extension is activated. It initializes all
 * core components including the diagnostics watcher, MCP server, and command
 * handlers. The extension uses dependency injection for testability.
 *
 * Key initialization steps:
 * 1. Create VS Code API adapter for testability
 * 2. Initialize DiagnosticsWatcher to monitor problems panel
 * 3. Start MCP server with configured settings
 * 4. Register extension commands and status bar
 * 5. Set up event handlers for real-time updates
 *
 * @param context - VS Code extension context for managing subscriptions and lifecycle
 * @param deps - Optional dependency injection for testing (constructors to use instead of defaults)
 *
 * @throws {Error} If any component fails to initialize
 *
 * @example
 * ```typescript
 * // Normal activation (called by VS Code)
 * await activate(context);
 *
 * // Test activation with mocked dependencies
 * await activate(context, {
 *   DiagnosticsWatcherCtor: MockDiagnosticsWatcher,
 *   McpServerWrapperCtor: MockMcpServer
 * });
 * ```
 */
export async function activate(
  context: vscode.ExtensionContext,
  deps?: ExtensionDependencies
): Promise<void> {
  console.log('🟡 [MCP Diagnostics] Activation: Starting...');
  try {
    const startTime = Date.now();

    // Use injected constructors for testability
    const DiagnosticsWatcherCtor = deps?.DiagnosticsWatcherCtor || DiagnosticsWatcher;
    const McpServerWrapperCtor = deps?.McpServerWrapperCtor || McpServerWrapper;
    const VsCodeApiAdapterCtor = deps?.VsCodeApiAdapterCtor || VsCodeApiAdapter;

    // Step 1: DiagnosticsWatcher
    console.log('🟡 [MCP Diagnostics] Initializing DiagnosticsWatcher...');
    const vsCodeAdapter = new VsCodeApiAdapterCtor(vscode);
    diagnosticsWatcher = new DiagnosticsWatcherCtor(vsCodeAdapter);
    console.log('🟢 [MCP Diagnostics] DiagnosticsWatcher initialized.');

    // Get configuration
    console.log('🚀 Getting configuration...');
    const config = vscode.workspace.getConfiguration('mcpDiagnostics');
    const serverConfig = {
      port: config.get('server.port', DEFAULT_CONFIG.mcpServerPort),
      enableDebugLogging: config.get('enableDebugLogging', DEFAULT_CONFIG.enableDebugLogging),
    };

    console.log('🚀 Server config:', serverConfig);

    // Step 2: MCP Server
    console.log('🟡 [MCP Diagnostics] Initializing MCP Server...');
    mcpServer = new McpServerWrapperCtor(diagnosticsWatcher, serverConfig);
    await mcpServer.start();
    console.log('🟢 [MCP Diagnostics] MCP Server started.');

    // Step 3: ExtensionCommands
    console.log('🟡 [MCP Diagnostics] Registering extension commands...');
    extensionCommands = new ExtensionCommands(mcpServer, diagnosticsWatcher);
    extensionCommands.registerCommands(context);
    console.log('🟢 [MCP Diagnostics] Extension commands registered.');

    // Step 4: Push disposables
    console.log('🟡 [MCP Diagnostics] Adding disposables to context...');
    context.subscriptions.push(
      { dispose: () => diagnosticsWatcher?.dispose() },
      { dispose: () => mcpServer?.dispose() },
      { dispose: () => extensionCommands?.dispose() }
    );
    console.log('🟢 [MCP Diagnostics] All disposables pushed to context.');

    const activationTime = Date.now() - startTime;
    console.log(`🎉 MCP Diagnostics Extension activated successfully in ${activationTime}ms`);

    // Step 5: Notify user
    vscode.window.showInformationMessage(
      `MCP Diagnostics Extension activated successfully! Server running on port ${serverConfig.port}`
    );
    console.log('🟢 [MCP Diagnostics] Activation: Complete.');
  } catch (err) {
    console.error('🔴 [MCP Diagnostics] Activation failed:', err);
    console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack trace');

    const errorMessage = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`MCP Diagnostics Extension failed: ${errorMessage}`);
    throw err;
  }
}

/**
 * Deactivates the MCP Diagnostics Extension
 *
 * This method is called when the extension is deactivated (e.g., when VS Code
 * shuts down or the extension is disabled). It performs cleanup operations to
 * prevent memory leaks and ensure graceful shutdown.
 *
 * Cleanup operations:
 * 1. Dispose of extension commands and status bar
 * 2. Stop and dispose of MCP server
 * 3. Dispose of diagnostics watcher and event listeners
 * 4. Clear global references
 *
 * @throws {Error} If cleanup operations fail (logged but does not re-throw)
 *
 * @example
 * ```typescript
 * // Called automatically by VS Code during shutdown
 * deactivate();
 * ```
 */
export function deactivate(): void {
  console.log('🟡 [MCP Diagnostics] Deactivation: Starting...');

  try {
    extensionCommands?.dispose();
    mcpServer?.dispose();
    diagnosticsWatcher?.dispose();

    extensionCommands = undefined;
    mcpServer = undefined;
    diagnosticsWatcher = undefined;

    console.log('✅ MCP Diagnostics Extension deactivated successfully');
    console.log('🟢 [MCP Diagnostics] Deactivation: Complete.');
  } catch (err) {
    console.error('🔴 [MCP Diagnostics] Deactivation error:', err);
  }
}
