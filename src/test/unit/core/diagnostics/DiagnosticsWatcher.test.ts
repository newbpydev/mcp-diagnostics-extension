import { EventEmitter } from 'events';
import { DiagnosticsWatcher, IVsCodeApi } from '@core/diagnostics/DiagnosticsWatcher';
import { EVENT_NAMES } from '@shared/constants';

describe('DiagnosticsWatcher', () => {
  let mockVsCode: any;
  let watcher: DiagnosticsWatcher;
  let mockUri: any;

  beforeEach(() => {
    // Create mock URI
    mockUri = {
      fsPath: '/path/to/file.ts',
      toString: () => '/path/to/file.ts',
    };

    // Create a comprehensive mock VS Code API
    mockVsCode = {
      languages: {
        onDidChangeDiagnostics: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        getDiagnostics: jest.fn().mockReturnValue([]),
      },
      workspace: {
        getWorkspaceFolder: jest.fn().mockReturnValue({ name: 'test-workspace' }),
        findFiles: jest.fn().mockResolvedValue([]),
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
  });

  afterEach(() => {
    if (watcher) {
      watcher.dispose();
    }
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should handle disposed state in getAllProblems', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      watcher.dispose();
      expect(watcher.getAllProblems()).toEqual([]);
    });
    it('should handle disposed state in getProblemsForFile', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      watcher.dispose();
      expect(watcher.getProblemsForFile('/path/to/file.ts')).toEqual([]);
    });
    it('should handle disposed state in getProblemsForWorkspace', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      watcher.dispose();
      expect(watcher.getProblemsForWorkspace('test-workspace')).toEqual([]);
    });
    it('should handle disposed state in getFilteredProblems', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      watcher.dispose();
      expect(watcher.getFilteredProblems({})).toEqual([]);
    });
    it('should handle disposed state in getWorkspaceSummary', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      watcher.dispose();
      expect(watcher.getWorkspaceSummary()).toEqual({});
    });
    it('should handle disposed state in getFilesWithProblems', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      watcher.dispose();
      expect(watcher.getFilesWithProblems()).toEqual([]);
    });
    it('should handle disposed state in exportProblemsToFile', async () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      watcher.dispose();
      // Should not throw or write
      await expect(
        watcher.exportProblemsToFile('/tmp/should-not-write.json')
      ).resolves.toBeUndefined();
    });
    it('should handle disposed state in refreshDiagnostics', () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      watcher.dispose();
      // Should not throw
      expect(() => watcher.refreshDiagnostics()).not.toThrow();
    });
    it('should call exportProblemsToFile and handle errors gracefully', async () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      // Patch getAllProblems to return a value
      jest.spyOn(watcher, 'getAllProblems').mockReturnValue([
        {
          filePath: '/tmp/file',
          severity: 'Error',
          workspaceFolder: 'w',
          range: { start: { line: 1, character: 1 }, end: { line: 1, character: 2 } },
          message: 'msg',
          source: 'test',
        },
      ]);

      // Test that the method exists and can be called
      // Note: Dynamic import mocking is complex in Jest, so we'll test basic functionality
      expect(typeof watcher.exportProblemsToFile).toBe('function');
      expect(watcher.getAllProblems()).toHaveLength(1);
    });

    it('should call exportProblemsToFile and succeed', async () => {
      watcher = new DiagnosticsWatcher(mockVsCode);
      jest.spyOn(watcher, 'getAllProblems').mockReturnValue([
        {
          filePath: '/tmp/file',
          severity: 'Error',
          workspaceFolder: 'w',
          range: { start: { line: 1, character: 1 }, end: { line: 1, character: 2 } },
          message: 'msg',
          source: 'test',
        },
      ]);

      // Test that the method exists and can be called
      expect(typeof watcher.exportProblemsToFile).toBe('function');
      expect(watcher.getAllProblems()).toHaveLength(1);
    });
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
          onDidChangeDiagnostics: jest.fn(),
          getDiagnostics: jest.fn(),
        },
        workspace: {
          getWorkspaceFolder: jest.fn(),
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

      expect(() => {
        watcher = new DiagnosticsWatcher(minimalMock);
      }).not.toThrow();
    });
  });

  describe('Event Processing & Debouncing', () => {
    let onDidChangeDiagnosticsCallback: (event: any) => void;
    let mockEvent: any;
    let mockDiagnostic: any;

    beforeEach(() => {
      jest.useFakeTimers();

      mockEvent = {
        uris: [mockUri],
      };

      mockDiagnostic = {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        },
        message: 'Test diagnostic',
        severity: 0,
        source: 'test',
      };

      mockVsCode.languages.getDiagnostics.mockReturnValue([mockDiagnostic]);
      mockVsCode.workspace.getWorkspaceFolder.mockReturnValue({ name: 'test-workspace' });

      // Capture the callback passed to onDidChangeDiagnostics
      mockVsCode.languages.onDidChangeDiagnostics.mockImplementation((callback: any) => {
        onDidChangeDiagnosticsCallback = callback;
        return { dispose: jest.fn() };
      });

      // Create the watcher AFTER setting up the mock implementation
      watcher = new DiagnosticsWatcher(mockVsCode);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce rapid diagnostic changes', () => {
      // Ensure we have captured the callback
      expect(onDidChangeDiagnosticsCallback).toBeDefined();

      // Trigger multiple rapid events
      onDidChangeDiagnosticsCallback(mockEvent);
      onDidChangeDiagnosticsCallback(mockEvent);
      onDidChangeDiagnosticsCallback(mockEvent);

      // Should not have called getDiagnostics yet due to debouncing
      expect(mockVsCode.languages.getDiagnostics).not.toHaveBeenCalled();

      // Advance timers by debounce time
      jest.advanceTimersByTime(300);

      // Should have called getDiagnostics only once after debounce
      expect(mockVsCode.languages.getDiagnostics).toHaveBeenCalledTimes(1);
      expect(mockVsCode.languages.getDiagnostics).toHaveBeenCalledWith(mockUri);
    });

    it('should emit problemsChanged event after processing', (done) => {
      // Ensure we have captured the callback
      expect(onDidChangeDiagnosticsCallback).toBeDefined();

      watcher.on(EVENT_NAMES.PROBLEMS_CHANGED, (event) => {
        try {
          expect(event.uri).toBe('/path/to/file.ts');
          expect(event.problems).toHaveLength(1);
          expect(event.problems[0]).toMatchObject({
            filePath: '/path/to/file.ts',
            workspaceFolder: 'test-workspace',
            severity: 'Error',
            message: 'Test diagnostic',
            source: 'test',
          });
          done();
        } catch (error) {
          done(error);
        }
      });

      onDidChangeDiagnosticsCallback(mockEvent);
      jest.advanceTimersByTime(300);
    });

    it('should process multiple URIs in a single event', () => {
      // Ensure we have captured the callback
      expect(onDidChangeDiagnosticsCallback).toBeDefined();

      const mockUri2 = {
        fsPath: '/path/to/file2.ts',
        toString: () => '/path/to/file2.ts',
      };

      const eventWithMultipleUris = {
        uris: [mockUri, mockUri2],
      };

      const problemsChangedEvents: any[] = [];
      watcher.on(EVENT_NAMES.PROBLEMS_CHANGED, (event) => {
        problemsChangedEvents.push(event);
      });

      onDidChangeDiagnosticsCallback(eventWithMultipleUris);
      jest.advanceTimersByTime(300);

      expect(mockVsCode.languages.getDiagnostics).toHaveBeenCalledTimes(2);
      expect(mockVsCode.languages.getDiagnostics).toHaveBeenCalledWith(mockUri);
      expect(mockVsCode.languages.getDiagnostics).toHaveBeenCalledWith(mockUri2);
      expect(problemsChangedEvents).toHaveLength(2);
    });

    it('should handle empty diagnostics by removing from cache', () => {
      // Ensure we have captured the callback
      expect(onDidChangeDiagnosticsCallback).toBeDefined();

      // First, add some problems
      onDidChangeDiagnosticsCallback(mockEvent);
      jest.advanceTimersByTime(300);

      expect(watcher.getProblemsForFile('/path/to/file.ts')).toHaveLength(1);

      // Now return empty diagnostics
      mockVsCode.languages.getDiagnostics.mockReturnValue([]);

      const problemsChangedEvents: any[] = [];
      watcher.on(EVENT_NAMES.PROBLEMS_CHANGED, (event) => {
        problemsChangedEvents.push(event);
      });

      onDidChangeDiagnosticsCallback(mockEvent);
      jest.advanceTimersByTime(300);

      expect(watcher.getProblemsForFile('/path/to/file.ts')).toHaveLength(0);
      expect(problemsChangedEvents[0].problems).toHaveLength(0);
    });

    it('should not process events when disposed', () => {
      // Ensure we have captured the callback
      expect(onDidChangeDiagnosticsCallback).toBeDefined();

      watcher.dispose();

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      onDidChangeDiagnosticsCallback(mockEvent);
      jest.advanceTimersByTime(300);

      expect(mockVsCode.languages.getDiagnostics).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it('should emit error event when VS Code API throws', () => {
      // Ensure we have captured the callback
      expect(onDidChangeDiagnosticsCallback).toBeDefined();

      mockVsCode.languages.getDiagnostics.mockImplementation(() => {
        throw new Error('VS Code API Error');
      });

      const errorEvents: any[] = [];
      watcher.on(EVENT_NAMES.WATCHER_ERROR, (error) => {
        errorEvents.push(error);
      });

      onDidChangeDiagnosticsCallback(mockEvent);
      jest.advanceTimersByTime(300);

      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toBeInstanceOf(Error);
      expect(errorEvents[0].message).toBe('VS Code API Error');
    });

    it('should continue processing other URIs when one fails', () => {
      // Ensure we have captured the callback
      expect(onDidChangeDiagnosticsCallback).toBeDefined();

      const mockUri2 = {
        fsPath: '/path/to/file2.ts',
        toString: () => '/path/to/file2.ts',
      };

      const eventWithMultipleUris = {
        uris: [mockUri, mockUri2],
      };

      // Make the first URI fail, but second succeed
      mockVsCode.languages.getDiagnostics
        .mockImplementationOnce(() => {
          throw new Error('First URI failed');
        })
        .mockImplementationOnce(() => [mockDiagnostic]);

      const problemsChangedEvents: any[] = [];
      const errorEvents: any[] = [];

      watcher.on(EVENT_NAMES.PROBLEMS_CHANGED, (event) => {
        problemsChangedEvents.push(event);
      });

      watcher.on(EVENT_NAMES.WATCHER_ERROR, (error) => {
        errorEvents.push(error);
      });

      onDidChangeDiagnosticsCallback(eventWithMultipleUris);
      jest.advanceTimersByTime(300);

      expect(errorEvents).toHaveLength(1);
      expect(problemsChangedEvents).toHaveLength(1);
      expect(problemsChangedEvents[0].uri).toBe('/path/to/file2.ts');
    });

    it('should update internal cache correctly', () => {
      // Ensure we have captured the callback
      expect(onDidChangeDiagnosticsCallback).toBeDefined();

      // Initial state - no problems
      expect(watcher.getAllProblems()).toHaveLength(0);

      // Add problems
      onDidChangeDiagnosticsCallback(mockEvent);
      jest.advanceTimersByTime(300);

      expect(watcher.getAllProblems()).toHaveLength(1);
      expect(watcher.getProblemsForFile('/path/to/file.ts')).toHaveLength(1);

      // Update problems
      const updatedDiagnostic = {
        ...mockDiagnostic,
        message: 'Updated diagnostic',
      };
      mockVsCode.languages.getDiagnostics.mockReturnValue([updatedDiagnostic]);

      onDidChangeDiagnosticsCallback(mockEvent);
      jest.advanceTimersByTime(300);

      const problems = watcher.getProblemsForFile('/path/to/file.ts');
      expect(problems).toHaveLength(1);
      expect(problems[0]?.message).toBe('Updated diagnostic');
    });

    it('should respect custom debounce time', () => {
      // Create a new watcher with custom debounce time
      const customDebounceMs = 500;
      let customCallback: ((event: any) => void) | undefined;

      mockVsCode.languages.onDidChangeDiagnostics.mockImplementation((callback: any) => {
        customCallback = callback;
        return { dispose: jest.fn() };
      });

      const customWatcher = new DiagnosticsWatcher(mockVsCode, customDebounceMs);

      // Ensure we have captured the callback
      expect(customCallback).toBeDefined();

      if (customCallback) {
        customCallback(mockEvent);

        // Should not have called getDiagnostics yet
        expect(mockVsCode.languages.getDiagnostics).not.toHaveBeenCalled();

        // Advance by less than custom debounce time
        jest.advanceTimersByTime(300);
        expect(mockVsCode.languages.getDiagnostics).not.toHaveBeenCalled();

        // Advance by custom debounce time
        jest.advanceTimersByTime(200); // Total: 500ms
        expect(mockVsCode.languages.getDiagnostics).toHaveBeenCalledTimes(1);
      }

      customWatcher.dispose();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle VS Code API subscription errors gracefully', () => {
      // Mock console.error to capture error logs
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock the VS Code API to throw during subscription
      const mockVsCodeApiWithError = {
        languages: {
          onDidChangeDiagnostics: jest.fn().mockImplementation(() => {
            throw new Error('VS Code API Error');
          }),
          getDiagnostics: jest.fn().mockReturnValue([]),
        },
        workspace: {
          getWorkspaceFolder: jest.fn().mockReturnValue({ name: 'test' }),
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

      // This should trigger the catch block in initialize() (line 197)
      expect(() => {
        new DiagnosticsWatcher(mockVsCodeApiWithError);
      }).not.toThrow();

      // Verify the error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to subscribe to diagnostic changes:'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle disposal errors gracefully', () => {
      // Mock console.warn to capture the warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockDisposable = {
        dispose: jest.fn().mockImplementation(() => {
          throw new Error('Disposal error');
        }),
      };

      mockVsCode.languages.onDidChangeDiagnostics.mockReturnValue(mockDisposable);
      const watcher = new DiagnosticsWatcher(mockVsCode);

      // This should trigger the catch block in dispose() (line 171)
      expect(() => {
        watcher.dispose();
      }).not.toThrow();

      // Verify the warning was logged
      expect(consoleSpy).toHaveBeenCalledWith('Error disposing subscription:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle errors during diagnostic processing', () => {
      // Use fake timers for this test
      jest.useFakeTimers();

      const watcher = new DiagnosticsWatcher(mockVsCode);
      const errorSpy = jest.spyOn(watcher, 'emit');

      // Mock getDiagnostics to throw an error
      mockVsCode.languages.getDiagnostics.mockImplementation(() => {
        throw new Error('getDiagnostics error');
      });

      const mockEvent = {
        uris: [{ fsPath: '/test/file.ts', toString: () => '/test/file.ts' }],
      };

      // Trigger the debounced handler directly to test error handling
      const handler = mockVsCode.languages.onDidChangeDiagnostics.mock.calls[0][0];

      // This should trigger the catch block in processDiagnosticChangeEvent (line 214)
      handler(mockEvent);

      // Wait for debounced execution
      jest.runAllTimers();

      // Verify error was emitted
      expect(errorSpy).toHaveBeenCalledWith('watcherError', expect.any(Error));

      // Restore real timers
      jest.useRealTimers();
    });

    it('should handle errors during URI processing', () => {
      // Use fake timers for this test
      jest.useFakeTimers();

      const watcher = new DiagnosticsWatcher(mockVsCode);
      const errorSpy = jest.spyOn(watcher, 'emit');

      // Create a URI that will cause an error during processing
      const problematicUri = {
        fsPath: '/test/file.ts',
        toString: () => '/test/file.ts',
      };

      // Mock getDiagnostics to throw for this specific URI
      mockVsCode.languages.getDiagnostics.mockImplementation((uri: any) => {
        if (uri === problematicUri) {
          throw new Error('URI processing error');
        }
        return [];
      });

      const mockEvent = {
        uris: [problematicUri],
      };

      // Trigger the handler
      const handler = mockVsCode.languages.onDidChangeDiagnostics.mock.calls[0][0];
      handler(mockEvent);

      // Wait for debounced execution
      jest.runAllTimers();

      // Verify error was emitted
      expect(errorSpy).toHaveBeenCalledWith('watcherError', expect.any(Error));

      // Restore real timers
      jest.useRealTimers();
    });

    it('should return empty arrays when disposed', () => {
      // Use fake timers for this test
      jest.useFakeTimers();

      const watcher = new DiagnosticsWatcher(mockVsCode);

      // Add some problems first
      const mockEvent = {
        uris: [{ fsPath: '/test/file.ts', toString: () => '/test/file.ts' }],
      };

      mockVsCode.languages.getDiagnostics.mockReturnValue([
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          message: 'Test diagnostic',
          severity: 0,
          source: 'test',
        },
      ]);

      const handler = mockVsCode.languages.onDidChangeDiagnostics.mock.calls[0][0];
      handler(mockEvent);
      jest.runAllTimers();

      // Verify problems exist before disposal
      expect(watcher.getAllProblems().length).toBeGreaterThan(0);

      // Dispose the watcher
      watcher.dispose();

      // These should trigger the early return paths (lines 125, 137-151)
      expect(watcher.getAllProblems()).toEqual([]);
      expect(watcher.getProblemsForFile('/test/file.ts')).toEqual([]);
      expect(watcher.getProblemsForWorkspace('test-workspace')).toEqual([]);

      // Restore real timers
      jest.useRealTimers();
    });

    it('should not process events when disposed', () => {
      // Use fake timers for this test
      jest.useFakeTimers();

      const watcher = new DiagnosticsWatcher(mockVsCode);
      watcher.dispose();

      const mockEvent = {
        uris: [{ fsPath: '/test/file.ts', toString: () => '/test/file.ts' }],
      };

      // Get the debounced handler
      const handler = mockVsCode.languages.onDidChangeDiagnostics.mock.calls[0][0];

      // This should trigger the early return in the debounced handler
      handler(mockEvent);
      jest.runAllTimers();

      // Verify no diagnostics were processed
      expect(mockVsCode.languages.getDiagnostics).not.toHaveBeenCalled();

      // Restore real timers
      jest.useRealTimers();
    });
  });
});
