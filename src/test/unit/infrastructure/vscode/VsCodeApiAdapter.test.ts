import { VsCodeApiAdapter } from '@infrastructure/vscode/VsCodeApiAdapter';
import { IVsCodeApi, VsCodeDiagnostic, VsCodeUri } from '@core/diagnostics/DiagnosticsWatcher';

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
  Range: jest.fn(),
  Position: jest.fn(),
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
} as any;

describe('VsCodeApiAdapter', () => {
  let adapter: VsCodeApiAdapter;
  let mockDisposable: { dispose: jest.Mock };

  const createMockUri = (path: string): VsCodeUri => ({
    toString: () => path,
    fsPath: path,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockDisposable = { dispose: jest.fn() };
    mockVscode.languages.onDidChangeDiagnostics.mockReturnValue(mockDisposable);

    adapter = new VsCodeApiAdapter(mockVscode);
  });

  describe('Constructor', () => {
    it('should create adapter with VS Code API', () => {
      expect(adapter).toBeInstanceOf(VsCodeApiAdapter);
      expect(adapter.languages).toBeDefined();
      expect(adapter.workspace).toBeDefined();
    });
  });

  describe('Languages API', () => {
    describe('onDidChangeDiagnostics', () => {
      it('should register diagnostic change listener', () => {
        const listener = jest.fn();

        const result = adapter.languages.onDidChangeDiagnostics(listener);

        expect(mockVscode.languages.onDidChangeDiagnostics).toHaveBeenCalled();
        expect(result).toEqual(mockDisposable);
      });

      it('should convert VS Code diagnostic change event', () => {
        const listener = jest.fn();
        const mockUri = { toString: () => '/test/file.ts' };
        const vsCodeEvent = { uris: [mockUri] };

        adapter.languages.onDidChangeDiagnostics(listener);

        // Get the listener that was passed to VS Code API
        const vsCodeListener = mockVscode.languages.onDidChangeDiagnostics.mock.calls[0][0];
        vsCodeListener(vsCodeEvent);

        expect(listener).toHaveBeenCalledWith({
          uris: [mockUri],
        });
      });
    });

    describe('getDiagnostics', () => {
      it('should get diagnostics for specific URI', () => {
        const mockUri: VsCodeUri = { toString: () => '/test/file.ts', fsPath: '/test/file.ts' };
        const mockVsCodeUri = { fsPath: '/test/file.ts' };
        const mockDiagnostics = [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
            },
            message: 'Test error',
            severity: 0,
            source: 'test',
            code: 'E001',
            relatedInformation: null,
          },
        ];

        mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
        mockVscode.languages.getDiagnostics.mockReturnValue(mockDiagnostics);

        const result = adapter.languages.getDiagnostics(mockUri);

        expect(mockVscode.Uri.parse).toHaveBeenCalledWith('/test/file.ts');
        expect(mockVscode.languages.getDiagnostics).toHaveBeenCalledWith(mockVsCodeUri);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Test error',
          severity: 0,
          source: 'test',
        });
      });

      it('should get all diagnostics when no URI provided', () => {
        const mockDiagnostics = [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
            },
            message: 'Test error',
            severity: 0,
            source: 'test',
            code: 'E001',
            relatedInformation: null,
          },
        ];

        const mockDiagnosticsMap = new Map([
          ['/test/file1.ts', mockDiagnostics],
          ['/test/file2.ts', mockDiagnostics],
        ]);

        mockVscode.languages.getDiagnostics.mockReturnValue(mockDiagnosticsMap);

        const result = adapter.languages.getDiagnostics();

        expect(mockVscode.languages.getDiagnostics).toHaveBeenCalledWith();
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('Workspace API', () => {
    describe('getWorkspaceFolder', () => {
      it('should get workspace folder for URI', () => {
        const mockUri = { toString: () => '/test/file.ts' };
        const mockVsCodeUri = { fsPath: '/test/file.ts' };
        const mockWorkspaceFolder = { name: 'test-workspace' };

        mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
        mockVscode.workspace.getWorkspaceFolder.mockReturnValue(mockWorkspaceFolder);

        const result = adapter.workspace.getWorkspaceFolder(mockUri);

        expect(mockVscode.Uri.parse).toHaveBeenCalledWith('/test/file.ts');
        expect(mockVscode.workspace.getWorkspaceFolder).toHaveBeenCalledWith(mockVsCodeUri);
        expect(result).toEqual({ name: 'test-workspace' });
      });

      it('should return undefined when no workspace folder found', () => {
        const mockUri = { toString: () => '/test/file.ts' };
        const mockVsCodeUri = { fsPath: '/test/file.ts' };

        mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
        mockVscode.workspace.getWorkspaceFolder.mockReturnValue(undefined);

        const result = adapter.workspace.getWorkspaceFolder(mockUri);

        expect(result).toBeUndefined();
      });
    });
  });

  describe('Diagnostic Conversion', () => {
    it('should convert diagnostic with all properties', () => {
      const mockUri = { toString: () => '/test/file.ts' };
      const mockVsCodeUri = { fsPath: '/test/file.ts' };
      const mockDiagnostic = {
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 20 },
        },
        message: 'Variable not used',
        severity: 1, // Warning
        source: 'typescript',
        code: 'TS6133',
        relatedInformation: [
          {
            location: {
              uri: mockVsCodeUri,
              range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 10 },
              },
            },
            message: 'Related info',
          },
        ],
      };

      mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0]).toMatchObject({
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 20 },
        },
        message: 'Variable not used',
        severity: 1,
        source: 'typescript',
        code: 'TS6133',
        relatedInformation: [
          {
            location: {
              uri: mockVsCodeUri,
              range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 10 },
              },
            },
            message: 'Related info',
          },
        ],
      });
    });

    it('should handle diagnostic with numeric code', () => {
      const mockUri = { toString: () => '/test/file.ts' };
      const mockVsCodeUri = { fsPath: '/test/file.ts' };
      const mockDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        message: 'Test error',
        severity: 0,
        source: 'test',
        code: 1001,
        relatedInformation: null,
      };

      mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0].code).toBe(1001);
    });

    it('should handle diagnostic with complex code object', () => {
      const mockUri = { toString: () => '/test/file.ts' };
      const mockVsCodeUri = { fsPath: '/test/file.ts' };
      const mockDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        message: 'Test error',
        severity: 0,
        source: 'test',
        code: { value: 'E001', target: mockVsCodeUri },
        relatedInformation: null,
      };

      mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0].code).toBe('E001');
    });

    it('should handle diagnostic without code', () => {
      const mockUri = { toString: () => '/test/file.ts' };
      const mockVsCodeUri = { fsPath: '/test/file.ts' };
      const mockDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        message: 'Test error',
        severity: 0,
        source: 'test',
        code: undefined,
        relatedInformation: null,
      };

      mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0]).not.toHaveProperty('code');
    });

    it('should handle diagnostic with null source', () => {
      const mockUri = { toString: () => '/test/file.ts' };
      const mockVsCodeUri = { fsPath: '/test/file.ts' };
      const mockDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        message: 'Test error',
        severity: 0,
        source: null,
        code: 'E001',
        relatedInformation: null,
      };

      mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0].source).toBeNull();
    });

    it('should handle empty related information array', () => {
      const mockUri = { toString: () => '/test/file.ts' };
      const mockVsCodeUri = { fsPath: '/test/file.ts' };
      const mockDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        message: 'Test error',
        severity: 0,
        source: 'test',
        code: 'E001',
        relatedInformation: [],
      };

      mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0].relatedInformation).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle VS Code API errors gracefully', () => {
      const mockUri = { toString: () => '/test/file.ts' };

      mockVscode.Uri.parse.mockImplementation(() => {
        throw new Error('URI parse error');
      });

      expect(() => adapter.languages.getDiagnostics(mockUri)).toThrow('URI parse error');
    });

    it('should handle malformed diagnostic objects', () => {
      const mockUri = { toString: () => '/test/file.ts' };
      const mockVsCodeUri = { fsPath: '/test/file.ts' };
      const malformedDiagnostic = {
        // Missing required properties
        message: 'Test error',
      };

      mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
      mockVscode.languages.getDiagnostics.mockReturnValue([malformedDiagnostic]);

      expect(() => adapter.languages.getDiagnostics(mockUri)).toThrow();
    });
  });

  describe('Type Compatibility', () => {
    it('should implement IVsCodeApi interface', () => {
      const api: IVsCodeApi = adapter;

      expect(api.languages).toBeDefined();
      expect(api.workspace).toBeDefined();
      expect(typeof api.languages.onDidChangeDiagnostics).toBe('function');
      expect(typeof api.languages.getDiagnostics).toBe('function');
      expect(typeof api.workspace.getWorkspaceFolder).toBe('function');
    });

    it('should return properly typed diagnostic objects', () => {
      const mockUri = { toString: () => '/test/file.ts' };
      const mockVsCodeUri = { fsPath: '/test/file.ts' };
      const mockDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        message: 'Test error',
        severity: 0,
        source: 'test',
        code: 'E001',
        relatedInformation: null,
      };

      mockVscode.Uri.parse.mockReturnValue(mockVsCodeUri);
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);

      const result: VsCodeDiagnostic[] = adapter.languages.getDiagnostics(mockUri);

      expect(result).toHaveLength(1);
      expect(typeof result[0].message).toBe('string');
      expect(typeof result[0].severity).toBe('number');
      expect(typeof result[0].range.start.line).toBe('number');
    });
  });
});
