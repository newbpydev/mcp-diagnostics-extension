import { DiagnosticConverter } from '@core/diagnostics/DiagnosticConverter';
import {
  IVsCodeApi,
  VsCodeDiagnostic,
  VsCodeUri,
  VsCodeWorkspaceFolder,
} from '@core/diagnostics/DiagnosticsWatcher';
import { ProblemSeverity } from '@shared/types';

describe('DiagnosticConverter', () => {
  let converter: DiagnosticConverter;
  let mockVsCodeApi: IVsCodeApi;
  let mockUri: VsCodeUri;
  let mockWorkspaceFolder: VsCodeWorkspaceFolder;
  let mockGetWorkspaceFolder: jest.MockedFunction<
    (uri: VsCodeUri) => VsCodeWorkspaceFolder | undefined
  >;

  beforeEach(() => {
    mockWorkspaceFolder = {
      name: 'test-workspace',
    };

    mockGetWorkspaceFolder = jest.fn().mockReturnValue(mockWorkspaceFolder);

    mockVsCodeApi = {
      languages: {
        onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        getDiagnostics: jest.fn().mockReturnValue([]),
      },
      workspace: {
        getWorkspaceFolder: mockGetWorkspaceFolder,
      },
    };

    mockUri = {
      fsPath: '/path/to/file.ts',
      toString: () => 'file:///path/to/file.ts',
    };

    converter = new DiagnosticConverter(mockVsCodeApi);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Conversion', () => {
    it('should convert basic diagnostic to ProblemItem', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 20 },
        },
        message: 'Test error message',
        severity: 0, // Error
        source: 'typescript',
        code: 'TS2304',
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);

      expect(result).toEqual({
        filePath: '/path/to/file.ts',
        workspaceFolder: 'test-workspace',
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 20 },
        },
        severity: 'Error',
        message: 'Test error message',
        source: 'typescript',
        code: 'TS2304',
      });
    });

    it('should convert diagnostic with minimal required fields', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        },
        message: 'Simple error',
        severity: 1, // Warning
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);

      expect(result).toEqual({
        filePath: '/path/to/file.ts',
        workspaceFolder: 'test-workspace',
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        },
        severity: 'Warning',
        message: 'Simple error',
        source: 'unknown',
        code: undefined,
      });
    });

    it('should handle numeric code values', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 10 },
        },
        message: 'Numeric code error',
        severity: 0,
        source: 'eslint',
        code: 2304,
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);

      expect(result.code).toBe(2304);
      expect(result.source).toBe('eslint');
    });
  });

  describe('Severity Mapping', () => {
    it('should map all VS Code severity levels correctly', () => {
      const severityTests = [
        { vsCodeSeverity: 0, expectedSeverity: 'Error' as ProblemSeverity },
        { vsCodeSeverity: 1, expectedSeverity: 'Warning' as ProblemSeverity },
        { vsCodeSeverity: 2, expectedSeverity: 'Information' as ProblemSeverity },
        { vsCodeSeverity: 3, expectedSeverity: 'Hint' as ProblemSeverity },
      ];

      severityTests.forEach(({ vsCodeSeverity, expectedSeverity }) => {
        const mockDiagnostic: VsCodeDiagnostic = {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
          message: `Test ${expectedSeverity}`,
          severity: vsCodeSeverity,
        };

        const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
        expect(result.severity).toBe(expectedSeverity);
      });
    });

    it('should default to Error for unknown severity values', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: 'Unknown severity',
        severity: 999, // Invalid severity
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      expect(result.severity).toBe('Error');
    });

    it('should handle negative severity values', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: 'Negative severity',
        severity: -1,
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      expect(result.severity).toBe('Error');
    });
  });

  describe('Workspace Folder Resolution', () => {
    it('should resolve workspace folder name correctly', () => {
      const result = converter.convertToProblemItem(createBasicDiagnostic(), mockUri);
      expect(result.workspaceFolder).toBe('test-workspace');
      expect(mockVsCodeApi.workspace.getWorkspaceFolder).toHaveBeenCalledWith(mockUri);
    });

    it('should handle missing workspace folder', () => {
      mockGetWorkspaceFolder.mockReturnValue(undefined);

      const result = converter.convertToProblemItem(createBasicDiagnostic(), mockUri);
      expect(result.workspaceFolder).toBe('unknown');
    });

    it('should handle null workspace folder', () => {
      mockGetWorkspaceFolder.mockReturnValue(null as any);

      const result = converter.convertToProblemItem(createBasicDiagnostic(), mockUri);
      expect(result.workspaceFolder).toBe('unknown');
    });

    it('should handle workspace folder without name', () => {
      mockGetWorkspaceFolder.mockReturnValue({} as VsCodeWorkspaceFolder);

      const result = converter.convertToProblemItem(createBasicDiagnostic(), mockUri);
      expect(result.workspaceFolder).toBe('unknown');
    });
  });

  describe('URI Handling', () => {
    it('should use fsPath when available', () => {
      const result = converter.convertToProblemItem(createBasicDiagnostic(), mockUri);
      expect(result.filePath).toBe('/path/to/file.ts');
    });

    it('should fallback to toString when fsPath is not available', () => {
      const uriWithoutFsPath = {
        toString: () => 'file:///fallback/path.ts',
      } as VsCodeUri;

      const result = converter.convertToProblemItem(createBasicDiagnostic(), uriWithoutFsPath);
      expect(result.filePath).toBe('file:///fallback/path.ts');
    });

    it('should handle empty fsPath', () => {
      const uriWithEmptyFsPath = {
        fsPath: '',
        toString: () => 'file:///empty/path.ts',
      } as VsCodeUri;

      const result = converter.convertToProblemItem(createBasicDiagnostic(), uriWithEmptyFsPath);
      expect(result.filePath).toBe('file:///empty/path.ts');
    });
  });

  describe('Related Information Conversion', () => {
    it('should convert related information when present', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        },
        message: 'Error with related info',
        severity: 0,
        relatedInformation: [
          {
            location: {
              uri: 'file:///related/file.ts',
              range: {
                start: { line: 10, character: 5 },
                end: { line: 10, character: 15 },
              },
            },
            message: 'Related information message',
          },
        ],
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);

      expect(result.relatedInformation).toEqual([
        {
          location: {
            uri: 'file:///related/file.ts',
            range: {
              start: { line: 10, character: 5 },
              end: { line: 10, character: 15 },
            },
          },
          message: 'Related information message',
        },
      ]);
    });

    it('should handle empty related information array', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        },
        message: 'Error with empty related info',
        severity: 0,
        relatedInformation: [],
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      expect(result.relatedInformation).toEqual([]);
    });

    it('should handle missing related information', () => {
      const result = converter.convertToProblemItem(createBasicDiagnostic(), mockUri);
      expect(result.relatedInformation).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle VS Code API errors gracefully', () => {
      mockGetWorkspaceFolder.mockImplementation(() => {
        throw new Error('VS Code API Error');
      });

      expect(() => {
        converter.convertToProblemItem(createBasicDiagnostic(), mockUri);
      }).not.toThrow();
    });

    it('should handle malformed diagnostic objects', () => {
      const malformedDiagnostic = {
        // Missing required fields
        message: 'Malformed diagnostic',
      } as VsCodeDiagnostic;

      expect(() => {
        converter.convertToProblemItem(malformedDiagnostic, mockUri);
      }).not.toThrow();
    });

    it('should handle null/undefined diagnostic properties', () => {
      const diagnosticWithNulls: VsCodeDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        },
        message: 'Test message',
        severity: 0,
        source: null as any,
        relatedInformation: null as any,
        // Note: code property is omitted instead of set to undefined
        // due to exactOptionalPropertyTypes: true
      };

      const result = converter.convertToProblemItem(diagnosticWithNulls, mockUri);
      expect(result.source).toBe('unknown');
      expect(result.code).toBeUndefined();
      expect(result.relatedInformation).toBeUndefined();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very large line numbers', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 999999, character: 0 },
          end: { line: 999999, character: 100 },
        },
        message: 'Large line number',
        severity: 0,
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      expect(result.range.start.line).toBe(999999);
      expect(result.range.end.line).toBe(999999);
    });

    it('should handle zero-length ranges', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 10 },
        },
        message: 'Zero-length range',
        severity: 1,
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      expect(result.range.start).toEqual(result.range.end);
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        },
        message: longMessage,
        severity: 0,
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      expect(result.message).toBe(longMessage);
      expect(result.message.length).toBe(10000);
    });
  });

  // Helper function to create a basic diagnostic for testing
  function createBasicDiagnostic(): VsCodeDiagnostic {
    return {
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 5 },
      },
      message: 'Basic diagnostic',
      severity: 0,
      source: 'test',
    };
  }
});
