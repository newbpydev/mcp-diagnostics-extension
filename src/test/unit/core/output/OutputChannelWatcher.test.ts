import * as vscode from 'vscode';
import { OutputChannelWatcher } from '@core/output/OutputChannelWatcher';

// Mock VS Code module
jest.mock(
  'vscode',
  () => ({
    window: {
      createOutputChannel: jest.fn(() => ({
        appendLine: jest.fn(),
        show: jest.fn(),
        dispose: jest.fn(),
        clear: jest.fn(),
        append: jest.fn(),
        replace: jest.fn(),
        hide: jest.fn(),
        name: 'TestChannel',
      })),
    },
  }),
  { virtual: true }
);

describe('OutputChannelWatcher', () => {
  let mockVscode: typeof vscode;
  let watcher: OutputChannelWatcher;
  let mockCreateOutputChannel: jest.Mock;

  beforeEach(() => {
    mockVscode = vscode;
    mockCreateOutputChannel = mockVscode.window.createOutputChannel as jest.Mock;
    mockCreateOutputChannel.mockClear();

    watcher = new OutputChannelWatcher(mockVscode);
  });

  afterEach(() => {
    if (watcher) {
      watcher.dispose();
    }
    jest.clearAllMocks();
  });

  describe('createChannel', () => {
    it('should emit an "onData" event when appendLine is called on a watched channel', () => {
      // Setup event listener spy
      const onDataSpy = jest.fn();
      watcher.on('onData', onDataSpy);

      // Create a watched channel through the watcher
      const watchedChannel = watcher.createChannel('MyTestChannel');

      // Verify the original createOutputChannel was called
      expect(mockCreateOutputChannel).toHaveBeenCalledWith('MyTestChannel');

      // Call appendLine on the proxied channel
      const testLine = 'Hello, world!';
      watchedChannel.appendLine(testLine);

      // Verify the onData event was emitted with correct OutputChannelItem
      expect(onDataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          channelName: 'MyTestChannel',
          line: testLine,
          timestamp: expect.any(Number),
        })
      );

      // Verify the original appendLine method was also called on the underlying channel
      const mockChannel = mockCreateOutputChannel.mock.results[0]?.value;
      expect(mockChannel?.appendLine).toHaveBeenCalledWith(testLine);
    });

    it('should return a channel that preserves all original OutputChannel methods', () => {
      const watchedChannel = watcher.createChannel('TestChannel');

      // Verify all expected OutputChannel methods exist on the proxied channel
      expect(typeof watchedChannel.appendLine).toBe('function');
      expect(typeof watchedChannel.append).toBe('function');
      expect(typeof watchedChannel.clear).toBe('function');
      expect(typeof watchedChannel.show).toBe('function');
      expect(typeof watchedChannel.hide).toBe('function');
      expect(typeof watchedChannel.dispose).toBe('function');
      expect(typeof watchedChannel.replace).toBe('function');
      expect(watchedChannel.name).toBe('TestChannel');
    });

    it('should call original methods for non-appendLine calls', () => {
      const watchedChannel = watcher.createChannel('TestChannel');
      const mockChannel = mockCreateOutputChannel.mock.results[0]?.value;

      // Test that other methods are passed through unchanged
      watchedChannel.show();
      watchedChannel.clear();
      watchedChannel.hide();

      expect(mockChannel?.show).toHaveBeenCalled();
      expect(mockChannel?.clear).toHaveBeenCalled();
      expect(mockChannel?.hide).toHaveBeenCalled();
    });

    it('should handle multiple channels independently', () => {
      const onDataSpy = jest.fn();
      watcher.on('onData', onDataSpy);

      const channel1 = watcher.createChannel('Channel1');
      const channel2 = watcher.createChannel('Channel2');

      channel1.appendLine('Message from channel 1');
      channel2.appendLine('Message from channel 2');

      expect(onDataSpy).toHaveBeenCalledTimes(2);
      expect(onDataSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          channelName: 'Channel1',
          line: 'Message from channel 1',
        })
      );
      expect(onDataSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          channelName: 'Channel2',
          line: 'Message from channel 2',
        })
      );
    });

    it('should handle empty strings and special characters', () => {
      const onDataSpy = jest.fn();
      watcher.on('onData', onDataSpy);

      const channel = watcher.createChannel('SpecialChannel');

      const specialLine = 'Line with émojis 🚀 and special chars: []{}"\\n\\t';
      channel.appendLine(specialLine);

      expect(onDataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          channelName: 'SpecialChannel',
          line: specialLine,
        })
      );
    });
  });

  describe('dispose', () => {
    it('should clean up event listeners when disposed', () => {
      const onDataSpy = jest.fn();
      watcher.on('onData', onDataSpy);

      // Create and use a channel
      const channel = watcher.createChannel('TestChannel');
      channel.appendLine('Before dispose');
      expect(onDataSpy).toHaveBeenCalledTimes(1);

      // Dispose the watcher
      watcher.dispose();

      // Verify events are no longer emitted after disposal
      channel.appendLine('After dispose');
      expect(onDataSpy).toHaveBeenCalledTimes(1); // Should not increase
    });
  });

  describe('error handling', () => {
    it('should handle errors in event emission gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Add a listener that throws an error
      watcher.on('onData', () => {
        throw new Error('Listener error');
      });

      const channel = watcher.createChannel('ErrorChannel');

      // This should not throw, even though the listener throws
      expect(() => {
        channel.appendLine('Test message');
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
