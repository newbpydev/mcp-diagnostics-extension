import * as vscode from 'vscode';
import { McpServerWrapper } from '../infrastructure/mcp/McpServerWrapper';
import { DiagnosticsWatcher } from '../core/diagnostics/DiagnosticsWatcher';
import { ProblemItem } from '../shared/types';
import { McpServerRegistration } from '../infrastructure/mcp/McpServerRegistration';

interface StatusSummary {
  totalProblems: number;
  byFile: Record<string, number>;
  bySeverity: Record<string, number>;
  byWorkspace: Record<string, number>;
  serverStatus: string;
  lastUpdate: string;
}

/**
 * Manages VS Code extension commands and status bar integration
 * for the MCP Diagnostics extension.
 */
export class ExtensionCommands {
  private statusBarItem: vscode.StatusBarItem;

  constructor(
    private mcpServer: McpServerWrapper,
    private diagnosticsWatcher: DiagnosticsWatcher,
    private mcpRegistration: McpServerRegistration
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.updateStatusBar();

    // Listen for problems changes to update status bar
    this.diagnosticsWatcher.on('problemsChanged', () => {
      this.onProblemsChanged();
    });
  }

  /**
   * Registers all extension commands with VS Code and sets up the status bar.
   */
  public registerCommands(context: vscode.ExtensionContext): void {
    const commands = [
      vscode.commands.registerCommand('mcpDiagnostics.restart', this.restartServer.bind(this)),
      vscode.commands.registerCommand('mcpDiagnostics.showStatus', this.showStatus.bind(this)),
      vscode.commands.registerCommand(
        'mcpDiagnostics.showSetupGuide',
        this.showSetupGuide.bind(this)
      ),
      vscode.commands.registerCommand(
        'mcpDiagnostics.configureServer',
        this.configureServer.bind(this)
      ),
    ];

    context.subscriptions.push(...commands, this.statusBarItem);
    this.statusBarItem.show();
  }

  /**
   * Command handler to restart the MCP server.
   */
  private async restartServer(): Promise<void> {
    try {
      this.updateStatusBar('Restarting...');

      // Use proper restart method that handles async stop/start cycle
      await this.mcpServer.restart();

      this.updateStatusBar();
      vscode.window.showInformationMessage(
        `MCP Diagnostics Server restarted successfully! Server is ${this.mcpServer.isServerStarted() ? 'running' : 'stopped'}.`
      );
    } catch (error) {
      this.updateStatusBar('Error');
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to restart MCP server: ${errorMessage}`);
      console.error('[ExtensionCommands] Restart server error:', error);
    }
  }

  /**
   * Command handler to show the status webview panel.
   */
  private async showStatus(): Promise<void> {
    const problems = this.diagnosticsWatcher.getAllProblems();
    const summary = this.generateStatusSummary(problems);

    const panel = vscode.window.createWebviewPanel(
      'mcpDiagnosticsStatus',
      'MCP Diagnostics Status',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.generateStatusHtml(summary);
  }

  /**
   * Command handler to show the MCP setup guide.
   */
  private async showSetupGuide(): Promise<void> {
    this.mcpRegistration.showMcpSetupGuide();
  }

  /**
   * Command handler to configure the MCP server automatically.
   * Deploys the server and injects configuration for seamless setup.
   */
  private async configureServer(): Promise<void> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Configuring MCP Server...',
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: 'Deploying server...' });
          await this.mcpRegistration.deployBundledServer();

          progress.report({ message: 'Injecting configuration...' });
          await this.mcpRegistration.injectConfiguration();

          vscode.window.showInformationMessage('MCP Diagnostics server configured successfully!');
        } catch (error) {
          console.error('[ExtensionCommands] Configure server error:', error);
          const action = await vscode.window.showErrorMessage(
            'Failed to configure server automatically.',
            'View Manual Setup'
          );

          if (action === 'View Manual Setup') {
            this.mcpRegistration.showMcpSetupGuide();
          }
        }
      }
    );
  }

  /**
   * Updates the status bar with current problem counts or status message.
   */
  private updateStatusBar(status?: string): void {
    const problems = this.diagnosticsWatcher.getAllProblems();
    const errorCount = problems.filter((p) => p.severity === 'Error').length;
    const warningCount = problems.filter((p) => p.severity === 'Warning').length;

    if (status) {
      this.statusBarItem.text = `$(sync~spin) MCP: ${status}`;
      this.statusBarItem.backgroundColor = undefined;
    } else {
      // Use different icons and colors based on error count
      if (errorCount > 0) {
        this.statusBarItem.text = `$(error) MCP: ${errorCount}E ${warningCount}W`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      } else if (warningCount > 0) {
        this.statusBarItem.text = `$(warning) MCP: ${errorCount}E ${warningCount}W`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
      } else {
        this.statusBarItem.text = `$(check) MCP: ${errorCount}E ${warningCount}W`;
        this.statusBarItem.backgroundColor = undefined;
      }
    }

    this.statusBarItem.tooltip = `MCP Diagnostics Server Status\nErrors: ${errorCount}, Warnings: ${warningCount}\nClick to show details`;
    this.statusBarItem.command = 'mcpDiagnostics.showStatus';
  }

  /**
   * Generates a summary object with problem statistics.
   */
  private generateStatusSummary(problems: ProblemItem[]): StatusSummary {
    return {
      totalProblems: problems.length,
      byFile: this.groupBy(problems, 'filePath'),
      bySeverity: this.groupBy(problems, 'severity'),
      byWorkspace: this.groupBy(problems, 'workspaceFolder'),
      serverStatus: this.mcpServer.isServerStarted() ? 'Running' : 'Stopped',
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * Generates HTML content for the status webview panel.
   */
  private generateStatusHtml(summary: StatusSummary): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MCP Diagnostics Status</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          .metric {
            margin: 15px 0;
            padding: 15px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
          }
          .metric h3 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
          }
          .error { color: var(--vscode-errorForeground); }
          .warning { color: var(--vscode-warningForeground); }
          .info { color: var(--vscode-infoForeground); }
          .success { color: var(--vscode-testing-iconPassed); }
          ul { margin: 10px 0; padding-left: 20px; }
          li { margin: 5px 0; }
          .status-running { color: var(--vscode-testing-iconPassed); }
          .status-stopped { color: var(--vscode-errorForeground); }
        </style>
      </head>
      <body>
        <h1>🔧 MCP Diagnostics Server Status</h1>

        <div class="metric">
          <h3>Server Status</h3>
          <span class="${summary.serverStatus === 'Running' ? 'status-running' : 'status-stopped'}">
            ${summary.serverStatus === 'Running' ? '✅' : '❌'} ${summary.serverStatus}
          </span>
        </div>

        <div class="metric">
          <h3>Problem Summary</h3>
          <p><strong>Total Problems:</strong> ${summary.totalProblems}</p>
        </div>

        <div class="metric">
          <h3>Problems by Severity</h3>
          <ul>
                         <li class="error">🔴 Errors: ${summary.bySeverity['Error'] || 0}</li>
             <li class="warning">🟡 Warnings: ${summary.bySeverity['Warning'] || 0}</li>
             <li class="info">🔵 Information: ${summary.bySeverity['Information'] || 0}</li>
             <li>💡 Hints: ${summary.bySeverity['Hint'] || 0}</li>
          </ul>
        </div>

        <div class="metric">
          <h3>Files with Problems</h3>
          <p><strong>Affected Files:</strong> ${Object.keys(summary.byFile).length}</p>
          ${
            Object.keys(summary.byFile).length > 0
              ? `
            <details>
              <summary>View file breakdown</summary>
              <ul>
                ${Object.entries(summary.byFile)
                  .map(
                    ([file, count]) =>
                      `<li>${file.split('/').pop()}: ${count} problem${count === 1 ? '' : 's'}</li>`
                  )
                  .join('')}
              </ul>
            </details>
          `
              : '<p>No files with problems detected.</p>'
          }
        </div>

        <div class="metric">
          <h3>Workspace Information</h3>
          <p><strong>Workspaces:</strong> ${Object.keys(summary.byWorkspace).length}</p>
          ${
            Object.keys(summary.byWorkspace).length > 0
              ? `
            <ul>
              ${Object.entries(summary.byWorkspace)
                .map(
                  ([workspace, count]) =>
                    `<li>${workspace}: ${count} problem${count === 1 ? '' : 's'}</li>`
                )
                .join('')}
            </ul>
          `
              : '<p>No workspace problems detected.</p>'
          }
        </div>

        <div class="metric">
          <h3>Last Update</h3>
          <p>${new Date(summary.lastUpdate).toLocaleString()}</p>
        </div>

        <div class="metric">
          <h3>Actions</h3>
          <p>Use the Command Palette (Ctrl+Shift+P) to access:</p>
          <ul>
            <li><code>MCP Diagnostics: Restart Server</code> - Restart the MCP server</li>
            <li><code>MCP Diagnostics: Show Status</code> - Show this status panel</li>
          </ul>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Utility function to group array items by a specified key.
   */
  private groupBy(items: ProblemItem[], key: keyof ProblemItem): Record<string, number> {
    return items.reduce((acc: Record<string, number>, item) => {
      const groupKey = String(item[key]);
      acc[groupKey] = (acc[groupKey] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Updates the status bar when problems change.
   * This should be called by the extension when diagnostic events occur.
   */
  public onProblemsChanged(): void {
    this.updateStatusBar();
  }

  /**
   * Disposes of the status bar item and cleans up resources.
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
