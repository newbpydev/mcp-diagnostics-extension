import { EventEmitter } from 'events';
import { ProblemItem } from '../../shared/types';
import { DEFAULT_CONFIG } from '../../shared/constants';

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
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  message: string;
  severity: number;
  source?: string;
  code?: string | number;
  relatedInformation?: unknown[];
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
  name: string;
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
  private isDisposed = false;

  /**
   * Creates a new DiagnosticsWatcher instance
   *
   * @param vsCodeApi - The VS Code API interface for dependency injection
   * @param debounceMs - Debounce time in milliseconds for diagnostic change events
   */
  constructor(vsCodeApi: IVsCodeApi, _debounceMs: number = DEFAULT_CONFIG.debounceMs) {
    super();
    this.vsCodeApi = vsCodeApi;
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

    // Remove all event listeners
    this.removeAllListeners();
  }

  /**
   * Initializes the watcher by subscribing to VS Code diagnostic events
   */
  private initialize(): void {
    try {
      const subscription = this.vsCodeApi.languages.onDidChangeDiagnostics(
        this.handleDiagnosticChange
      );
      this.disposables.push(subscription);
    } catch (error) {
      // Handle VS Code API errors gracefully
      console.error('Failed to subscribe to diagnostic changes:', error);
      // Don't throw - allow the watcher to be created even if subscription fails
    }
  }

  /**
   * Handles diagnostic change events (will be implemented in next task)
   * Currently a placeholder that will be enhanced with debouncing and conversion logic
   */
  private handleDiagnosticChange = (_event: DiagnosticChangeEvent): void => {
    // Implementation will be added in Task 1.2.2
    // This placeholder ensures the interface tests pass
  };
}
