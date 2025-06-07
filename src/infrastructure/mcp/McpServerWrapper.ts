import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { McpTools } from './McpTools';
import { McpResources } from './McpResources';
import { McpNotifications } from './McpNotifications';
import { DiagnosticsChangeEvent } from '@shared/types';
import { MCP_SERVER_INFO, EVENT_NAMES } from '@shared/constants';

export interface McpServerConfig {
  port?: number;
  enableDebugLogging?: boolean;
}

export interface ServerInfo {
  name: string;
  version: string;
  capabilities: unknown;
}

/**
 * Wrapper for MCP Server that integrates diagnostics monitoring with MCP protocol
 */
export class McpServerWrapper {
  private server: Server;
  private transport: StdioServerTransport;
  private diagnosticsWatcher: DiagnosticsWatcher;
  private tools: McpTools;
  private resources: McpResources;
  private notifications: McpNotifications;
  private isStarted = false;
  private config: McpServerConfig;

  constructor(watcher: DiagnosticsWatcher, config: McpServerConfig = {}) {
    this.diagnosticsWatcher = watcher;
    this.config = config;

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

    // Initialize MCP components
    this.tools = new McpTools(this.diagnosticsWatcher);
    this.resources = new McpResources(this.diagnosticsWatcher);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.notifications = new McpNotifications(this.server as any);

    this.setupEventListeners();
  }

  /**
   * Starts the MCP server and establishes transport connection
   */
  public async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('MCP Server is already started');
    }

    try {
      // Register handlers before connecting
      this.registerHandlers();

      await this.server.connect(this.transport);
      this.isStarted = true;

      if (this.config.enableDebugLogging) {
        console.log(
          `MCP Server started: ${MCP_SERVER_INFO.name} on port ${this.config.port || 'stdio'}`
        );
      } else {
        console.log(`MCP Server started: ${MCP_SERVER_INFO.name}`);
      }
    } catch (error) {
      throw new Error(`Failed to start MCP server: ${error}`);
    }
  }

  /**
   * Stops the MCP server and cleans up resources
   */
  public dispose(): void {
    if (this.isStarted) {
      try {
        void this.server.close();
        this.isStarted = false;

        if (this.config.enableDebugLogging) {
          console.log('MCP Server stopped');
        }
      } catch (error) {
        console.error('Error stopping MCP server:', error);
      }
    }
  }

  /**
   * Returns whether the server is currently started
   */
  public isServerStarted(): boolean {
    return this.isStarted;
  }

  /**
   * Returns server information
   */
  public getServerInfo(): ServerInfo {
    return {
      name: MCP_SERVER_INFO.name,
      version: MCP_SERVER_INFO.version,
      capabilities: MCP_SERVER_INFO.capabilities,
    };
  }

  /**
   * Returns the current configuration
   */
  public getConfig(): McpServerConfig {
    return { ...this.config };
  }

  /**
   * Sets up event listeners for diagnostics changes
   */
  private setupEventListeners(): void {
    this.diagnosticsWatcher.on(EVENT_NAMES.PROBLEMS_CHANGED, this.handleProblemsChanged.bind(this));
  }

  /**
   * Registers all MCP handlers (tools, resources, notifications)
   */
  private registerHandlers(): void {
    try {
      // Register tools handlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.tools.registerTools(this.server as any);

      // Register resources handlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.resources.registerResources(this.server as any);

      // Register notification handlers
      this.notifications.setupNotifications();

      if (this.config.enableDebugLogging) {
        console.log('MCP handlers registered successfully');
      }
    } catch (error) {
      console.error('Failed to register MCP handlers:', error);
      throw error;
    }
  }

  /**
   * Handles problems changed events from the diagnostics watcher
   */
  private handleProblemsChanged(event: DiagnosticsChangeEvent): void {
    try {
      if (this.config.enableDebugLogging) {
        console.log('Problems changed event received:', {
          uri: event.uri,
          problemCount: event.problems.length,
        });
      }

      this.notifications.sendProblemsChangedNotification(event);
    } catch (error) {
      console.error('Failed to handle problems changed event:', error);
    }
  }

  /**
   * Gets the underlying MCP server instance (for testing)
   */
  public getServer(): Server {
    return this.server;
  }

  /**
   * Gets the tools instance (for testing)
   */
  public getTools(): McpTools {
    return this.tools;
  }

  /**
   * Gets the resources instance (for testing)
   */
  public getResources(): McpResources {
    return this.resources;
  }

  /**
   * Gets the notifications instance (for testing)
   */
  public getNotifications(): McpNotifications {
    return this.notifications;
  }
}
