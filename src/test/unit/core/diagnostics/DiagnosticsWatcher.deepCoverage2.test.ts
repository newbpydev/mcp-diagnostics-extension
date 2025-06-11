/* eslint-disable */
// @ts-nocheck

import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { EventEmitter } from 'events';

function createMockUri(path) {
  return {
    fsPath: path,
    toString() {
      return path;
    },
  };
}

describe('DiagnosticsWatcher deep coverage extra', () => {
  let mockVs: any;
  let watcher: DiagnosticsWatcher;

  beforeEach(() => {
    const emitter = new EventEmitter();

    mockVs = {
      languages: {
        onDidChangeDiagnostics: jest.fn((cb) => {
          // Immediately invoke to simulate initial event
          cb({ uris: [createMockUri('/a.ts')] });
          return { dispose: jest.fn() };
        }),
        getDiagnostics: jest.fn((uri) => {
          if (!uri) return [];
          return [
            {
              message: 'err',
              severity: 0,
              range: {
                start: { line: 0, character: 1 },
                end: { line: 0, character: 4 },
              },
              source: 'ts',
            },
          ];
        }),
      },
      workspace: {
        workspaceFolders: [{ uri: createMockUri('/'), name: 'root' }],
        findFiles: jest.fn((pattern, exclude) => {
          // Return dummy files only for first pattern to trigger inner logic
          if (pattern === '**/*.ts') {
            return Promise.resolve([
              createMockUri('/src/file1.ts'),
              createMockUri('/src/file2.ts'),
              createMockUri('/src/file3.ts'),
              createMockUri('/src/file4.ts'),
              createMockUri('/src/file5.ts'),
            ]);
          }
          return Promise.resolve([]);
        }),
        openTextDocument: jest.fn(() => Promise.resolve({})),
        getWorkspaceFolder: jest.fn(() => ({ name: 'root' })),
      },
      commands: {
        executeCommand: jest.fn(() => Promise.resolve()),
      },
      window: {
        showTextDocument: jest.fn(() => Promise.resolve()),
      },
      Uri: {
        file: (p) => createMockUri(p),
      },
    };

    watcher = new DiagnosticsWatcher(mockVs, 10);
  });

  afterEach(() => {
    watcher.dispose();
    jest.clearAllMocks();
  });

  it('performs background analysis with sample files', async () => {
    // Trigger workspace analysis which internally calls background analysis
    await watcher.triggerWorkspaceAnalysis();

    // After analysis, problems should be registered
    const problems = watcher.getAllProblems();
    expect(problems.length).toBeGreaterThan(0);

    // Validate summary branches
    const sev = watcher.getWorkspaceSummary('severity');
    expect(sev).toHaveProperty('Error');
    const ws = watcher.getWorkspaceSummary('workspaceFolder');
    expect(ws).toHaveProperty('root');
    const src = watcher.getWorkspaceSummary('source');
    expect(src).toHaveProperty('ts');
  });

  it('refreshDiagnostics emits current problems', () => {
    const spy = jest.fn();
    watcher.on('problemsChanged', spy);

    watcher.refreshDiagnostics();

    expect(spy).toHaveBeenCalled();
  });
});
