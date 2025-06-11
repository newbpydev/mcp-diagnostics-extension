import { VsCodeApiAdapter } from '@infrastructure/vscode/VsCodeApiAdapter';
import { VsCodeUri } from '@core/diagnostics/DiagnosticsWatcher';

// Helper function to create mock URIs
const createMockUri = (path: string): VsCodeUri => ({
  toString: jest.fn().mockReturnValue(path),
  fsPath: path,
});

// Mock VS Code API
const mockVscode = {
  languages: {
    onDidChangeDiagnostics: jest.fn(),
    getDiagnostics: jest.fn(),
  },
  workspace: {
    getWorkspaceFolder: jest.fn(),
  },
  commands: {
    executeCommand: jest.fn(),
  },
  window: {
    showTextDocument: jest.fn(),
  },
  Uri: {
    parse: jest.fn(),
    file: jest.fn(),
  },
} as any;

describe('VsCodeApiAdapter', () => {
  let adapter: VsCodeApiAdapter;
  let mockDisposable: { dispose: jest.Mock };

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
    describe('workspaceFolders', () => {
      it('should return workspace folders if present', () => {
        mockVscode.workspace.workspaceFolders = [
          { uri: { fsPath: '/ws1', toString: () => '/ws1' }, name: 'WS1' },
          { uri: { fsPath: '/ws2', toString: () => '/ws2' }, name: 'WS2' },
        ];
        adapter = new VsCodeApiAdapter(mockVscode);
        expect(adapter.workspace.workspaceFolders).toHaveLength(2);
        expect(adapter.workspace.workspaceFolders?.[0]?.name).toBe('WS1');
        expect(adapter.workspace.workspaceFolders?.[1]?.name).toBe('WS2');
      });
      it('should return undefined if workspaceFolders is not present', () => {
        mockVscode.workspace.workspaceFolders = undefined;
        adapter = new VsCodeApiAdapter(mockVscode);
        expect(adapter.workspace.workspaceFolders).toBeUndefined();
      });
    });
    describe('findFiles', () => {
      it('should resolve uris from findFiles', async () => {
        mockVscode.workspace.findFiles = jest
          .fn()
          .mockResolvedValue([{ fsPath: '/found1', toString: () => '/found1' }]);
        adapter = new VsCodeApiAdapter(mockVscode);
        const uris = await adapter.workspace.findFiles('**/*');
        expect(uris[0]?.fsPath).toBe('/found1');
      });
      it('should handle findFiles rejection', async () => {
        mockVscode.workspace.findFiles = jest.fn().mockRejectedValue(new Error('fail'));
        adapter = new VsCodeApiAdapter(mockVscode);
        await expect(adapter.workspace.findFiles('**/*')).rejects.toThrow('fail');
      });
    });
    describe('openTextDocument', () => {
      it('should open text document for uri', async () => {
        mockVscode.workspace.openTextDocument = jest.fn().mockResolvedValue({});
        mockVscode.Uri.parse.mockReturnValue({ fsPath: '/doc', toString: () => '/doc' });
        adapter = new VsCodeApiAdapter(mockVscode);
        await expect(
          adapter.workspace.openTextDocument(createMockUri('/doc'))
        ).resolves.toBeDefined();
        expect(mockVscode.workspace.openTextDocument).toHaveBeenCalled();
      });
      it('should handle openTextDocument rejection', async () => {
        mockVscode.workspace.openTextDocument = jest.fn().mockRejectedValue(new Error('fail'));
        mockVscode.Uri.parse.mockReturnValue({ fsPath: '/fail', toString: () => '/fail' });
        adapter = new VsCodeApiAdapter(mockVscode);
        await expect(adapter.workspace.openTextDocument(createMockUri('/fail'))).rejects.toThrow(
          'fail'
        );
      });
    });

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

  describe('Commands API', () => {
    it('should execute command', async () => {
      mockVscode.commands.executeCommand = jest.fn().mockResolvedValue('ok');
      adapter = new VsCodeApiAdapter(mockVscode);
      await expect(adapter.commands.executeCommand('test')).resolves.toBe('ok');
      expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith('test');
    });
    it('should handle executeCommand rejection', async () => {
      mockVscode.commands.executeCommand = jest.fn().mockRejectedValue(new Error('fail'));
      adapter = new VsCodeApiAdapter(mockVscode);
      await expect(adapter.commands.executeCommand('fail')).rejects.toThrow('fail');
    });
  });

  describe('Window API', () => {
    it('should show text document', async () => {
      mockVscode.window.showTextDocument = jest.fn().mockResolvedValue({});
      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/shown', toString: () => '/shown' });
      adapter = new VsCodeApiAdapter(mockVscode);
      await expect(
        adapter.window.showTextDocument(createMockUri('/shown'), { preview: true })
      ).resolves.toBeDefined();
      expect(mockVscode.window.showTextDocument).toHaveBeenCalled();
    });
    it('should handle showTextDocument rejection', async () => {
      mockVscode.window.showTextDocument = jest.fn().mockRejectedValue(new Error('fail'));
      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/fail', toString: () => '/fail' });
      adapter = new VsCodeApiAdapter(mockVscode);
      await expect(
        adapter.window.showTextDocument(createMockUri('/fail'), { preserveFocus: true })
      ).rejects.toThrow('fail');
    });
  });

  describe('Uri API', () => {
    it('should convert file path to VsCodeUri', () => {
      mockVscode.Uri.file = jest.fn().mockReturnValue({ fsPath: '/foo', toString: () => '/foo' });
      adapter = new VsCodeApiAdapter(mockVscode);
      const uri = adapter.Uri.file('/foo');
      expect(uri.fsPath).toBe('/foo');
      expect(uri.toString()).toBe('/foo');
    });
  });

  describe('Diagnostic Conversion Edge Cases', () => {
    it('should handle diagnostic with missing fields', () => {
      const mockDiagnostic = {
        range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
        message: 'msg',
        severity: 2,
      };
      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/file', toString: () => '/file' });
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);
      adapter = new VsCodeApiAdapter(mockVscode);
      const result = adapter.languages.getDiagnostics(createMockUri('/file'));
      expect(result[0]?.message).toBe('msg');
      expect(result[0]?.source).toBeNull();
      expect(result[0]?.relatedInformation).toBeNull();
      expect(result[0]?.code).toBeUndefined();
    });
    it('should handle diagnostic with relatedInformation', () => {
      const mockDiagnostic = {
        range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
        message: 'msg',
        severity: 2,
        relatedInformation: [{ location: {}, message: 'info' }],
      };
      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/file', toString: () => '/file' });
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);
      adapter = new VsCodeApiAdapter(mockVscode);
      const result = adapter.languages.getDiagnostics(createMockUri('/file'));
      expect(result[0]?.relatedInformation).toHaveLength(1);
    });
    it('should handle diagnostic with null/undefined code', () => {
      const mockDiagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        message: 'msg',
        severity: 1,
        code: null,
      };
      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/file', toString: () => '/file' });
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);
      adapter = new VsCodeApiAdapter(mockVscode);
      const result = adapter.languages.getDiagnostics(createMockUri('/file'));
      expect(result[0]?.code).toBeUndefined();
    });
    it('should handle diagnostic with object code missing value', () => {
      const mockDiagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        message: 'msg',
        severity: 1,
        code: {},
      };
      mockVscode.Uri.parse.mockReturnValue({ fsPath: '/file', toString: () => '/file' });
      mockVscode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);
      adapter = new VsCodeApiAdapter(mockVscode);
      const result = adapter.languages.getDiagnostics(createMockUri('/file'));
      expect(result[0]?.code).toBeUndefined();
    });
    it('should handle malformed diagnostics array', () => {
      mockVscode.languages.getDiagnostics.mockReturnValue(undefined);
      adapter = new VsCodeApiAdapter(mockVscode);
      expect(() => adapter.languages.getDiagnostics(createMockUri('/file'))).toThrow();
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

      const adapter = new VsCodeApiAdapter(mockVscode);
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

      const adapter = new VsCodeApiAdapter(mockVscode);
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

      const adapter = new VsCodeApiAdapter(mockVscode);
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

      const adapter = new VsCodeApiAdapter(mockVscode);
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

      const adapter = new VsCodeApiAdapter(mockVscode);
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

      const adapter = new VsCodeApiAdapter(mockVscode);
      const result = adapter.languages.getDiagnostics(mockUri);

      expect(result[0]).toBeDefined();
      expect(result[0]!.code).toBeUndefined();
    });
  });
});
