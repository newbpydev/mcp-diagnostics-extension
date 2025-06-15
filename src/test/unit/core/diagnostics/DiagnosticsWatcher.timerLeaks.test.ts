import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';

/**
 * Focused regression test to ensure that DiagnosticsWatcher does **not** leave
 * any outstanding timers once it is disposed.  This prevents the "Cannot log
 * after tests are done" warning and general Jest timer leakage noise.
 */

describe('DiagnosticsWatcher – timer leak prevention', () => {
  const createMockVsCodeApi = () => ({
    languages: {
      onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      getDiagnostics: jest.fn().mockReturnValue([]),
    },
    workspace: {
      getWorkspaceFolder: jest.fn().mockReturnValue({ name: 'test-workspace' }),
      findFiles: jest.fn().mockResolvedValue([]),
      openTextDocument: jest.fn().mockResolvedValue({}),
    },
    commands: {
      executeCommand: jest.fn(),
    },
    Uri: {
      file: jest.fn().mockReturnValue({ fsPath: '', toString: () => '' }),
    },
  });

  beforeEach(() => {
    // Enable Jest fake timers so we can assert on getTimerCount()
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Flush any pending timers that may fire after disposal
    jest.runOnlyPendingTimers();

    // Expect that **all** timers have been cleared by dispose()
    expect(jest.getTimerCount()).toBe(0);

    // Restore real timers for any subsequent tests
    jest.useRealTimers();
  });

  it('clears all timers when disposed immediately after construction', () => {
    const mockVsCode = createMockVsCodeApi();
    const watcher = new DiagnosticsWatcher(mockVsCode as any);

    // Dispose right away, clearing _initialAnalysisTimeout and any others
    watcher.dispose();
  });
});
