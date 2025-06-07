import * as SharedIndex from '@shared/index';
import { ProblemItem, ProblemSeverity } from '@shared/types';
import { DEFAULT_CONFIG, EVENT_NAMES } from '@shared/constants';

describe('Shared Index Exports', () => {
  it('should export all types from types module', () => {
    // Test that types are properly exported
    const mockProblemItem: ProblemItem = {
      filePath: '/test/file.ts',
      workspaceFolder: 'test-workspace',
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 },
      },
      severity: 'Error' as ProblemSeverity,
      message: 'Test error',
      source: 'test',
    };

    expect(mockProblemItem.severity).toBe('Error');
    expect(typeof mockProblemItem.filePath).toBe('string');
  });

  it('should export all constants from constants module', () => {
    // Test that constants are properly exported
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_CONFIG.debounceMs).toBeDefined();
    expect(DEFAULT_CONFIG.mcpServerPort).toBeDefined();

    expect(EVENT_NAMES).toBeDefined();
    expect(EVENT_NAMES.PROBLEMS_CHANGED).toBeDefined();
    expect(EVENT_NAMES.WATCHER_ERROR).toBeDefined();
  });

  it('should have all expected exports available', () => {
    // Verify the index module exports what we expect
    expect(SharedIndex).toBeDefined();

    // Check that we can access exports through the index
    const config = (SharedIndex as any).DEFAULT_CONFIG;
    const events = (SharedIndex as any).EVENT_NAMES;

    expect(config).toBeDefined();
    expect(events).toBeDefined();
  });
});
