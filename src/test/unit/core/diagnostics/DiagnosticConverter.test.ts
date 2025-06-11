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
        findFiles: jest.fn().mockResolvedValue([]),
        openTextDocument: jest.fn().mockResolvedValue({}),
      },
      commands: {
        executeCommand: jest.fn(),
      },
      window: {
        showTextDocument: jest.fn().mockResolvedValue({}),
      },
      Uri: {
        file: jest.fn().mockReturnValue({ fsPath: '', toString: () => '' }),
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

    it('should handle related information with partial location data', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        message: 'Error with partial location data',
        severity: 0,
        relatedInformation: [
          {
            location: {
              // Missing range
              uri: 'file:///partial/location.ts',
            },
            message: 'Partial location data',
          },
        ],
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      expect(result.relatedInformation?.[0]?.location.range).toEqual({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      });
    });

    it('should handle related information with null/undefined values', () => {
      const mockDiagnostic: any = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        message: 'Error with null values',
        severity: 0,
        relatedInformation: [
          {
            location: {
              uri: null,
              range: {
                start: null,
                end: null,
              },
            },
            message: null,
          },
        ],
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      expect(result.relatedInformation?.[0]).toEqual({
        location: {
          uri: 'unknown',
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
          },
        },
        message: 'No message',
      });
    });

    it('should handle related information with invalid range values', () => {
      const mockDiagnostic: any = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        message: 'Error with invalid range',
        severity: 0,
        relatedInformation: [
          {
            location: {
              uri: 'file:///invalid/range.ts',
              range: {
                start: { line: 'not a number' as any, character: 'x' as any },
                end: { line: null, character: 'y' as any },
              },
            },
            message: 'Invalid range values',
          },
        ],
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      expect(result.relatedInformation?.[0]?.location.range).toEqual({
        start: { line: 'not a number', character: 'x' },
        end: { line: 0, character: 'y' },
      });
    });

    it('should handle related information with complex code objects', () => {
      const mockDiagnostic: any = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        message: 'Error with complex code',
        severity: 0,
        code: {
          value: 1234,
          target: { name: 'TestTarget' },
        },
        relatedInformation: [
          {
            location: {
              uri: 'file:///complex/code.ts',
              range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
            },
            message: 'Complex code object',
          },
        ],
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      expect(result.code).toBe(1234); // Should use the value property
      expect(result.relatedInformation?.[0]?.message).toBe('Complex code object');
    });

    it('should handle exceptions during related information conversion', () => {
      // Create an array with an object that will cause an exception when mapped
      const malformedRelatedInfo = [
        {
          // This will cause TypeError when accessing properties
          location: Object.create(null),
          message: undefined,
        },
        // Add a Symbol which will cause serialization issues
        Symbol('unserializable'),
      ];

      const mockDiagnostic: any = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        message: 'Error with malformed related info',
        severity: 0,
        relatedInformation: malformedRelatedInfo,
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);
      // The catch block should cause the relatedInformation to be undefined
      expect(result.relatedInformation).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle null or undefined range values', () => {
      const mockDiagnostic: any = {
        range: null, // This will exercise the range?.start?.line ?? 0 path
        message: 'Diagnostic with null range',
        severity: 1,
        source: 'test',
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);

      // Should use fallback values for range
      expect(result.range).toEqual({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      });
    });

    it('should handle partial range objects', () => {
      const mockDiagnostic: any = {
        range: {
          start: { line: undefined, character: null },
          end: {},
        },
        message: 'Diagnostic with partial range',
        severity: 1,
        source: 'test',
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);

      // Should use fallback values for undefined/null properties
      expect(result.range).toEqual({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      });
    });

    it('should handle conversion errors gracefully and return fallback ProblemItem', () => {
      // Test the workspace folder error handling path
      mockGetWorkspaceFolder.mockImplementation(() => {
        throw new Error('Workspace API error');
      });

      const result = converter.convertToProblemItem(createBasicDiagnostic(), mockUri);

      // The workspace error should be caught and handled gracefully
      expect(result.workspaceFolder).toBe('unknown');
      expect(result.filePath).toBe('/path/to/file.ts');
      expect(result.severity).toBe('Error');
    });

    it('should handle related information conversion errors gracefully', () => {
      // Create diagnostic with malformed related information that will cause conversion error
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        message: 'Test error',
        severity: 0,
        source: 'test',
        relatedInformation: [
          // Create an object that will cause an error during property access
          Object.create(null, {
            location: {
              get() {
                throw new Error('Property access error');
              },
            },
          }),
        ],
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);

      // Should handle the error and return undefined for relatedInformation
      expect(result.relatedInformation).toBeUndefined();
      expect(result.message).toBe('Test error');
      expect(result.severity).toBe('Error');
    });

    it('should handle completely malformed related information', () => {
      const mockDiagnostic: VsCodeDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        message: 'Test error',
        severity: 0,
        source: 'test',
        relatedInformation: [
          // Create an object that throws during iteration/mapping
          new Proxy(
            {},
            {
              get() {
                throw new Error('Proxy access error');
              },
            }
          ),
        ],
      };

      const result = converter.convertToProblemItem(mockDiagnostic, mockUri);

      // Should handle the error gracefully
      expect(result.relatedInformation).toBeUndefined();
    });

    it('should handle main conversion errors and return fallback object', () => {
      // Create a diagnostic object that will cause an error during the main conversion
      const malformedDiagnostic = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === 'message') {
              return 'Test message';
            }
            // Throw error for any other property access to trigger main catch block
            throw new Error('Main conversion error');
          },
        }
      ) as VsCodeDiagnostic;

      const result = converter.convertToProblemItem(malformedDiagnostic, mockUri);

      // Should return the fallback object from the main catch block (line 53)
      expect(result.workspaceFolder).toBe('unknown');
      expect(result.range.start.line).toBe(0);
      expect(result.range.start.character).toBe(0);
      expect(result.range.end.line).toBe(0);
      expect(result.range.end.character).toBe(0);
      expect(result.severity).toBe('Error');
      expect(result.source).toBe('unknown');
      expect(result.message).toBe('Test message');
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
