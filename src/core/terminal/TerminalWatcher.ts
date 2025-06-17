import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import type { TerminalOutputItem } from '@shared/types';

/**
 * TerminalWatcher creates VS Code terminals backed by a `Pseudoterminal` so we
 * can capture user input (via `handleInput`) and stream it to MCP clients.
 */
export class TerminalWatcher extends EventEmitter {
  private readonly vscodeApi: typeof vscode;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(api: typeof vscode) {
    super();
    this.vscodeApi = api;
  }

  /**
   * Creates a new watched terminal and automatically shows it.
   */
  public createTerminal(name: string): vscode.Terminal {
    const watcherEmitter = this;

    class WatchedPty implements vscode.Pseudoterminal {
      private readonly writeEmitter = new vscode.EventEmitter<string>();
      public readonly onDidWrite: vscode.Event<string> = this.writeEmitter.event;

      constructor(private readonly terminalName: string) {}

      private safeFire(text: string): void {
        type FireEmitter = {
          fire?: (text: string) => void;
          emit?: (ev: string, text: string) => void;
        };
        const emitterAny = this.writeEmitter as unknown as FireEmitter;
        if (typeof emitterAny.fire === 'function') {
          emitterAny.fire(text);
        } else if (typeof emitterAny.emit === 'function') {
          emitterAny.emit('data', text);
        }
      }

      open(_initialDimensions: vscode.TerminalDimensions | undefined): void {
        this.safeFire('Watcher active>\r\n');
      }

      close(): void {
        /* noop */
      }

      handleInput(data: string): void {
        this.safeFire(data);

        const item: TerminalOutputItem = {
          terminalName: this.terminalName,
          data,
          timestamp: Date.now(),
        };
        watcherEmitter.emit('onData', item);
      }
    }

    const pty = new WatchedPty(name);
    const terminal = this.vscodeApi.window.createTerminal({ name, pty });

    // Ensure terminal is shown so user can interact immediately
    try {
      terminal.show();
    } catch {
      /* ignore */
    }

    return terminal;
  }

  /* istanbul ignore next -- runtime cleanup */
  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
    this.removeAllListeners();
  }
}
