import { McpNotifications } from '@infrastructure/mcp/McpNotifications';
import { DiagnosticsChangeEvent, ProblemItem } from '@shared/types';

describe('McpNotifications', () => {
  let mcpNotifications: McpNotifications;
  let mockServer: any;

  const mockChangeEvent: DiagnosticsChangeEvent = {
    uri: '/workspace/src/test.ts',
    problems: [
      {
        filePath: '/workspace/src/test.ts',
        workspaceFolder: 'my-project',
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        severity: 'Error',
        message: 'Test error',
        source: 'typescript',
      },
    ],
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
      )[1];

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
      )[1];

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
      )[1];

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
      )[1];

      subscribeHandler({
        params: { method: 'problemsChanged' },
        clientId: 'test-client-1',
      });

      // Then unsubscribe
      const unsubscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/unsubscribe'
      )[1];

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
      )[1];

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
      )[1];

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
        problems: [mockChangeEvent.problems[0], mockChangeEvent.problems[0]] as ProblemItem[],
      };

      mcpNotifications.sendProblemsChangedNotification(eventWithMultipleProblems);

      const sentNotification = mockServer.sendNotification.mock.calls[0][0];
      expect(sentNotification.params.data.problemCount).toBe(2);
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
    beforeEach(() => {
      mcpNotifications.setupNotifications();

      // Subscribe a test client
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )[1];

      subscribeHandler({
        params: { method: 'problemsChanged' },
        clientId: 'test-client',
      });
    });

    it('should handle server notification errors gracefully', () => {
      mockServer.sendNotification.mockImplementation(() => {
        throw new Error('Server error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        mcpNotifications.sendProblemsChangedNotification(mockChangeEvent);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send notification to client test-client:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should continue sending to other clients if one fails', () => {
      // Subscribe multiple clients
      const subscribeHandler = mockServer.setNotificationHandler.mock.calls.find(
        (call: any[]) => call[0] === 'notifications/subscribe'
      )[1];

      subscribeHandler({
        params: { method: 'problemsChanged' },
        clientId: 'client-2',
      });

      // Make first call fail, second succeed
      mockServer.sendNotification
        .mockImplementationOnce(() => {
          throw new Error('First client error');
        })
        .mockImplementationOnce(() => {
          // Second client succeeds
        });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mcpNotifications.sendProblemsChangedNotification(mockChangeEvent);

      expect(mockServer.sendNotification).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledTimes(1);

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
      )[1];

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
      )[1];

      expect(() => {
        unsubscribeHandler({
          params: { method: 'problemsChanged' },
          clientId: 'non-existent-client',
        });
      }).not.toThrow();
    });
  });
});
