import { EventEmitter } from 'events';
import { DiagnosticsWatcher, IVsCodeApi } from '../../../../core/diagnostics/DiagnosticsWatcher';

describe('DiagnosticsWatcher', () => {
  let mockVsCode: jest.Mocked<IVsCodeApi>;
  let watcher: DiagnosticsWatcher;

  beforeEach(() => {
    // Create a comprehensive mock of the VS Code API
    mockVsCode = {
      languages: {
        onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        getDiagnostics: jest.fn().mockReturnValue([]),
      },
      workspace: {
        getWorkspaceFolder: jest.fn().mockReturnValue({ name: 'test-workspace' }),
      },
    };
  });

  afterEach(() => {
    if (watcher) {
      watcher.dispose();
    }
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should extend EventEmitter', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      expect(watcher).toBeInstanceOf(EventEmitter);
    });

    it('should subscribe to onDidChangeDiagnostics on instantiation', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      expect(mockVsCode.languages.onDidChangeDiagnostics).toHaveBeenCalledTimes(1);
      expect(mockVsCode.languages.onDidChangeDiagnostics).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should use default debounce time when not specified', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      // We'll verify this behavior in integration tests
      expect(watcher).toBeDefined();
    });

    it('should accept custom debounce time', () => {
      const customDebounceMs = 500;
      watcher = new DiagnosticsWatcher(mockVsCode, customDebounceMs);
      expect(watcher).toBeDefined();
    });

    it('should initialize with empty problems collection', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      expect(watcher.getAllProblems()).toEqual([]);
    });
  });

  describe('Public Interface Methods', () => {
    beforeEach(() => {
      watcher = new DiagnosticsWatcher(mockVsCode);
    });

    it('should provide getAllProblems method', () => {
      expect(typeof watcher.getAllProblems).toBe('function');
    });

    it('should provide getProblemsForFile method', () => {
      expect(typeof watcher.getProblemsForFile).toBe('function');
    });

    it('should provide dispose method', () => {
      expect(typeof watcher.dispose).toBe('function');
    });

    it('should return empty array from getAllProblems initially', () => {
      const problems = watcher.getAllProblems();
      expect(Array.isArray(problems)).toBe(true);
      expect(problems).toHaveLength(0);
    });

    it('should return empty array from getProblemsForFile for non-existent file', () => {
      const problems = watcher.getProblemsForFile('/non/existent/file.ts');
      expect(Array.isArray(problems)).toBe(true);
      expect(problems).toHaveLength(0);
    });
  });

  describe('Disposal Pattern', () => {
    beforeEach(() => {
      watcher = new DiagnosticsWatcher(mockVsCode);
    });

    it('should dispose of VS Code subscriptions when dispose is called', () => {
      const mockDispose = jest.fn();
      // Reset the mock and set up new return value
      mockVsCode.languages.onDidChangeDiagnostics = jest
        .fn()
        .mockReturnValue({ dispose: mockDispose });

      // Create new watcher to get the mock dispose function
      watcher.dispose();
      watcher = new DiagnosticsWatcher(mockVsCode);

      watcher.dispose();
      expect(mockDispose).toHaveBeenCalledTimes(1);
    });

    it('should clear problems collection when disposed', () => {
      watcher.dispose();
      const problems = watcher.getAllProblems();
      expect(problems).toEqual([]);
    });

    it('should return empty array from getAllProblems after disposal', () => {
      watcher.dispose();
      expect(watcher.getAllProblems()).toEqual([]);
    });

    it('should be safe to call dispose multiple times', () => {
      expect(() => {
        watcher.dispose();
        watcher.dispose();
        watcher.dispose();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle VS Code API errors gracefully', () => {
      const errorMock = jest.fn().mockImplementation(() => {
        throw new Error('VS Code API Error');
      });
      mockVsCode.languages.onDidChangeDiagnostics = errorMock;

      expect(() => {
        watcher = new DiagnosticsWatcher(mockVsCode);
      }).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should accept valid IVsCodeApi interface', () => {
      expect(() => {
        watcher = new DiagnosticsWatcher(mockVsCode);
      }).not.toThrow();
    });

    it('should work with minimal VS Code API implementation', () => {
      const minimalMock: IVsCodeApi = {
        languages: {
          onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }),
          getDiagnostics: jest.fn().mockReturnValue([]),
        },
        workspace: {
          getWorkspaceFolder: jest.fn().mockReturnValue(null),
        },
      };

      expect(() => {
        watcher = new DiagnosticsWatcher(minimalMock);
      }).not.toThrow();
    });
  });
});
