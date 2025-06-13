// @ts-nocheck

import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';

// --- Mock fs/path ---
const writeFileMock = jest.fn();
const renameMock = jest.fn();
const existsSyncMock = jest.fn();
const mkdirSyncMock = jest.fn();

jest.mock('fs', () => {
  const real = jest.requireActual('fs');
  return {
    ...real,
    promises: {
      writeFile: writeFileMock,
      rename: renameMock,
    },
    existsSync: existsSyncMock,
    mkdirSync: mkdirSyncMock,
  };
});

jest.mock('path', () => jest.requireActual('path'));

// Minimal ProblemItem type for watcher internals
interface ProblemItem {
  filePath: string;
  workspaceFolder: string;
  severity: string;
  message: string;
  source?: string;
}

/**
 * Helper to create a DiagnosticsWatcher with a stubbed VS Code API that never throws
 */
function createWatcher(): DiagnosticsWatcher {
  const mockVsCodeApi: any = {
    languages: {
      onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      getDiagnostics: jest.fn().mockReturnValue([]),
    },
    workspace: {
      getWorkspaceFolder: jest.fn().mockReturnValue({ name: 'root' }),
      workspaceFolders: [{ uri: { fsPath: '/workspace' }, name: 'root' }],
      findFiles: jest.fn().mockResolvedValue([]),
      openTextDocument: jest.fn(),
    },
    commands: { executeCommand: jest.fn() },
    window: { showTextDocument: jest.fn() },
    Uri: { file: jest.fn((p) => ({ fsPath: p, toString: () => p })) },
  };

  const watcher = new DiagnosticsWatcher(mockVsCodeApi, 0);

  // Inject a fake problem for summary tests
  (watcher as any).problemsByUri.set('/test.ts', [
    {
      filePath: '/test.ts',
      workspaceFolder: 'root',
      severity: 'Error',
      message: 'Bad',
      source: 'typescript',
    } as ProblemItem,
  ]);

  return watcher;
}

describe('🎯 DiagnosticsWatcher.exportProblemsToFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should write export file successfully', async () => {
    process.env['NODE_ENV'] = 'ci';
    const watcher = createWatcher();

    existsSyncMock.mockReturnValue(true);
    writeFileMock.mockResolvedValue(undefined);
    renameMock.mockResolvedValue(undefined);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await expect(watcher.exportProblemsToFile('/tmp/export.json')).resolves.toBeUndefined();

    expect(writeFileMock).toHaveBeenCalled();
    expect(renameMock).toHaveBeenCalled();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('/tmp/export.json'));

    consoleSpy.mockRestore();
  });

  it('should propagate errors when writeFile fails', async () => {
    const watcher = createWatcher();

    existsSyncMock.mockReturnValue(true);
    writeFileMock.mockRejectedValue(new Error('disk full'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(watcher.exportProblemsToFile('/tmp/export.json')).rejects.toThrow('disk full');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[DiagnosticsWatcher] Failed to export problems:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});

describe('🎯 DiagnosticsWatcher.getWorkspaceSummary branches', () => {
  it('should return severity grouped summary', () => {
    const watcher = createWatcher();

    const severitySummary = watcher.getWorkspaceSummary('severity') as any;
    expect(severitySummary.Error).toBe(1);
    expect(severitySummary.Warning).toBe(0);
  });

  it('should return workspaceFolder grouped summary', () => {
    const watcher = createWatcher();

    const wsSummary = watcher.getWorkspaceSummary('workspaceFolder') as any;
    expect(wsSummary.root).toBe(1);
  });

  it('should return source grouped summary', () => {
    const watcher = createWatcher();

    const sourceSummary = watcher.getWorkspaceSummary('source') as any;
    expect(sourceSummary.typescript).toBe(1);
  });
});
