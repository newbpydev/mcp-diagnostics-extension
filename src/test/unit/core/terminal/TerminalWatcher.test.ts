import * as vscode from 'vscode';
import { TerminalWatcher } from '@core/terminal/TerminalWatcher';

// Capture pty passed to createTerminal
let capturedPty: vscode.Pseudoterminal | undefined;

// Mock VS Code API
jest.mock(
  'vscode',
  () => {
    const events = require('events');
    return {
      window: {
        createTerminal: jest.fn((options: any) => {
          capturedPty = options.pty;
          return {
            name: options.name,
            pty: options.pty,
            show: jest.fn(),
            dispose: jest.fn(),
            sendText: jest.fn(),
          } as unknown as vscode.Terminal;
        }),
      },
      EventEmitter: events.EventEmitter,
    } as unknown as typeof import('vscode');
  },
  { virtual: true }
);

describe('TerminalWatcher', () => {
  let watcher: TerminalWatcher;
  let mockCreateTerminal: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTerminal = vscode.window.createTerminal as unknown as jest.Mock;
    watcher = new TerminalWatcher(vscode as unknown as typeof vscode);
  });

  afterEach(() => {
    watcher.dispose();
    capturedPty = undefined;
  });

  it('should emit "onData" when data is written to its pty', () => {
    const onDataSpy = jest.fn();
    watcher.on('onData', onDataSpy);

    // Create terminal via watcher
    const terminal = watcher.createTerminal('Watched Terminal');
    expect(terminal.name).toBe('Watched Terminal');

    // Ensure createTerminal was invoked
    expect(mockCreateTerminal).toHaveBeenCalled();

    // Simulate pty input
    if (!capturedPty || typeof (capturedPty as any).handleInput !== 'function') {
      throw new Error('Pty not captured or invalid');
    }
    (capturedPty as any).handleInput('hello from pty');

    expect(onDataSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        terminalName: 'Watched Terminal',
        data: 'hello from pty',
        timestamp: expect.any(Number),
      })
    );
  });

  it('should handle open/close lifecycle and dispose gracefully', () => {
    const term = watcher.createTerminal('Lifecycle Terminal');
    expect(term.name).toBe('Lifecycle Terminal');

    // Trigger open event manually to cover branch
    if (!capturedPty) {
      throw new Error('Pty not captured');
    }

    // open should not throw and should write greeting
    expect(() => (capturedPty as any).open(undefined)).not.toThrow();

    // close should not throw
    expect(() => (capturedPty as any).close()).not.toThrow();

    // Dispose should clear listeners without error
    expect(() => watcher.dispose()).not.toThrow();
  });

  it('should use fallback emit when writeEmitter.fire is unavailable', () => {
    watcher.createTerminal('Fallback Terminal');

    if (!capturedPty) throw new Error('Pty not captured');

    // Replace writeEmitter with object that only has emit
    const emitSpy = jest.fn();
    (capturedPty as any).writeEmitter = { emit: emitSpy };

    // Call handleInput which triggers safeFire emit path
    (capturedPty as any).handleInput('fallback');

    expect(emitSpy).toHaveBeenCalledWith('data', 'fallback');
  });
});
