import * as vscode from 'vscode';
import { TaskWatcher } from '@core/tasks/TaskWatcher';

// Mock VS Code API
let capturedHandler: ((e: vscode.TaskProcessEndEvent) => void) | undefined;

jest.mock(
  'vscode',
  () => {
    const events = require('events');
    const emitter = new events.EventEmitter();

    return {
      tasks: {
        onDidEndTaskProcess: jest.fn((handler: (e: any) => void) => {
          capturedHandler = handler;
          emitter.on('taskEnd', handler);
          return { dispose: jest.fn(() => emitter.removeListener('taskEnd', handler)) };
        }),
      },
      EventEmitter: events.EventEmitter,
    } as unknown as typeof import('vscode');
  },
  { virtual: true }
);

describe('TaskWatcher', () => {
  let watcher: TaskWatcher;

  beforeEach(() => {
    jest.clearAllMocks();
    watcher = new TaskWatcher(vscode as unknown as typeof vscode);
  });

  afterEach(() => {
    watcher.dispose();
  });

  it('should subscribe to onDidEndTaskProcess upon instantiation', () => {
    expect(vscode.tasks.onDidEndTaskProcess).toHaveBeenCalled();
  });

  it('should emit "onData" with correct mapping when a task ends', () => {
    const spy = jest.fn();
    watcher.on('onData', spy);

    const fakeEvent: vscode.TaskProcessEndEvent = {
      execution: { task: { name: 'build' } } as any,
      exitCode: 0,
    } as unknown as vscode.TaskProcessEndEvent;

    if (!capturedHandler) throw new Error('handler undefined');
    capturedHandler(fakeEvent);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        taskName: 'build',
        exitCode: 0,
        timestamp: expect.any(Number),
      })
    );
  });

  it('should emit item without exitCode when undefined', () => {
    const spy = jest.fn();
    watcher.on('onData', spy);

    const fakeEvent: vscode.TaskProcessEndEvent = {
      execution: { task: { name: 'lint' } } as any,
      exitCode: undefined,
    } as unknown as vscode.TaskProcessEndEvent;

    capturedHandler?.(fakeEvent);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ taskName: 'lint', timestamp: expect.any(Number) })
    );
    // exitCode should be undefined/not present
    const emitted = spy.mock.calls[0][0] as any;
    expect('exitCode' in emitted ? emitted.exitCode : undefined).toBeUndefined();
  });

  it('should default taskName to "unknown" when absent', () => {
    const spy = jest.fn();
    watcher.on('onData', spy);

    const fakeEvent: vscode.TaskProcessEndEvent = {
      execution: { task: {} as any } as any,
      exitCode: 1,
    } as unknown as vscode.TaskProcessEndEvent;

    capturedHandler?.(fakeEvent);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ taskName: 'unknown', exitCode: 1 }));
  });
});
