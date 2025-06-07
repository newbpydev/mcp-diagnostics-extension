// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { VsCodeApiAdapter } from '@infrastructure/vscode/VsCodeApiAdapter';
import { DEFAULT_CONFIG } from '@shared/constants';

let diagnosticsWatcher: DiagnosticsWatcher | undefined;
let mcpServer: McpServerWrapper | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(
  context: vscode.ExtensionContext,
  deps?: {
    DiagnosticsWatcherCtor?: typeof DiagnosticsWatcher;
    McpServerWrapperCtor?: typeof McpServerWrapper;
    VsCodeApiAdapterCtor?: typeof VsCodeApiAdapter;
  }
): Promise<void> {
  console.log('MCP Diagnostics Extension activating...');

  try {
    const startTime = Date.now();

    // Use injected constructors for testability
    const DiagnosticsWatcherCtor = deps?.DiagnosticsWatcherCtor || DiagnosticsWatcher;
    const McpServerWrapperCtor = deps?.McpServerWrapperCtor || McpServerWrapper;
    const VsCodeApiAdapterCtor = deps?.VsCodeApiAdapterCtor || VsCodeApiAdapter;

    // Create DiagnosticsWatcher with adapter
    const vsCodeAdapter = new VsCodeApiAdapterCtor(vscode);
    diagnosticsWatcher = new DiagnosticsWatcherCtor(vsCodeAdapter);

    // Get configuration
    const config = vscode.workspace.getConfiguration('mcpDiagnostics');
    const serverConfig = {
      port: config.get('server.port', DEFAULT_CONFIG.mcpServerPort),
      enableDebugLogging: config.get('enableDebugLogging', DEFAULT_CONFIG.enableDebugLogging),
    };

    // Create and start MCP server
    mcpServer = new McpServerWrapperCtor(diagnosticsWatcher, serverConfig);
    await mcpServer.start();

    // Add disposables to context
    context.subscriptions.push(
      { dispose: () => diagnosticsWatcher?.dispose() },
      { dispose: () => mcpServer?.dispose() }
    );

    const activationTime = Date.now() - startTime;
    console.log(`MCP Diagnostics Extension activated successfully in ${activationTime}ms`);
  } catch (error) {
    console.error('Failed to activate extension:', error);
    vscode.window.showErrorMessage(`MCP Diagnostics Extension failed: ${error}`);
    throw error;
  }
}

// This method is called when your extension is deactivated
export function deactivate(): void {
  console.log('MCP Diagnostics Extension deactivating...');

  try {
    mcpServer?.dispose();
    diagnosticsWatcher?.dispose();

    mcpServer = undefined;
    diagnosticsWatcher = undefined;

    console.log('MCP Diagnostics Extension deactivated successfully');
  } catch (error) {
    console.error('Error during deactivation:', error);
  }
}
