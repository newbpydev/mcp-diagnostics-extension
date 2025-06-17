import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { OutputChannelItem } from '@shared/types';

/**
 * OutputChannelWatcher monitors VS Code Output Channels for new content
 *
 * This class creates proxied Output Channels that intercept appendLine calls
 * and emit events containing the channel data. This enables real-time monitoring
 * of output channels for AI agents via the MCP protocol.
 *
 * The implementation uses JavaScript Proxy to elegantly intercept method calls
 * without altering the original vscode.OutputChannel interface, maintaining
 * full compatibility while adding monitoring capabilities.
 *
 * @example
 * ```typescript
 * const watcher = new OutputChannelWatcher(vscode);
 * watcher.on('onData', (item: OutputChannelItem) => {
 *   console.log(`Channel ${item.channelName}: ${item.line}`);
 * });
 *
 * const channel = watcher.createChannel('Build Output');
 * channel.appendLine('Compilation started...'); // Emits onData event
 * ```
 */
export class OutputChannelWatcher extends EventEmitter {
  private vscodeApi: typeof vscode;
  private isDisposed = false;

  /**
   * Creates a new OutputChannelWatcher instance
   *
   * @param api - The VS Code API instance for creating output channels
   */
  constructor(api: typeof vscode) {
    super();
    this.vscodeApi = api;
  }

  /**
   * Creates a new Output Channel and proxies it to intercept writes
   *
   * Returns a proxied vscode.OutputChannel that maintains full compatibility
   * with the original interface while intercepting appendLine calls to
   * emit onData events with OutputChannelItem payloads.
   *
   * @param name - The name of the channel to create
   * @returns A proxied vscode.OutputChannel that emits events on appendLine
   *
   * @example
   * ```typescript
   * const channel = watcher.createChannel('TypeScript');
   * channel.appendLine('Compiling...'); // Emits onData event
   * channel.show(); // Normal OutputChannel behavior
   * ```
   */
  public createChannel(name: string): vscode.OutputChannel {
    const originalChannel = this.vscodeApi.window.createOutputChannel(name);
    const watcher = this;

    return new Proxy(originalChannel, {
      get(target, prop, receiver): unknown {
        const originalValue = Reflect.get(target, prop, receiver);

        // Intercept appendLine method to emit events
        if (prop === 'appendLine' && typeof originalValue === 'function') {
          return function (value: string): void {
            // Only emit events if the watcher hasn't been disposed
            if (!watcher.isDisposed) {
              try {
                const item: OutputChannelItem = {
                  channelName: name,
                  line: value,
                  timestamp: Date.now(),
                };
                watcher.emit('onData', item);
              } catch (error) {
                // Gracefully handle errors in event emission to prevent
                // breaking the output channel functionality
                console.error(`OutputChannelWatcher: Error emitting onData event:`, error);
              }
            }

            // Always call the original appendLine method to maintain normal behavior
            return originalValue.apply(target, [value]);
          };
        }

        // Return all other properties/methods unchanged
        return originalValue;
      },
    });
  }

  /**
   * Disposes the OutputChannelWatcher and cleans up resources
   *
   * After disposal, proxied channels will continue to function normally
   * but will no longer emit onData events. This prevents memory leaks
   * and ensures clean shutdown of the monitoring functionality.
   *
   * @example
   * ```typescript
   * watcher.dispose(); // Stop monitoring, cleanup event listeners
   * ```
   */
  public dispose(): void {
    if (!this.isDisposed) {
      this.isDisposed = true;
      this.removeAllListeners();
    }
  }

  /**
   * Checks if the watcher has been disposed
   *
   * @returns true if the watcher is disposed, false otherwise
   */
  public getIsDisposed(): boolean {
    return this.isDisposed;
  }
}
