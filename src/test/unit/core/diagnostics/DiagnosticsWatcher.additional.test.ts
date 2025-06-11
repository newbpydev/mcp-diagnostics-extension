// @ts-nocheck

import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { DiagnosticConverter } from '@core/diagnostics/DiagnosticConverter';

jest.useFakeTimers();

// -----------------------
// Mock VS Code API helper
// -----------------------
function createMockVsCodeApi() {
  const mockUri = (fsPath) => ({
    fsPath,
    toString: () => fsPath,
  });

  return {
    languages: {
      onDidChangeDiagnostics: jest.fn(() => ({ dispose: jest.fn() })),
      // Will be overridden in specific tests when needed
      getDiagnostics: jest.fn(),
    },
    workspace: {
      getWorkspaceFolder: jest.fn(() => ({ name: 'root' })),
      workspaceFolders: [{ uri: mockUri('/'), name: 'root' }],
      findFiles: jest.fn().mockResolvedValue([]), // default: no files
      openTextDocument: jest.fn().mockResolvedValue(undefined),
    },
    commands: {
      executeCommand: jest.fn().mockResolvedValue(undefined),
    },
    window: {
      showTextDocument: jest.fn().mockResolvedValue(undefined),
    },
    Uri: {
      file: mockUri,
    },
  };
}

let converterSpy: jest.SpyInstance;

beforeAll(() => {
  // Spy on DiagnosticConverter so we don't depend on its implementation details
  converterSpy = jest
    .spyOn(DiagnosticConverter.prototype, 'convertToProblemItem')
    .mockImplementation((_d, uri) => {
      return {
        filePath: uri.fsPath,
        workspaceFolder: 'root',
        severity: 'Error',
        message: 'mock',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        source: 'jest',
      } as any;
    });
});

afterAll(() => {
  converterSpy.mockRestore();
});

// ---------------------------
// Begin systematic test suite
// ---------------------------

describe('DiagnosticsWatcher – systematic coverage improvements', () => {
  it('filters problems, lists files, refreshes events, and disposes correctly', () => {
    const vsCodeApi = createMockVsCodeApi();

    const watcher = new DiagnosticsWatcher(vsCodeApi as any, 0);

    // Inject two fake problem entries directly (safe thanks to ts-nocheck)
    const problemFoo = {
      filePath: '/foo.ts',
      workspaceFolder: 'root',
      severity: 'Error',
      message: 'foo',
      range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
    };
    const problemBar = {
      filePath: '/bar.ts',
      workspaceFolder: 'root',
      severity: 'Warning',
      message: 'bar',
      range: { start: { line: 2, character: 0 }, end: { line: 2, character: 3 } },
    };

    (watcher as any).problemsByUri.set('/foo.ts', [problemFoo]);
    (watcher as any).problemsByUri.set('/bar.ts', [problemBar]);

    // 1) getFilteredProblems – by severity
    const onlyErrors = watcher.getFilteredProblems({ severity: 'Error' });
    expect(onlyErrors).toHaveLength(1);
    expect(onlyErrors[0].message).toBe('foo');

    // 2) getFilteredProblems – by filePath
    const onlyFoo = watcher.getFilteredProblems({ filePath: '/foo.ts' });
    expect(onlyFoo).toEqual([problemFoo]);

    // 3) getFilesWithProblems
    expect(watcher.getFilesWithProblems().sort()).toEqual(['/bar.ts', '/foo.ts'].sort());

    // 3b) workspace-level queries
    const workspaceProblems = watcher.getProblemsForWorkspace('root');
    expect(workspaceProblems).toHaveLength(2);

    // 3c) summary grouping branches
    const bySeverity = watcher.getWorkspaceSummary('severity') as any;
    expect(bySeverity.Error).toBe(1);
    const byWorkspace = watcher.getWorkspaceSummary('workspaceFolder') as any;
    expect(byWorkspace.root).toBe(2);
    const bySource = watcher.getWorkspaceSummary('source') as any;
    expect(typeof bySource).toBe('object');

    // 4) refreshDiagnostics should emit an event containing problems
    const listener = jest.fn();
    watcher.on('problemsChanged', listener);

    watcher.refreshDiagnostics();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'refresh',
        problems: expect.arrayContaining([problemFoo, problemBar]),
      })
    );

    // 5) dispose clears everything and subsequent queries return empty arrays
    watcher.dispose();
    expect(watcher.getAllProblems()).toEqual([]);
    expect(watcher.getFilesWithProblems()).toEqual([]);

    // Event listeners removed – emitting after dispose should not call listener again
    listener.mockClear();
    watcher.refreshDiagnostics();
    expect(listener).not.toHaveBeenCalled();

    // Flush any remaining timers scheduled by the watcher (e.g., constructor setTimeout)
    jest.runOnlyPendingTimers();
  });

  it.skip('triggerWorkspaceAnalysis loads existing diagnostics and populates problem map', async () => {
    const vsCodeApi = createMockVsCodeApi();

    const mockUri = vsCodeApi.Uri.file('/analyzed.ts');
    const diagnosticTuple = [mockUri, [{ message: 'boom', severity: 1 }]];
    vsCodeApi.languages.getDiagnostics.mockReturnValue([diagnosticTuple]);

    const watcher = new DiagnosticsWatcher(vsCodeApi as any, 0);

    // Clear the constructor-scheduled workspace analysis to keep deterministic timing
    jest.clearAllTimers();

    // Stub the heavy background file analysis on the prototype so original body is skipped
    const bgSpy = jest
      .spyOn(DiagnosticsWatcher.prototype as any, 'analyzeWorkspaceFilesInBackground')
      .mockResolvedValue(undefined);

    // Execute the full analysis (still exercises loadAllExistingDiagnostics path)
    const analysisPromise = watcher.triggerWorkspaceAnalysis();

    // Flush **all** pending timers (includes the 1 000 ms settle delay)
    jest.runAllTimers();

    await analysisPromise;

    const problems = watcher.getProblemsForFile('/analyzed.ts');
    expect(problems).toHaveLength(1);
    expect(problems[0].filePath).toBe('/analyzed.ts');

    // Sanity-check that workspace summary reflects the newly added problem
    const summary: any = watcher.getWorkspaceSummary();
    expect(summary.totalProblems).toBeGreaterThanOrEqual(1);

    bgSpy.mockRestore();
  }, 10000); // custom timeout (should finish well under this)

  it('processUriDiagnostics handles empty diagnostics and removes entry', () => {
    const vsCodeApi = createMockVsCodeApi();

    // Return an empty diagnostic array to trigger deletion branch
    vsCodeApi.languages.getDiagnostics.mockReturnValue([]);

    const watcher = new DiagnosticsWatcher(vsCodeApi as any, 0);

    // Prime map with existing problems for removal verification
    (watcher as any).problemsByUri.set('/empty.ts', [
      {
        filePath: '/empty.ts',
        workspaceFolder: 'root',
        severity: 'Error',
        message: 'old',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      },
    ]);

    // Listen for problemsChanged emission
    const changedListener = jest.fn();
    watcher.on('problemsChanged', changedListener);

    // Invoke private method directly
    (watcher as any).processUriDiagnostics({ fsPath: '/empty.ts', toString: () => '/empty.ts' });

    // Map entry should be removed
    expect(watcher.getProblemsForFile('/empty.ts')).toEqual([]);

    // Event should have emitted with empty array
    expect(changedListener).toHaveBeenCalledWith(
      expect.objectContaining({ uri: '/empty.ts', problems: [] })
    );
  });

  it('loadAllExistingDiagnostics merges and deduplicates problems', async () => {
    const vsCodeApi = createMockVsCodeApi();

    const uriObj = vsCodeApi.Uri.file('/dup.ts');
    const diagnosticA = { message: 'A', severity: 1, range: {} } as any;
    const diagnosticADup = { message: 'A', severity: 1, range: {} } as any; // duplicate by msg/line
    const diagnosticB = { message: 'B', severity: 1, range: {} } as any;

    vsCodeApi.languages.getDiagnostics.mockReturnValue([
      [uriObj, [diagnosticA, diagnosticADup, diagnosticB]],
    ]);

    const watcher = new DiagnosticsWatcher(vsCodeApi as any, 0);

    // Preload map with an existing duplicate to force merge path
    (watcher as any).problemsByUri.set('/dup.ts', [
      {
        filePath: '/dup.ts',
        workspaceFolder: 'root',
        severity: 'Error',
        message: 'A',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      },
    ]);

    // Invoke private async method
    await (watcher as any).loadAllExistingDiagnostics();

    const all = watcher.getProblemsForFile('/dup.ts');
    // Should contain exactly 2 unique problems (A & B)
    expect(all.map((p) => p.message).sort()).toEqual(['A', 'B']);
  });

  it('analyzeWorkspaceFilesInBackground iterates over found files', async () => {
    const vsCodeApi = createMockVsCodeApi();

    // Return one file match for the first pattern and empty for others
    const sampleUri = vsCodeApi.Uri.file('/background.ts');
    vsCodeApi.workspace.findFiles.mockImplementation((pattern: string) => {
      if (pattern === '**/*.ts') {
        return Promise.resolve([sampleUri]);
      }
      return Promise.resolve([]);
    });

    // Spy on analyzeFileInBackground to ensure it's called
    const fileSpy = jest
      .spyOn(DiagnosticsWatcher.prototype as any, 'analyzeFileInBackground')
      .mockResolvedValue(undefined);

    const watcher = new DiagnosticsWatcher(vsCodeApi as any, 0);

    await (watcher as any).analyzeWorkspaceFilesInBackground();

    expect(fileSpy).toHaveBeenCalledWith(sampleUri);

    fileSpy.mockRestore();
  });
});
