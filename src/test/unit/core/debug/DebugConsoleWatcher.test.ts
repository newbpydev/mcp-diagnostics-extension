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

  it('should ignore non-output events', () => {
    const onDataSpy = jest.fn();
    watcher.on('onData', onDataSpy);

    const mockEvent: vscode.DebugSessionCustomEvent = {
      session: { id: 'session1', type: 'node', name: 'My Debug' } as any,
      event: 'initialized', // Not an 'output' event
      body: { category: 'stdout', output: 'Debug message\n' },
    } as any;

    if (!capturedHandler) {
      throw new Error('Handler not captured');
    }
    capturedHandler(mockEvent);

    expect(onDataSpy).not.toHaveBeenCalled();
  });

  it('should ignore events with missing body', () => {
    const onDataSpy = jest.fn();
    watcher.on('onData', onDataSpy);

    const mockEvent: vscode.DebugSessionCustomEvent = {
      session: { id: 'session1', type: 'node', name: 'My Debug' } as any,
      event: 'output',
      body: undefined,
    } as any;

    if (!capturedHandler) {
      throw new Error('Handler not captured');
    }
    capturedHandler(mockEvent);

    expect(onDataSpy).not.toHaveBeenCalled();
  });

  it('should ignore events with missing output', () => {
    const onDataSpy = jest.fn();
    watcher.on('onData', onDataSpy);

    const mockEvent: vscode.DebugSessionCustomEvent = {
      session: { id: 'session1', type: 'node', name: 'My Debug' } as any,
      event: 'output',
      body: { category: 'stdout' }, // Missing output
    } as any;

    if (!capturedHandler) {
      throw new Error('Handler not captured');
    }
    capturedHandler(mockEvent);

    expect(onDataSpy).not.toHaveBeenCalled();
  });

  it('should use default category when missing', () => {
    const onDataSpy = jest.fn();
    watcher.on('onData', onDataSpy);

    const mockEvent: vscode.DebugSessionCustomEvent = {
      session: { id: 'session1', type: 'node', name: 'My Debug' } as any,
      event: 'output',
      body: { output: 'Debug message\n' }, // Missing category
    } as any;

    if (!capturedHandler) {
      throw new Error('Handler not captured');
    }
    capturedHandler(mockEvent);

    expect(onDataSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session1',
        category: 'console', // Default value
        output: 'Debug message\n',
        timestamp: expect.any(Number),
      })
    );
  });

  it('should handle errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const onDataSpy = jest.fn();
    watcher.on('onData', onDataSpy);

    // Create a mock event that will cause an error (no session)
    const badEvent = {
      event: 'output',
      body: { output: 'test' },
      // Missing session property
    } as any;

    if (!capturedHandler) {
      throw new Error('Handler not captured');
    }
    capturedHandler(badEvent);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[DebugConsoleWatcher] Error processing debug output event:',
      expect.any(Error)
    );
    expect(onDataSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should dispose properly', () => {
    const disposeSpy = jest.fn();
    (vscode.debug.onDidReceiveDebugSessionCustomEvent as jest.Mock).mockReturnValue({
      dispose: disposeSpy,
    });

    const testWatcher = new DebugConsoleWatcher(vscode);
    testWatcher.dispose();

    expect(disposeSpy).toHaveBeenCalled();
  });

  it('should handle dispose errors gracefully', () => {
    const disposeSpy = jest.fn(() => {
      throw new Error('Dispose error');
    });
    (vscode.debug.onDidReceiveDebugSessionCustomEvent as jest.Mock).mockReturnValue({
      dispose: disposeSpy,
    });

    const testWatcher = new DebugConsoleWatcher(vscode);
    expect(() => testWatcher.dispose()).not.toThrow();
  });
});
