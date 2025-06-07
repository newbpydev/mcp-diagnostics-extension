import { DiagnosticsChangeEvent, ProblemItem } from '@shared/types';

/**
 * Interface for MCP notification structure
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
  sendNotification: (notification: McpNotification) => void;
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
}
