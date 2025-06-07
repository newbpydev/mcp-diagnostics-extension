import { McpNotifications } from '../../../../infrastructure/mcp/McpNotifications';
import { DiagnosticsChangeEvent, ProblemItem } from '@shared/types';

describe('McpNotifications', () => {
  let mcpNotifications: McpNotifications;
  let mockServer: any;

  const mockProblemItem: ProblemItem = {
    filePath: '/workspace/src/test.ts',
    workspaceFolder: 'my-project',
    range: {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 10 },
    },
    severity: 'Error',
    message: 'Test error',
    source: 'typescript',
  };

  const mockChangeEvent: DiagnosticsChangeEvent = {
    uri: '/workspace/src/test.ts',
    problems: [mockProblemItem],
  };

  beforeEach(() => {
    mockServer = {
      setNotificationHandler: jest.fn(),
      sendNotification: jest.fn(),
    };

    mcpNotifications = new McpNotifications(mockServer);
  });

  describe('Constructor', () => {
    it('should create McpNotifications instance with server', () => {
      expect(mcpNotifications).toBeDefined();
      expect(mcpNotifications).toBeInstanceOf(McpNotifications);
    });
  });

  describe('Notification Setup', () => {
    it('should register notification handlers', () => {
      mcpNotifications.setupNotifications();

      expect(mockServer.setNotificationHandler).toHaveBeenCalledWith(
        'notifications/subscribe',
        expect.any(Function)
      );
      expect(mockServer.setNotificationHandler).toHaveBeenCalledWith(
        'notifications/unsubscribe',
        expect.any(Function)
      );
    });
  });

  describe('Client Subscription Management', () => {
    beforeEach(() => {
      mcpNotifications.setupNotifications();
    });

    it('should handle client subscription to problemsChanged', () => {
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )?.[1];

      const notification = {
        params: { method: 'problemsChanged' },
        clientId: 'test-client-1',
      };

      subscribeHandler(notification);

      // Verify client is subscribed by checking notification is sent
      mcpNotifications.sendProblemsChangedNotification(mockChangeEvent);
      expect(mockServer.sendNotification).toHaveBeenCalled();
    });

    it('should handle client subscription without clientId', () => {
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )?.[1];

      const notification = {
        params: { method: 'problemsChanged' },
      };

      subscribeHandler(notification);

      // Should use 'default' as clientId
      mcpNotifications.sendProblemsChangedNotification(mockChangeEvent);
      expect(mockServer.sendNotification).toHaveBeenCalled();
    });

    it('should ignore subscription to unknown methods', () => {
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )?.[1];

      const notification = {
        params: { method: 'unknownMethod' },
        clientId: 'test-client-1',
      };

      subscribeHandler(notification);

      // Should not send notification for unknown method
      mcpNotifications.sendProblemsChangedNotification(mockChangeEvent);
      expect(mockServer.sendNotification).not.toHaveBeenCalled();
    });

    it('should handle client unsubscription', () => {
      // First subscribe
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )?.[1];

      subscribeHandler({
        params: { method: 'problemsChanged' },
        clientId: 'test-client-1',
      });

      // Then unsubscribe
      const unsubscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/unsubscribe'
      )?.[1];

      unsubscribeHandler({
        params: { method: 'problemsChanged' },
        clientId: 'test-client-1',
      });

      // Should not send notification after unsubscription
      mcpNotifications.sendProblemsChangedNotification(mockChangeEvent);
      expect(mockServer.sendNotification).not.toHaveBeenCalled();
    });

    it('should handle multiple client subscriptions', () => {
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )?.[1];

      // Subscribe multiple clients
      subscribeHandler({
        params: { method: 'problemsChanged' },
        clientId: 'client-1',
      });
      subscribeHandler({
        params: { method: 'problemsChanged' },
        clientId: 'client-2',
      });

      mcpNotifications.sendProblemsChangedNotification(mockChangeEvent);

      // Should send notification to all subscribed clients
      expect(mockServer.sendNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('Problems Changed Notifications', () => {
    beforeEach(() => {
      mcpNotifications.setupNotifications();

      // Subscribe a test client
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )?.[1];

      subscribeHandler({
        params: { method: 'problemsChanged' },
        clientId: 'test-client',
      });
    });

    it('should send properly formatted notification', () => {
      mcpNotifications.sendProblemsChangedNotification(mockChangeEvent);

      expect(mockServer.sendNotification).toHaveBeenCalledWith({
        method: 'notifications/message',
        params: {
          level: 'info',
          logger: 'vscode-diagnostics',
          data: {
            type: 'problemsChanged',
            uri: mockChangeEvent.uri,
            problemCount: mockChangeEvent.problems.length,
            problems: mockChangeEvent.problems,
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          },
        },
      });
    });

    it('should include correct problem count', () => {
      const eventWithMultipleProblems: DiagnosticsChangeEvent = {
        uri: '/workspace/src/test.ts',
        problems: [mockProblemItem, mockProblemItem],
      };

      mcpNotifications.sendProblemsChangedNotification(eventWithMultipleProblems);

      const sentNotification = mockServer.sendNotification.mock.calls[0][0];
      expect(sentNotification.params.data.problemCount).toBe(2);
    });

    it('should include timestamp in notification', () => {
      const beforeTime = new Date();
      mcpNotifications.sendProblemsChangedNotification(mockChangeEvent);
      const afterTime = new Date();

      const sentNotification = mockServer.sendNotification.mock.calls[0][0];
      const timestamp = new Date(sentNotification.params.data.timestamp);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should handle empty problems list', () => {
      const eventWithNoProblems: DiagnosticsChangeEvent = {
        uri: '/workspace/src/test.ts',
        problems: [],
      };

      mcpNotifications.sendProblemsChangedNotification(eventWithNoProblems);

      const sentNotification = mockServer.sendNotification.mock.calls[0][0];
      expect(sentNotification.params.data.problemCount).toBe(0);
      expect(sentNotification.params.data.problems).toEqual([]);
    });

    it('should not send notification when no clients subscribed', () => {
      // Create new instance without subscriptions
      const newNotifications = new McpNotifications(mockServer);
      newNotifications.setupNotifications();

      newNotifications.sendProblemsChangedNotification(mockChangeEvent);

      expect(mockServer.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle notification sending errors gracefully', () => {
      const notifications = new McpNotifications(mockServer);
      notifications.setupNotifications();

      // Subscribe some clients
      const subscribeNotification = { params: { method: 'problemsChanged' }, clientId: 'client1' };
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )?.[1];
      subscribeHandler(subscribeNotification);

      // Add another client
      const subscribeNotification2 = { params: { method: 'problemsChanged' }, clientId: 'client2' };
      subscribeHandler(subscribeNotification2);

      expect(notifications.getSubscribedClientCount()).toBe(2);

      // Mock sendNotification to throw an error for the first call but succeed for the second
      let callCount = 0;
      mockServer.sendNotification.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network error sending to client1');
        }
        // Second call succeeds
      });

      // Mock console.error to capture error logs
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockEvent: DiagnosticsChangeEvent = {
        uri: '/test/file.ts',
        problems: [mockProblemItem],
      };

      // This should trigger the error handling in the forEach loop (lines 104-111)
      notifications.sendProblemsChangedNotification(mockEvent);

      // Verify error was logged for the failed client
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send notification to client'),
        expect.any(Error)
      );

      // Verify sendNotification was called twice (once for each client)
      expect(mockServer.sendNotification).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it('should continue sending to other clients when one fails', () => {
      const notifications = new McpNotifications(mockServer);
      notifications.setupNotifications();

      // Subscribe multiple clients
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )?.[1];

      ['client1', 'client2', 'client3'].forEach((clientId) => {
        subscribeHandler({ params: { method: 'problemsChanged' }, clientId });
      });

      expect(notifications.getSubscribedClientCount()).toBe(3);

      // Mock sendNotification to fail for client2 but succeed for others
      let callCount = 0;
      mockServer.sendNotification.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Failed to send to client2');
        }
        // Other calls succeed
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockEvent: DiagnosticsChangeEvent = {
        uri: '/test/file.ts',
        problems: [mockProblemItem],
      };

      notifications.sendProblemsChangedNotification(mockEvent);

      // Should have attempted to send to all 3 clients
      expect(mockServer.sendNotification).toHaveBeenCalledTimes(3);

      // Should have logged error for the failed client
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send notification to client'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle errors when no client ID is provided', () => {
      const notifications = new McpNotifications(mockServer);
      notifications.setupNotifications();

      // Subscribe a client without clientId (should use 'default')
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )?.[1];
      subscribeHandler({ params: { method: 'problemsChanged' } }); // No clientId

      expect(notifications.getSubscribedClientCount()).toBe(1);

      // Mock sendNotification to throw an error
      mockServer.sendNotification.mockImplementation(() => {
        throw new Error('Network error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockEvent: DiagnosticsChangeEvent = {
        uri: '/test/file.ts',
        problems: [mockProblemItem],
      };

      notifications.sendProblemsChangedNotification(mockEvent);

      // Should log error with 'default' client ID
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send notification to client'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Subscription State Management', () => {
    beforeEach(() => {
      mcpNotifications.setupNotifications();
    });

    it('should handle duplicate subscriptions from same client', () => {
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )?.[1];

      // Subscribe same client twice
      subscribeHandler({
        params: { method: 'problemsChanged' },
        clientId: 'test-client',
      });
      subscribeHandler({
        params: { method: 'problemsChanged' },
        clientId: 'test-client',
      });

      mcpNotifications.sendProblemsChangedNotification(mockChangeEvent);

      // Should only send one notification (Set prevents duplicates)
      expect(mockServer.sendNotification).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscription of non-existent client', () => {
      const unsubscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/unsubscribe'
      )?.[1];

      expect(() => {
        unsubscribeHandler({
          params: { method: 'problemsChanged' },
          clientId: 'non-existent-client',
        });
      }).not.toThrow();
    });
  });
});
