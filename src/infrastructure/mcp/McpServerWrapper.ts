import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { MCP_SERVER_INFO, EVENT_NAMES } from '@shared/constants';

export interface McpServerConfig {
  port?: number;
  enableDebugLogging?: boolean;
}

export class McpServerWrapper {
  private server: Server;
  private transport: StdioServerTransport;
  private diagnosticsWatcher: DiagnosticsWatcher;
  private isStarted = false;

  constructor(watcher: DiagnosticsWatcher, _config: McpServerConfig = {}) {
    this.diagnosticsWatcher = watcher;

    this.server = new Server(
      {
        name: MCP_SERVER_INFO.name,
        version: MCP_SERVER_INFO.version,
      },
      {
        capabilities: MCP_SERVER_INFO.capabilities,
      }
    );

    this.transport = new StdioServerTransport();
    this.setupEventListeners();
    this.registerHandlers();
  }

  public async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('MCP Server is already started');
    }

    try {
      await this.server.connect(this.transport);
      this.isStarted = true;
      console.log(`MCP Server started: ${MCP_SERVER_INFO.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start MCP server: ${errorMessage}`);
    }
  }

  public dispose(): void {
    if (this.isStarted) {
      void this.server.close();
      this.isStarted = false;
    }
  }

  private setupEventListeners(): void {
    this.diagnosticsWatcher.on(EVENT_NAMES.PROBLEMS_CHANGED, this.handleProblemsChanged.bind(this));
  }

  private registerHandlers(): void {
    // Will be implemented in next tasks
  }

  private handleProblemsChanged(_event: unknown): void {
    // Will be implemented with notifications
    // For now, just ensure it doesn't throw
  }
}
