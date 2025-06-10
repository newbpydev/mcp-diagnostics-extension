import { EventEmitter } from 'events';
import { ProblemItem, DiagnosticsChangeEvent } from '../../shared/types';
import { DEFAULT_CONFIG, EVENT_NAMES } from '../../shared/constants';
import { DiagnosticConverter } from './DiagnosticConverter';
import { PerformanceMonitor, PerformanceSummary } from './PerformanceMonitor';

/**
 * Simple debounce implementation to avoid external dependencies
 *
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: NodeJS.Timeout | undefined;

  return (...args: Parameters<F>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = undefined;
      func(...args);
    }, wait);
  };
}

/**
 * VS Code diagnostic change event interface
 */
export interface DiagnosticChangeEvent {
  uris: readonly unknown[];
}

/**
 * VS Code diagnostic interface
 */
export interface VsCodeDiagnostic {
  range?: {
    start?: { line?: number; character?: number };
    end?: { line?: number; character?: number };
  };
  message: string;
  severity: number;
  source?: string | null;
  code?: string | number;
  relatedInformation?: unknown[] | null;
}

/**
 * VS Code URI interface
 */
export interface VsCodeUri {
  fsPath: string;
  toString(): string;
}

/**
 * VS Code workspace folder interface
 */
export interface VsCodeWorkspaceFolder {
  name?: string;
}

/**
 * Interface for VS Code API dependency injection
 * This allows us to mock the VS Code API for testing
 */
export interface IVsCodeApi {
  languages: {
    onDidChangeDiagnostics(listener: (e: DiagnosticChangeEvent) => void): { dispose(): void };
    getDiagnostics(uri?: VsCodeUri): VsCodeDiagnostic[];
  };
  workspace: {
    getWorkspaceFolder(uri: VsCodeUri): VsCodeWorkspaceFolder | undefined;
  };
}

/**
 * DiagnosticsWatcher monitors VS Code diagnostic changes and converts them to ProblemItems
 *
 * This class follows the EventEmitter pattern to notify other components about diagnostic changes.
 * It implements proper resource management with disposal patterns to prevent memory leaks.
 *
 * @example
 * ```typescript
 * const watcher = new DiagnosticsWatcher(vscode);
 * watcher.on('problemsChanged', (event) => {
 *   console.log('Problems changed:', event.problems);
 * });
 *
 * // Later, clean up
 * watcher.dispose();
 * ```
 */
export class DiagnosticsWatcher extends EventEmitter {
  private readonly vsCodeApi: IVsCodeApi;
  private readonly problemsByUri: Map<string, ProblemItem[]> = new Map();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly converter: DiagnosticConverter;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly debounceMs: number;
  private isDisposed = false;

  /**
   * Creates a new DiagnosticsWatcher instance
   *
   * @param vsCodeApi - The VS Code API interface for dependency injection
   * @param debounceMs - Debounce time in milliseconds for diagnostic change events
   */
  constructor(vsCodeApi: IVsCodeApi, debounceMs: number = DEFAULT_CONFIG.debounceMs) {
    super();
    this.vsCodeApi = vsCodeApi;
    this.debounceMs = debounceMs;
    this.converter = new DiagnosticConverter(vsCodeApi);
    this.performanceMonitor = new PerformanceMonitor();
    this.initialize();
  }

  /**
   * Gets all problems across all files
   *
   * @returns Array of all ProblemItems, or empty array if disposed
   */
  public getAllProblems(): ProblemItem[] {
    if (this.isDisposed) {
      return [];
    }

    const allProblems: ProblemItem[] = [];
    for (const problems of this.problemsByUri.values()) {
      allProblems.push(...problems);
    }
    return allProblems;
  }

  /**
   * Gets problems for a specific file
   *
   * @param filePath - The file path to get problems for
   * @returns Array of ProblemItems for the specified file
   */
  public getProblemsForFile(filePath: string): ProblemItem[] {
    if (this.isDisposed) {
      return [];
    }
    return this.problemsByUri.get(filePath) || [];
  }

  /**
   * Gets problems for a specific workspace
   *
   * @param workspaceName - The workspace name to filter by
   * @returns Array of ProblemItems for the specified workspace
   */
  public getProblemsForWorkspace(workspaceName: string): ProblemItem[] {
    if (this.isDisposed) {
      return [];
    }

    const allProblems = this.getAllProblems();
    return allProblems.filter((problem) => problem.workspaceFolder === workspaceName);
  }

  /**
   * Gets performance metrics for diagnostic processing
   *
   * @returns Performance summary including timing statistics
   */
  public getPerformanceMetrics(): PerformanceSummary {
    return this.performanceMonitor.getPerformanceSummary();
  }

  /**
   * Exports current problems to a JSON file for external MCP server access
   *
   * @param filePath - Path to export the problems to
   */
  public async exportProblemsToFile(filePath: string): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    try {
      const fs = await import('fs');
      const path = await import('path');

      const problems = this.getAllProblems();
      const exportData = {
        timestamp: new Date().toISOString(),
        problemCount: problems.length,
        fileCount: this.problemsByUri.size,
        problems: problems,
        summary: this.getWorkspaceSummary(),
      };

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write to file
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
      console.log(`[DiagnosticsWatcher] Exported ${problems.length} problems to ${filePath}`);
    } catch (error) {
      console.error('[DiagnosticsWatcher] Failed to export problems:', error);
    }
  }

  /**
   * Gets filtered problems based on criteria
   *
   * @param filter - Filter criteria for problems
   * @returns Array of filtered ProblemItems
   */
  public getFilteredProblems(
    filter: {
      severity?: string;
      workspaceFolder?: string;
      filePath?: string;
    } = {}
  ): ProblemItem[] {
    if (this.isDisposed) {
      return [];
    }

    let problems = this.getAllProblems();

    if (filter.severity) {
      problems = problems.filter((p) => p.severity === filter.severity);
    }

    if (filter.workspaceFolder) {
      problems = problems.filter((p) => p.workspaceFolder === filter.workspaceFolder);
    }

    if (filter.filePath) {
      problems = problems.filter((p) => p.filePath === filter.filePath);
    }

    return problems;
  }

  /**
   * Gets workspace summary statistics
   *
   * @param groupBy - How to group the summary (optional)
   * @returns Summary object with statistics
   */
  public getWorkspaceSummary(groupBy?: string): object {
    if (this.isDisposed) {
      return {};
    }

    const allProblems = this.getAllProblems();
    const summary: {
      totalProblems: number;
      bySeverity: Record<string, number>;
      byWorkspace: Record<string, number>;
      bySource: Record<string, number>;
      fileCount: number;
    } = {
      totalProblems: allProblems.length,
      bySeverity: {
        Error: 0,
        Warning: 0,
        Information: 0,
        Hint: 0,
      },
      byWorkspace: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      fileCount: this.problemsByUri.size,
    };

    // Count by severity
    allProblems.forEach((problem) => {
      // Use type assertion since ProblemItemSchema guarantees severity is required
      const severity = problem.severity as string;
      if (severity && severity in summary.bySeverity) {
        const currentCount = summary.bySeverity[severity];
        if (currentCount !== undefined) {
          summary.bySeverity[severity] = currentCount + 1;
        }
      }

      // Count by workspace
      if (problem.workspaceFolder) {
        summary.byWorkspace[problem.workspaceFolder] =
          (summary.byWorkspace[problem.workspaceFolder] || 0) + 1;
      }

      // Count by source
      if (problem.source) {
        summary.bySource[problem.source] = (summary.bySource[problem.source] || 0) + 1;
      }
    });

    if (groupBy === 'severity') {
      return summary.bySeverity;
    } else if (groupBy === 'workspaceFolder') {
      return summary.byWorkspace;
    } else if (groupBy === 'source') {
      return summary.bySource;
    }

    return summary;
  }

  /**
   * Gets list of files that have problems
   *
   * @returns Array of file paths that have diagnostics
   */
  public getFilesWithProblems(): string[] {
    if (this.isDisposed) {
      return [];
    }

    return Array.from(this.problemsByUri.keys()).filter((uri) => {
      const problems = this.problemsByUri.get(uri);
      return problems && problems.length > 0;
    });
  }

  /**
   * Disposes of all resources and subscriptions
   * Safe to call multiple times
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;

    // Dispose of all VS Code subscriptions
    this.disposables.forEach((disposable) => {
      try {
        disposable.dispose();
      } catch (error) {
        // Silently handle disposal errors to prevent cascading failures
        console.warn('Error disposing subscription:', error);
      }
    });

    // Clear collections
    this.problemsByUri.clear();
    this.disposables.length = 0;

    // Dispose performance monitor
    this.performanceMonitor.dispose();

    // Remove all event listeners
    this.removeAllListeners();
  }

  /**
   * Initializes the watcher by subscribing to VS Code diagnostic events
   */
  private initialize(): void {
    try {
      const subscription = this.vsCodeApi.languages.onDidChangeDiagnostics(
        this.createDebouncedHandler()
      );
      this.disposables.push(subscription);
    } catch (error) {
      // Handle VS Code API errors gracefully
      console.error('Failed to subscribe to diagnostic changes:', error);
      // Don't throw - allow the watcher to be created even if subscription fails
    }
  }

  /**
   * Creates a debounced handler for diagnostic change events
   */
  private createDebouncedHandler(): (event: DiagnosticChangeEvent) => void {
    return debounce((event: DiagnosticChangeEvent) => {
      if (this.isDisposed) {
        return;
      }

      try {
        this.processDiagnosticChangeEvent(event);
      } catch (error) {
        this.emit(EVENT_NAMES.WATCHER_ERROR, error);
      }
    }, this.debounceMs);
  }

  /**
   * Processes a diagnostic change event for all affected URIs
   */
  private processDiagnosticChangeEvent(event: DiagnosticChangeEvent): void {
    this.performanceMonitor.recordDiagnosticProcessing(() => {
      for (const uri of event.uris) {
        try {
          this.processUriDiagnostics(uri as VsCodeUri);
        } catch (error) {
          this.emit(EVENT_NAMES.WATCHER_ERROR, error);
        }
      }
    });
  }

  /**
   * Processes diagnostics for a single URI
   */
  private processUriDiagnostics(uri: VsCodeUri): void {
    const filePath = uri.fsPath || uri.toString();
    const diagnostics = this.vsCodeApi.languages.getDiagnostics(uri);

    const problems = diagnostics.map((d) => this.converter.convertToProblemItem(d, uri));

    if (problems.length > 0) {
      this.problemsByUri.set(filePath, problems);
    } else {
      this.problemsByUri.delete(filePath);
    }

    this.emit(EVENT_NAMES.PROBLEMS_CHANGED, {
      uri: filePath,
      problems,
    } as DiagnosticsChangeEvent);

    // Export problems to file for external MCP server access
    try {
      const path = require('path');
      const os = require('os');
      const exportPath = path.join(os.tmpdir(), 'vscode-diagnostics-export.json');
      this.exportProblemsToFile(exportPath).catch(() => {
        // Silently ignore export errors to not break normal operation
      });
    } catch {
      // Silently ignore export errors to not break normal operation
    }
  }
}
