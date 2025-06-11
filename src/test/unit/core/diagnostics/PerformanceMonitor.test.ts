import { PerformanceMonitor } from '@core/diagnostics/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let consoleSpy: jest.SpyInstance;
  let performanceNowSpy: jest.SpyInstance;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Create a fresh mock for performance.now() in each test
    performanceNowSpy = jest.spyOn(performance, 'now').mockImplementation(() => 0);
  });

  afterEach(() => {
    monitor.dispose();
    consoleSpy.mockRestore();
    performanceNowSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create a new PerformanceMonitor instance', () => {
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('should initialize with empty metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics).toEqual({});
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        enableLogging: false,
        maxMetricsHistory: 50,
      };

      const customMonitor = new PerformanceMonitor(customConfig);
      expect(customMonitor).toBeInstanceOf(PerformanceMonitor);
      customMonitor.dispose();
    });
  });

  describe('Performance Measurement', () => {
    it('should measure synchronous function execution time', () => {
      let callCount = 0;
      const testFunction = () => {
        callCount++;
        return 'test result';
      };

      // Set up mock timing: start at 0, end at 150ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(150);

      const result = monitor.measure('test-operation', testFunction);

      expect(result).toBe('test result');
      expect(callCount).toBe(1);

      const metrics = monitor.getMetrics();
      expect(metrics['test-operation']).toEqual([150]);
    });

    it('should measure async function execution time', async () => {
      const asyncFunction = async () => {
        return Promise.resolve('async result');
      };

      // Set up mock timing: start at 0, end at 250ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(250);

      const result = await monitor.measureAsync('async-operation', asyncFunction);

      expect(result).toBe('async result');

      const metrics = monitor.getMetrics();
      expect(metrics['async-operation']).toEqual([250]);
    });

    it('should handle function exceptions and still record timing', () => {
      const errorFunction = () => {
        throw new Error('Test error');
      };

      // Set up mock timing: start at 0, end at 100ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(100);

      expect(() => {
        monitor.measure('error-operation', errorFunction);
      }).toThrow('Test error');

      const metrics = monitor.getMetrics();
      expect(metrics['error-operation']).toEqual([100]);
    });

    it('should handle async function rejections and still record timing', async () => {
      const rejectFunction = async () => {
        throw new Error('Async error');
      };

      // Set up mock timing: start at 0, end at 200ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(200);

      await expect(monitor.measureAsync('async-error-operation', rejectFunction)).rejects.toThrow(
        'Async error'
      );

      const metrics = monitor.getMetrics();
      expect(metrics['async-error-operation']).toEqual([200]);
    });
  });

  describe('Metrics Collection and Management', () => {
    it('should accumulate multiple measurements for the same operation', () => {
      const testFunction = () => 'result';

      // First measurement: 100ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(100);
      monitor.measure('repeated-operation', testFunction);

      // Second measurement: 150ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(150);
      monitor.measure('repeated-operation', testFunction);

      // Third measurement: 200ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(200);
      monitor.measure('repeated-operation', testFunction);

      const metrics = monitor.getMetrics();
      expect(metrics['repeated-operation']).toEqual([100, 150, 200]);
    });

    it('should track different operations separately', () => {
      const testFunction = () => 'result';

      // Operation A: 100ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(100);
      monitor.measure('operation-a', testFunction);

      // Operation B: 200ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(200);
      monitor.measure('operation-b', testFunction);

      const metrics = monitor.getMetrics();
      expect(metrics['operation-a']).toEqual([100]);
      expect(metrics['operation-b']).toEqual([200]);
    });

    it('should respect maximum metrics history limit', () => {
      const customMonitor = new PerformanceMonitor({ maxMetricsHistory: 2 });
      const testFunction = () => 'result';

      // First measurement: 100ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(100);
      customMonitor.measure('limited-operation', testFunction);

      // Second measurement: 150ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(150);
      customMonitor.measure('limited-operation', testFunction);

      // Third measurement: 200ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(200);
      customMonitor.measure('limited-operation', testFunction);

      const metrics = customMonitor.getMetrics();
      expect(metrics['limited-operation']).toEqual([150, 200]);

      customMonitor.dispose();
    });
  });

  describe('Threshold Monitoring and Warnings', () => {
    it('should warn when diagnostic processing exceeds threshold', () => {
      const slowFunction = () => 'slow result';

      // Simulate slow operation: 600ms (threshold is 500ms)
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(600);

      monitor.measure('diagnostic-processing', slowFunction);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Performance warning: diagnostic-processing took 600ms (threshold: 500ms)'
        )
      );
    });

    it('should warn when MCP response exceeds threshold', () => {
      const slowFunction = () => 'slow mcp result';

      // Simulate slow MCP operation: 150ms (threshold is 100ms)
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(150);

      monitor.measure('mcp-response', slowFunction);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance warning: mcp-response took 150ms (threshold: 100ms)')
      );
    });

    it('should warn when extension activation exceeds threshold', () => {
      const slowFunction = () => 'slow activation';

      // Simulate slow activation: 2500ms (threshold is 2000ms)
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(2500);

      monitor.measure('extension-activation', slowFunction);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Performance warning: extension-activation took 2500ms (threshold: 2000ms)'
        )
      );
    });

    it('should not warn when operations are within thresholds', () => {
      const fastFunction = () => 'fast result';

      // Fast diagnostic processing: 200ms (under 500ms threshold)
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(200);
      monitor.measure('diagnostic-processing', fastFunction);

      // Fast MCP response: 50ms (under 100ms threshold)
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(50);
      monitor.measure('mcp-response', fastFunction);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should respect custom threshold configuration', () => {
      const customMonitor = new PerformanceMonitor({
        customThresholds: {
          'custom-operation': 300,
        },
      });

      const testFunction = () => 'result';

      // Operation exceeds custom threshold: 400ms > 300ms
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(400);

      customMonitor.measure('custom-operation', testFunction);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Performance warning: custom-operation took 400ms (threshold: 300ms)'
        )
      );

      customMonitor.dispose();
    });

    it('should disable warnings when logging is disabled', () => {
      const quietMonitor = new PerformanceMonitor({ enableLogging: false });
      const slowFunction = () => 'slow result';

      // Slow operation that would normally trigger warning
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(600);

      quietMonitor.measure('diagnostic-processing', slowFunction);

      expect(consoleSpy).not.toHaveBeenCalled();

      quietMonitor.dispose();
    });
  });

  describe('Statistics and Analysis', () => {
    beforeEach(() => {
      const testFunction = () => 'result';

      // Add sample measurements: 100ms, 200ms, 300ms, 400ms, 500ms
      const measurements = [100, 200, 300, 400, 500];
      measurements.forEach((duration) => {
        performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(duration);
        monitor.measure('sample-operation', testFunction);
      });
    });

    it('should calculate average execution time', () => {
      const average = monitor.getAverageTime('sample-operation');
      expect(average).toBe(300); // (100+200+300+400+500)/5 = 300
    });

    it('should calculate minimum execution time', () => {
      const minimum = monitor.getMinTime('sample-operation');
      expect(minimum).toBe(100);
    });

    it('should calculate maximum execution time', () => {
      const maximum = monitor.getMaxTime('sample-operation');
      expect(maximum).toBe(500);
    });

    it('should return undefined for non-existent operations', () => {
      expect(monitor.getAverageTime('non-existent')).toBeUndefined();
      expect(monitor.getMinTime('non-existent')).toBeUndefined();
      expect(monitor.getMaxTime('non-existent')).toBeUndefined();
    });

    it('should provide comprehensive performance summary', () => {
      const summary = monitor.getPerformanceSummary();

      expect(summary).toEqual({
        'sample-operation': {
          count: 5,
          average: 300,
          min: 100,
          max: 500,
          total: 1500,
        },
      });
    });
  });

  describe('Memory Management and Disposal', () => {
    it('should clear all metrics on disposal', () => {
      const testFunction = () => 'result';

      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(100);
      monitor.measure('test-operation', testFunction);

      expect(monitor.getMetrics()['test-operation']).toEqual([100]);

      monitor.dispose();

      expect(monitor.getMetrics()).toEqual({});
    });

    it('should be safe to call dispose multiple times', () => {
      expect(() => {
        monitor.dispose();
        monitor.dispose();
        monitor.dispose();
      }).not.toThrow();
    });

    it('should handle operations gracefully after disposal', () => {
      monitor.dispose();

      const testFunction = () => 'result';

      expect(() => {
        monitor.measure('post-disposal', testFunction);
      }).not.toThrow();

      expect(monitor.getMetrics()).toEqual({});
    });
  });

  describe('Integration with DiagnosticsWatcher', () => {
    it('should provide method to record diagnostic processing time', () => {
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(250);

      monitor.recordDiagnosticProcessing(() => {
        // Simulate diagnostic processing
        return 'processed';
      });

      const metrics = monitor.getMetrics();
      expect(metrics['diagnostic-processing']).toEqual([250]);
    });

    it('should provide method to record MCP response time', () => {
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(75);

      monitor.recordMcpResponse(() => {
        // Simulate MCP response
        return { problems: [] };
      });

      const metrics = monitor.getMetrics();
      expect(metrics['mcp-response']).toEqual([75]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle operations when disposed', () => {
      const monitor = new PerformanceMonitor();
      monitor.dispose();

      // These should trigger the early return paths (line 94)
      const result = monitor.measureAsync('test-operation', async () => {
        return 'test-result';
      });

      // Should return the function result without measuring
      expect(result).resolves.toBe('test-result');
    });

    it('should handle unknown operation thresholds', () => {
      const monitor = new PerformanceMonitor({ enableLogging: true });

      // Mock console.warn to capture warnings
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock performance.now to simulate a slow operation
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(1000); // 1000ms duration

      // This should trigger the default case in getThresholdForOperation (line 229)
      monitor.measure('completely-unknown-operation', () => {
        // Simulate a slow operation that would exceed any threshold
        return 'result';
      });

      // Since there's no threshold for 'completely-unknown-operation', no warning should be logged
      // This ensures the default case returns undefined (line 229)
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle custom thresholds for unknown operations', () => {
      const monitor = new PerformanceMonitor({
        enableLogging: true,
        customThresholds: {
          'custom-operation': 10, // 10ms threshold
        },
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock performance.now to simulate a slow operation
      performanceNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(50); // 50ms duration

      // Simulate a slow operation that exceeds the custom threshold
      monitor.measure('custom-operation', () => {
        return 'slow-result';
      });

      // Should log a warning for exceeding custom threshold
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance warning: custom-operation took 50ms (threshold: 10ms)')
      );

      consoleSpy.mockRestore();
    });

    it('should handle predefined operation thresholds', () => {
      const monitor = new PerformanceMonitor({ enableLogging: true });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Test each predefined threshold case
      const operations = ['diagnostic-processing', 'mcp-response', 'extension-activation'];

      operations.forEach((operation) => {
        monitor.measure(operation, () => {
          // Simulate a fast operation that won't trigger warnings
          return 'result';
        });
      });

      // No warnings should be logged for fast operations
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle disabled logging', () => {
      const monitor = new PerformanceMonitor({ enableLogging: false });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Even with a slow operation, no warning should be logged when logging is disabled
      monitor.measure('diagnostic-processing', () => {
        // Simulate a slow operation
        const originalNow = performance.now;
        let callCount = 0;
        performance.now = jest.fn(() => {
          callCount++;
          return callCount === 1 ? 0 : 1000; // 1000ms duration (very slow)
        });

        const result = 'slow-result';
        performance.now = originalNow;
        return result;
      });

      // No warning should be logged when logging is disabled
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
