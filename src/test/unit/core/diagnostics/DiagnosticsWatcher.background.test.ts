import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';

// Mock minimal dependencies
const createMockVsCodeApi = () => {
  const mockUri = {
    fsPath: '/tmp/file.ts',
    toString: () => '/tmp/file.ts',
  } as any;

  return {
    languages: {
      onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      getDiagnostics: jest.fn(() => []),
    },
    workspace: {
      getWorkspaceFolder: jest.fn(),
      workspaceFolders: undefined,
      findFiles: jest.fn(async () => [mockUri]),
      openTextDocument: jest.fn(async () => undefined),
    },
    commands: {
      executeCommand: jest.fn(async () => undefined),
    },
    window: {
      showTextDocument: jest.fn(async () => undefined),
    },
    Uri: {
      file: jest.fn(() => mockUri),
    },
  } as any;
};

describe('DiagnosticsWatcher – Background paths & export', () => {
  const ORIGINAL_ENV = process.env['NODE_ENV'];

  afterEach(() => {
    jest.restoreAllMocks();
    process.env['NODE_ENV'] = ORIGINAL_ENV as string | undefined;
  });

  it('should call exportProblemsToFile when not in test env', async () => {
    process.env['NODE_ENV'] = 'ci'; // ensure branch executes
    const vsCodeApi = createMockVsCodeApi();
    const watcher = new DiagnosticsWatcher(vsCodeApi, 0);

    const exportSpy = jest
      .spyOn(watcher as any, 'exportProblemsToFile')
      .mockResolvedValueOnce(void 0);

    const uri = vsCodeApi.Uri.file('/tmp/file.ts');
    // @ts-ignore accessing private method for test coverage
    await (watcher as any).processUriDiagnostics(uri);

    expect(exportSpy).toHaveBeenCalledTimes(1);
  });

  it('analyzeWorkspaceFilesInBackground should iterate patterns and open documents', async () => {
    const vsCodeApi = createMockVsCodeApi();
    const watcher = new DiagnosticsWatcher(vsCodeApi, 0);

    // @ts-ignore private access
    await (watcher as any).analyzeWorkspaceFilesInBackground();

    expect(vsCodeApi.workspace.findFiles).toHaveBeenCalled();
    expect(vsCodeApi.workspace.openTextDocument).toHaveBeenCalled();
  });

  it('dispose() should cancel scheduled initial analysis timeout', async () => {
    jest.useFakeTimers();
    process.env['NODE_ENV'] = 'ci';

    const vsCodeApi = createMockVsCodeApi();
    const watcher = new DiagnosticsWatcher(vsCodeApi, 0);

    const analysisSpy = jest
      .spyOn(watcher as any, 'triggerWorkspaceAnalysis')
      .mockResolvedValue(void 0);

    // Dispose immediately before the 1s timer fires
    watcher.dispose();

    // Advance timers to ensure any pending timeouts would run
    jest.advanceTimersByTime(2000);

    // The spy should not have been called because the timeout was cleared
    expect(analysisSpy).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});
