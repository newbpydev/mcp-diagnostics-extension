import { PERFORMANCE_THRESHOLDS } from '../../shared/constants';

/**
 * Configuration options for PerformanceMonitor
 */
export interface PerformanceMonitorConfig {
  enableLogging?: boolean;
  maxMetricsHistory?: number;
  customThresholds?: Record<string, number>;
}

/**
 * Performance statistics for an operation
 */
export interface PerformanceStats {
  count: number;
  average: number;
  min: number;
  max: number;
  total: number;
}

/**
 * Performance summary for all operations
 */
export type PerformanceSummary = Record<string, PerformanceStats>;

/**
 * PerformanceMonitor tracks execution times and provides performance insights
 *
 * This class helps identify performance bottlenecks by measuring function execution times,
 * comparing against thresholds, and providing statistical analysis of performance data.
 *
 * @example
 * ```typescript
 * const monitor = new PerformanceMonitor();
 *
 * const result = monitor.measure('api-call', () => {
 *   return fetchData();
 * });
 *
 * console.log('Average time:', monitor.getAverageTime('api-call'));
 * monitor.dispose();
 * ```
 */
export class PerformanceMonitor {
  private readonly config: Required<PerformanceMonitorConfig>;
  private readonly metrics: Map<string, number[]> = new Map();
  private isDisposed = false;

  /**
   * Creates a new PerformanceMonitor instance
   *
   * @param config - Configuration options for the monitor
   */
  constructor(config: PerformanceMonitorConfig = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? true,
      maxMetricsHistory: config.maxMetricsHistory ?? 100,
      customThresholds: config.customThresholds ?? {},
    };
  }

  /**
   * Measures the execution time of a synchronous function
   *
   * @param operation - Name of the operation being measured
   * @param fn - Function to measure
   * @returns The result of the function execution
   */
  public measure<T>(operation: string, fn: () => T): T {
    if (this.isDisposed) {
      return fn();
    }

    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    }
  }

  /**
   * Measures the execution time of an asynchronous function
   *
   * @param operation - Name of the operation being measured
   * @param fn - Async function to measure
   * @returns Promise resolving to the result of the function execution
   */
  public async measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (this.isDisposed) {
      return fn();
    }

    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    }
  }

  /**
   * Records diagnostic processing time (convenience method)
   *
   * @param fn - Function performing diagnostic processing
   * @returns The result of the function execution
   */
  public recordDiagnosticProcessing<T>(fn: () => T): T {
    return this.measure('diagnostic-processing', fn);
  }

  /**
   * Records MCP response time (convenience method)
   *
   * @param fn - Function performing MCP response
   * @returns The result of the function execution
   */
  public recordMcpResponse<T>(fn: () => T): T {
    return this.measure('mcp-response', fn);
  }

  /**
   * Gets all recorded metrics
   *
   * @returns Object containing all metrics by operation name
   */
  public getMetrics(): Record<string, number[]> {
    if (this.isDisposed) {
      return {};
    }

    const result: Record<string, number[]> = {};
    for (const [operation, times] of this.metrics) {
      result[operation] = [...times];
    }
    return result;
  }

  /**
   * Gets the average execution time for an operation
   *
   * @param operation - Name of the operation
   * @returns Average time in milliseconds, or undefined if no data
   */
  public getAverageTime(operation: string): number | undefined {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) {
      return undefined;
    }

    const sum = times.reduce((acc, time) => acc + time, 0);
    return sum / times.length;
  }

  /**
   * Gets the minimum execution time for an operation
   *
   * @param operation - Name of the operation
   * @returns Minimum time in milliseconds, or undefined if no data
   */
  public getMinTime(operation: string): number | undefined {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) {
      return undefined;
    }

    return Math.min(...times);
  }

  /**
   * Gets the maximum execution time for an operation
   *
   * @param operation - Name of the operation
   * @returns Maximum time in milliseconds, or undefined if no data
   */
  public getMaxTime(operation: string): number | undefined {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) {
      return undefined;
    }

    return Math.max(...times);
  }

  /**
   * Gets a comprehensive performance summary for all operations
   *
   * @returns Performance statistics for each operation
   */
  public getPerformanceSummary(): PerformanceSummary {
    const summary: PerformanceSummary = {};

    for (const [operation, times] of this.metrics) {
      if (times.length > 0) {
        const total = times.reduce((acc, time) => acc + time, 0);
        summary[operation] = {
          count: times.length,
          average: total / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          total,
        };
      }
    }

    return summary;
  }

  /**
   * Disposes of the monitor and clears all metrics
   */
  public dispose(): void {
    this.isDisposed = true;
    this.metrics.clear();
  }

  /**
   * Records a metric and checks against thresholds
   *
   * @param operation - Name of the operation
   * @param duration - Duration in milliseconds
   */
  private recordMetric(operation: string, duration: number): void {
    if (this.isDisposed) {
      return;
    }

    // Get or create metrics array for this operation
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const times = this.metrics.get(operation)!;
    times.push(duration);

    // Enforce maximum history limit
    if (times.length > this.config.maxMetricsHistory) {
      times.shift();
    }

    // Check thresholds and warn if necessary
    this.checkThresholds(operation, duration);
  }

  /**
   * Checks if the duration exceeds thresholds and logs warnings
   *
   * @param operation - Name of the operation
   * @param duration - Duration in milliseconds
   */
  private checkThresholds(operation: string, duration: number): void {
    if (!this.config.enableLogging) {
      return;
    }

    const threshold = this.getThresholdForOperation(operation);
    if (threshold && duration > threshold) {
      console.warn(
        `Performance warning: ${operation} took ${duration}ms (threshold: ${threshold}ms)`
      );
    }
  }

  /**
   * Gets the threshold for a specific operation
   *
   * @param operation - Name of the operation
   * @returns Threshold in milliseconds, or undefined if no threshold
   */
  private getThresholdForOperation(operation: string): number | undefined {
    // Check custom thresholds first
    if (this.config.customThresholds[operation]) {
      return this.config.customThresholds[operation];
    }

    // Check predefined thresholds
    switch (operation) {
      case 'diagnostic-processing':
        return PERFORMANCE_THRESHOLDS.diagnosticProcessingMs;
      case 'mcp-response':
        return PERFORMANCE_THRESHOLDS.mcpResponseMs;
      case 'extension-activation':
        return PERFORMANCE_THRESHOLDS.extensionActivationMs;
      default:
        return undefined;
    }
  }
}
