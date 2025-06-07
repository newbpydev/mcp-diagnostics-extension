import { DiagnosticsChangeEvent, ProblemItem } from '@shared/types';

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

interface SubscriptionNotification {
  params: { method: string };
  clientId?: string;
}

interface McpServer {
  setNotificationHandler: (
    method: string,
    handler: (notification: SubscriptionNotification) => void
  ) => void;
  sendNotification: (notification: McpNotification) => void;
}

/**
 * Handles MCP notifications for real-time diagnostic updates
 */
export class McpNotifications {
  private subscribedClients: Set<string> = new Set();

  constructor(private server: McpServer) {}

  /**
   * Sets up notification handlers for client subscription management
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
   * @param event The diagnostics change event to broadcast
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
   * @returns Number of subscribed clients
   */
  public getSubscribedClientCount(): number {
    return this.subscribedClients.size;
  }

  /**
   * Clears all client subscriptions
   */
  public clearSubscriptions(): void {
    this.subscribedClients.clear();
  }
}
