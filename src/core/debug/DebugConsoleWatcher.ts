import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import type { DebugOutputItem } from '@shared/types';

/**
 * DebugConsoleWatcher listens for Debug Adapter Protocol "output" events
 * coming from running debug sessions and emits a typed event that can be
 * forwarded to the MCP notification layer.
 *
 * The watcher subscribes via `vscode.debug.onDidReceiveDebugSessionCustomEvent`
 * which exposes **all** custom DAP events.  We filter for the standard
 * `"output"` event, constructing a `DebugOutputItem` containing category,
 * raw output string, and timestamp.
 *
 * Disposal unsubscribes from the VS Code event and clears all listeners to
 * prevent memory leaks.
 */
export class DebugConsoleWatcher extends EventEmitter {
  private readonly vscodeApi: typeof vscode;
  private readonly disposable: vscode.Disposable;

  constructor(api: typeof vscode) {
    super();
    this.vscodeApi = api;

    // Bind handler to preserve `this` context and allow removeListener.
    const bound = this.handleEvent.bind(this);
    this.disposable = this.vscodeApi.debug.onDidReceiveDebugSessionCustomEvent(bound);
  }

  /**
   * Internal VS Code event handler translating DAP "output" events into
   * DebugOutputItem objects for downstream consumption.
   */
  private handleEvent(event: vscode.DebugSessionCustomEvent): void {
    try {
      if (event.event !== 'output') {
        return; // Ignore non-output events
      }

      const body = event.body as { category?: string; output?: string } | undefined;
      if (!body?.output) {
        return; // Nothing to emit
      }

      const item: DebugOutputItem = {
        sessionId: event.session.id,
        category: body.category ?? 'console',
        output: body.output,
        timestamp: Date.now(),
      };

      this.emit('onData', item);
    } catch (error) {
      // Never throw – log and swallow so debug sessions are not impacted.
      console.error('[DebugConsoleWatcher] Error processing debug output event:', error);
    }
  }

  /**
   * Unsubscribes and clears listeners.
   */
  public dispose(): void {
    try {
      this.disposable.dispose();
    } catch {
      // ignore
    }
    this.removeAllListeners();
  }
}
