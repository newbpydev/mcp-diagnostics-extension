import { VsCodeApiAdapter } from '@infrastructure/vscode/VsCodeApiAdapter';
import { VsCodeUri } from '@core/diagnostics/DiagnosticsWatcher';

// Mock VS Code API
const mockVscode = {
  languages: {
    onDidChangeDiagnostics: jest.fn(),
    getDiagnostics: jest.fn(),
  },
  workspace: {
    getWorkspaceFolder: jest.fn(),
  },
  Uri: {
    parse: jest.fn(),
  },
} as any;

describe('VsCodeApiAdapter', () => {
  let adapter: VsCodeApiAdapter;
  let mockDisposable: { dispose: jest.Mock };

  const createMockUri = (path: string): VsCodeUri => ({
    toString: jest.fn().mockReturnValue(path),
    fsPath: path,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockDisposable = { dispose: jest.fn() };
    mockVscode.languages.onDidChangeDiagnostics.mockReturnValue(mockDisposable);

    adapter = new VsCodeApiAdapter(mockVscode);
  });

  describe('Languages API', () => {
    describe('onDidChangeDiagnostics', () => {
      it('should subscribe to diagnostic changes', () => {
        const mockListener = jest.fn();

        const disposable = adapter.languages.onDidChangeDiagnostics(mockListener);

        expect(mockVscode.languages.onDidChangeDiagnostics).toHaveBeenCalled();
        expect(disposable).toBe(mockDisposable);
      });

      it('should convert VS Code diagnostic change events', () => {
        const mockListener = jest.fn();
        adapter.languages.onDidChangeDiagnostics(mockListener);

        // Simulate VS Code calling the listener
        const vsCodeListener = mockVscode.languages.onDidChangeDiagnostics.mock.calls[0][0];
        const mockVsCodeEvent = { uris: ['/test/file1.ts', '/test/file2.ts'] };

        vsCodeListener(mockVsCodeEvent);

        expect(mockListener).toHaveBeenCalledWith({
          uris: ['/test/file1.ts', '/test/file2.ts'],
        });
      });
    });

    describe('getDiagnostics', () => {
      it('should get diagnostics for specific URI', () => {
        const mockUri = createMockUri('/test/file.ts');
        const mockVsCodeUri = { fsPath: '/test/file.ts' };
        const mockDiagnostics = [
          {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
            message: 'Test error',
            severity: 0,
            source: 'test',
            code: 'E001',
          },
        ];

        mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
        mockVscode.languages.getDiagnostics.mockReturnValue(mockDiagnostics);

        const result = adapter.languages.getDiagnostics(mockUri);

        // Verify the result is correctly converted
        expect(result).toHaveLength(1);
        expect(result[0]).toBeDefined();
        expect(result[0]!.message).toBe('Test error');
        expect(result[0]!.severity).toBe(0);
        expect(result[0]!.source).toBe('test');
        expect(result[0]!.code).toBe('E001');
        expect(result[0]!.range).toEqual({
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        });
      });

      it('should get all diagnostics when no URI provided', () => {
        const mockDiagnosticMap = [
          [
            'file1.ts',
            [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                message: 'Error 1',
                severity: 0,
              },
            ],
          ],
          [
            'file2.ts',
            [
              {
                range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
                message: 'Error 2',
                severity: 1,
              },
            ],
          ],
        ];

        mockVscode.languages.getDiagnostics.mockReturnValue(mockDiagnosticMap);

        const result = adapter.languages.getDiagnostics();

        expect(mockVscode.languages.getDiagnostics).toHaveBeenCalledWith();
        expect(result).toHaveLength(2);
        expect(result[0]).toBeDefined();
        expect(result[1]).toBeDefined();
        expect(result[0]!.message).toBe('Error 1');
        expect(result[1]!.message).toBe('Error 2');
      });
    });
  });

  describe('Workspace API', () => {
    describe('getWorkspaceFolder', () => {
      it('should get workspace folder for URI', () => {
        const mockUri = createMockUri('/test/file.ts');
        const mockVsCodeUri = { fsPath: '/test/file.ts' };
        const mockWorkspaceFolder = { name: 'TestWorkspace' };

        mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
        mockVscode.workspace.getWorkspaceFolder.mockReturnValue(mockWorkspaceFolder);

        const result = adapter.workspace.getWorkspaceFolder(mockUri);

        // Verify the result is correctly returned
        expect(result).toEqual({ name: 'TestWorkspace' });
      });

      it('should return undefined when no workspace folder found', () => {
        const mockUri = createMockUri('/test/file.ts');
        const mockVsCodeUri = { fsPath: '/test/file.ts' };

        mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
        mockVscode.workspace.getWorkspaceFolder.mockReturnValue(undefined);

        const result = adapter.workspace.getWorkspaceFolder(mockUri);

        expect(result).toBeUndefined();
      });
    });
  });

  describe('Diagnostic Conversion', () => {
    it('should convert diagnostic with number code', () => {
      const mockUri = createMockUri('/test/file.ts');
      const mockDiagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        message: 'Test error',
        severity: 0,
        source: 'test',
        code: 1001,
      };

      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/test/file.ts' });
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0]).toBeDefined();
      expect(result[0]!.code).toBe(1001);
    });

    it('should convert diagnostic with string code', () => {
      const mockUri = createMockUri('/test/file.ts');
      const mockDiagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        message: 'Test error',
        severity: 0,
        source: 'test',
        code: 'E001',
      };

      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/test/file.ts' });
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0]).toBeDefined();
      expect(result[0]!.code).toBe('E001');
    });

    it('should handle diagnostic with null source', () => {
      const mockUri = createMockUri('/test/file.ts');
      const mockDiagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        message: 'Test error',
        severity: 0,
        source: null,
      };

      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/test/file.ts' });
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0]).toBeDefined();
      expect(result[0]!.source).toBeNull();
    });

    it('should handle diagnostic with related information', () => {
      const mockUri = createMockUri('/test/file.ts');
      const mockDiagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        message: 'Test error',
        severity: 0,
        relatedInformation: [],
      };

      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/test/file.ts' });
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0]).toBeDefined();
      expect(result[0]!.relatedInformation).toEqual([]);
    });

    it('should handle diagnostic with complex code object', () => {
      const mockUri = createMockUri('/test/file.ts');
      const mockDiagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        message: 'Test error',
        severity: 0,
        code: { value: 'COMPLEX_CODE', target: 'https://example.com' },
      };

      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/test/file.ts' });
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0]).toBeDefined();
      expect(result[0]!.code).toBe('COMPLEX_CODE');
    });

    it('should handle undefined code', () => {
      const mockUri = createMockUri('/test/file.ts');
      const mockDiagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        message: 'Test error',
        severity: 0,
        code: undefined,
      };

      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/test/file.ts' });
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0]).toBeDefined();
      expect(result[0]!.code).toBeUndefined();
    });
  });
});
