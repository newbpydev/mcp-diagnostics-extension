import * as vscode from 'vscode';
import { DebugConsoleWatcher } from '@core/debug/DebugConsoleWatcher';

// Mock VS Code debug API
let capturedHandler: ((event: vscode.DebugSessionCustomEvent) => void) | undefined;

jest.mock(
  'vscode',
  () => {
    const events = require('events');
    const emitter = new events.EventEmitter();

    const mockModule = {
      debug: {
        onDidReceiveDebugSessionCustomEvent: jest.fn((handler: (e: any) => void) => {
          capturedHandler = handler;
          emitter.on('customEvent', handler);
          return { dispose: jest.fn(() => emitter.removeListener('customEvent', handler)) };
        }),
      },
      // Minimal stubs for required VS Code symbols referenced by types (if any)
      EventEmitter: events.EventEmitter,
    };

    // Cast to the full vscode module type to satisfy the compiler; tests rely only on mocked portions.
    return mockModule as unknown as typeof import('vscode');
  },
  { virtual: true }
);

describe('DebugConsoleWatcher', () => {
  let watcher: DebugConsoleWatcher;

  beforeEach(() => {
    jest.clearAllMocks();
    watcher = new DebugConsoleWatcher(vscode);
  });

  afterEach(() => {
    watcher.dispose();
  });

  it('should subscribe to debug custom events upon instantiation', () => {
    expect((vscode.debug.onDidReceiveDebugSessionCustomEvent as jest.Mock).mock.calls.length).toBe(
      1
    );
  });

  it('should emit "onData" when a DAP "output" event is received', () => {
    const onDataSpy = jest.fn();
    watcher.on('onData', onDataSpy);

    const mockEvent: vscode.DebugSessionCustomEvent = {
      session: { id: 'session1', type: 'node', name: 'My Debug' } as any,
      event: 'output',
      body: { category: 'stdout', output: 'Debug message\n' },
    } as any;

    // Trigger captured handler
    if (!capturedHandler) {
      throw new Error('Handler not captured');
    }
    capturedHandler(mockEvent);

    expect(onDataSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session1',
        category: 'stdout',
        output: 'Debug message\n',
        timestamp: expect.any(Number),
      })
    );
  });
});
