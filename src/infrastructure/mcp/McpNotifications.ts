import {
  DiagnosticsChangeEvent,
  ProblemItem,
  OutputChannelItem,
  DebugOutputItem,
  TerminalOutputItem,
  TaskProcessEndItem,
} from '@shared/types';

/**
 * Interface for MCP notification structure (diagnostics)
 */
interface McpNotification {
  method: string;
  params: {
    level: string;
    logger: string;
    data: {
      type: string;
      uri: string;
      problemCount: number;
      problems: ProblemItem[];
      timestamp: string;
    };
  };
}

/**
 * Interface for generic IDE context notifications
 */
interface IdeContextNotification {
  method: string;
  params: {
    level: string;
    logger: string;
    data: {
      type: string;
      timestamp: string;
      [key: string]: unknown;
    };
  };
}

/**
 * Interface for subscription notification from clients
 */
interface SubscriptionNotification {
  params: { method: string };
  clientId?: string;
}

/**
 * Interface for MCP server that can handle notifications
 */
interface McpServer {
  setNotificationHandler: (
    method: string,
    handler: (notification: SubscriptionNotification) => void
  ) => void;
  sendNotification: (notification: McpNotification | IdeContextNotification) => void;
}

/**
 * McpNotifications handles real-time diagnostic updates via Model Context Protocol
 *
 * This class manages client subscriptions and sends real-time notifications when
 * diagnostic problems change. It provides a pub-sub mechanism where MCP clients
 * can subscribe to specific notification types and receive updates automatically.
 *
 * Supported notification types:
 * - problemsChanged: Sent when diagnostic problems are added, updated, or removed
 *
 * @example
 * ```typescript
 * const notifications = new McpNotifications(mcpServer);
 * notifications.setupNotifications();
 *
 * // When diagnostics change, notify subscribers
 * notifications.sendProblemsChangedNotification({
 *   uri: '/path/to/file.ts',
 *   problems: [...],
 *   timestamp: new Date().toISOString()
 * });
 * ```
 */
export class McpNotifications {
  private subscribedClients: Set<string> = new Set();

  /**
   * Creates a new McpNotifications instance
   * @param server - The MCP server to handle notifications through
   */
  constructor(private server: McpServer) {}

  /**
   * Sets up notification handlers for client subscription management
   *
   * Registers handlers for:
   * - notifications/subscribe: Allows clients to subscribe to specific notification types
   * - notifications/unsubscribe: Allows clients to unsubscribe from notification types
   *
   * Currently supports the 'problemsChanged' notification method.
   */
  public setupNotifications(): void {
    this.server.setNotificationHandler(
      'notifications/subscribe',
      (notification: SubscriptionNotification) => {
        const { method } = notification.params;
        if (method === 'problemsChanged') {
          const clientId = notification.clientId || 'default';
          this.subscribedClients.add(clientId);
        }
      }
    );

    this.server.setNotificationHandler(
      'notifications/unsubscribe',
      (notification: SubscriptionNotification) => {
        const { method } = notification.params;
        if (method === 'problemsChanged') {
          const clientId = notification.clientId || 'default';
          this.subscribedClients.delete(clientId);
        }
      }
    );
  }

  /**
   * Sends a problemsChanged notification to all subscribed clients
   *
   * This method is typically called when the DiagnosticsWatcher detects changes
   * in the VS Code Problems panel. It broadcasts the change to all clients that
   * have subscribed to 'problemsChanged' notifications.
   *
   * @param event - The diagnostics change event containing updated problem data
   *
   * @example
   * ```typescript
   * notifications.sendProblemsChangedNotification({
   *   uri: '/workspace/src/main.ts',
   *   problems: [
   *     {
   *       filePath: '/workspace/src/main.ts',
   *       severity: 'Error',
   *       message: 'Type error',
   *       // ... other ProblemItem fields
   *     }
   *   ],
   *   timestamp: '2025-01-15T10:30:00.000Z'
   * });
   * ```
   */
  public sendProblemsChangedNotification(event: DiagnosticsChangeEvent): void {
    if (this.subscribedClients.size === 0) {
      return;
    }

    const notification = {
      method: 'notifications/message',
      params: {
        level: 'info',
        logger: 'vscode-diagnostics',
        data: {
          type: 'problemsChanged',
          uri: event.uri,
          problemCount: event.problems.length,
          problems: event.problems,
          timestamp: new Date().toISOString(),
        },
      },
    };

    this.subscribedClients.forEach((clientId) => {
      try {
        this.server.sendNotification(notification);
      } catch (error) {
        console.error(`Failed to send notification to client ${clientId}:`, error);
      }
    });
  }

  /**
   * Gets the number of currently subscribed clients
   *
   * @returns Number of clients subscribed to notifications
   */
  public getSubscribedClientCount(): number {
    return this.subscribedClients.size;
  }

  /**
   * Clears all client subscriptions
   *
   * This method is typically called during extension deactivation or server restart
   * to clean up client subscription state.
   */
  public clearSubscriptions(): void {
    this.subscribedClients.clear();
  }

  // ===== NEW IDE CONTEXT NOTIFICATION HELPERS =====

  /**
   * Generic helper for sending IDE context notifications with consistent structure
   * @private
   * @param method - The notification method name
   * @param payload - The notification payload (IDE context item)
   */
  private sendGeneric<
    T extends OutputChannelItem | DebugOutputItem | TerminalOutputItem | TaskProcessEndItem,
  >(method: string, payload: T): void {
    if (this.subscribedClients.size === 0) {
      return;
    }

    const notificationType = method.split('/')[1] || 'unknown'; // Extract type from method

    const notification: IdeContextNotification = {
      method: 'notifications/message',
      params: {
        level: 'info',
        logger: 'vscode-diagnostics',
        data: {
          type: notificationType,
          ...payload,
          timestamp: new Date(payload.timestamp).toISOString(),
        },
      },
    };

    this.subscribedClients.forEach((clientId) => {
      try {
        this.server.sendNotification(notification);
      } catch (error) {
        console.error(`Failed to send ${method} notification to client ${clientId}:`, error);
      }
    });
  }

  /**
   * Sends an Output Channel change notification to all subscribed clients
   *
   * This method is called when VS Code Output Channels receive new content.
   * It broadcasts the change to all clients that have subscribed to IDE notifications.
   *
   * @param item - The output channel item containing channel name and content
   *
   * @example
   * ```typescript
   * notifications.sendOutputChannelChanged({
   *   channelName: 'TypeScript',
   *   line: 'Compiling src/main.ts...',
   *   timestamp: Date.now()
   * });
   * ```
   */
  public sendOutputChannelChanged(item: OutputChannelItem): void {
    this.sendGeneric('ide/outputChannelDidChange', item);
  }

  /**
   * Sends a Debug Console change notification to all subscribed clients
   *
   * This method is called when Debug Console receives output from debug sessions.
   * It broadcasts DAP (Debug Adapter Protocol) output events to subscribed clients.
   *
   * @param item - The debug output item containing session and output information
   *
   * @example
   * ```typescript
   * notifications.sendDebugConsoleChanged({
   *   sessionId: 'debug-session-1',
   *   category: 'stdout',
   *   output: 'Application started successfully\n',
   *   timestamp: Date.now()
   * });
   * ```
   */
  public sendDebugConsoleChanged(item: DebugOutputItem): void {
    this.sendGeneric('ide/debugConsoleDidChange', item);
  }

  /**
   * Sends a Terminal data notification to all subscribed clients
   *
   * This method is called when Integrated Terminal receives input or output.
   * It broadcasts terminal activity to help AI agents monitor build processes,
   * script execution, and command-line interactions.
   *
   * @param item - The terminal output item containing terminal name and data
   *
   * @example
   * ```typescript
   * notifications.sendTerminalData({
   *   terminalName: 'MCP Watched Terminal',
   *   data: 'npm run build\n',
   *   timestamp: Date.now()
   * });
   * ```
   */
  public sendTerminalData(item: TerminalOutputItem): void {
    this.sendGeneric('ide/terminalDidChange', item);
  }

  /**
   * Sends a Task process end notification to all subscribed clients
   *
   * This method is called when VS Code Tasks complete execution.
   * It broadcasts task completion events with exit codes to help AI agents
   * understand build success/failure and automation workflows.
   *
   * @param item - The task process end item containing task name and exit code
   *
   * @example
   * ```typescript
   * notifications.sendTaskProcessEnded({
   *   taskName: 'npm: build',
   *   exitCode: 0,
   *   timestamp: Date.now()
   * });
   * ```
   */
  public sendTaskProcessEnded(item: TaskProcessEndItem): void {
    this.sendGeneric('ide/taskDidEnd', item);
  }
}
