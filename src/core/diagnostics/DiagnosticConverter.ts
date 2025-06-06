import { ProblemItem, ProblemSeverity } from '@shared/types';
import { IVsCodeApi, VsCodeDiagnostic, VsCodeUri } from './DiagnosticsWatcher';

/**
 * DiagnosticConverter handles the conversion of VS Code Diagnostic objects
 * to our standardized ProblemItem format.
 *
 * This class encapsulates all the logic for:
 * - Mapping VS Code severity levels to our string-based severity system
 * - Resolving workspace folder information
 * - Handling edge cases and malformed data gracefully
 * - Converting related information when present
 *
 * @example
 * ```typescript
 * const converter = new DiagnosticConverter(vscode);
 * const problemItem = converter.convertToProblemItem(diagnostic, uri);
 * ```
 */
export class DiagnosticConverter {
  constructor(private readonly vsCodeApi: IVsCodeApi) {}

  /**
   * Converts a VS Code Diagnostic to a ProblemItem
   *
   * @param diagnostic - The VS Code diagnostic to convert
   * @param uri - The URI of the file containing the diagnostic
   * @returns A ProblemItem representing the diagnostic
   */
  public convertToProblemItem(diagnostic: VsCodeDiagnostic, uri: VsCodeUri): ProblemItem {
    try {
      return {
        filePath: this.getFilePath(uri),
        workspaceFolder: this.getWorkspaceFolderName(uri),
        range: {
          start: {
            line: diagnostic.range?.start?.line ?? 0,
            character: diagnostic.range?.start?.character ?? 0,
          },
          end: {
            line: diagnostic.range?.end?.line ?? 0,
            character: diagnostic.range?.end?.character ?? 0,
          },
        },
        severity: this.mapSeverity(diagnostic.severity),
        message: diagnostic.message || 'Unknown error',
        source: diagnostic.source || 'unknown',
        code: diagnostic.code,
        relatedInformation: this.convertRelatedInformation(diagnostic.relatedInformation),
      };
    } catch {
      // Fallback for any conversion errors
      return {
        filePath: this.getFilePath(uri),
        workspaceFolder: 'unknown',
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        severity: 'Error',
        message: diagnostic.message || 'Conversion error occurred',
        source: 'unknown',
      };
    }
  }

  /**
   * Maps VS Code numeric severity to our string-based severity system
   *
   * @param severity - VS Code DiagnosticSeverity (0=Error, 1=Warning, 2=Information, 3=Hint)
   * @returns String representation of the severity
   */
  private mapSeverity(severity: number): ProblemSeverity {
    switch (severity) {
      case 0:
        return 'Error';
      case 1:
        return 'Warning';
      case 2:
        return 'Information';
      case 3:
        return 'Hint';
      default:
        return 'Error'; // Default to Error for unknown values
    }
  }

  /**
   * Resolves the workspace folder name for a given URI
   *
   * @param uri - The URI to resolve the workspace folder for
   * @returns The workspace folder name or 'unknown' if not found
   */
  private getWorkspaceFolderName(uri: VsCodeUri): string {
    try {
      const folder = this.vsCodeApi.workspace.getWorkspaceFolder(uri);
      return folder?.name || 'unknown';
    } catch {
      // Handle VS Code API errors gracefully
      return 'unknown';
    }
  }

  /**
   * Extracts the file path from a URI, preferring fsPath over toString
   *
   * @param uri - The URI to extract the path from
   * @returns The file path as a string
   */
  private getFilePath(uri: VsCodeUri): string {
    if (uri.fsPath && uri.fsPath.trim() !== '') {
      return uri.fsPath;
    }
    return uri.toString();
  }

  /**
   * Converts VS Code related information to our format
   *
   * @param relatedInfo - Array of VS Code DiagnosticRelatedInformation
   * @returns Converted related information or undefined if not present
   */
  private convertRelatedInformation(relatedInfo?: unknown[] | null):
    | Array<{
        location: {
          uri: string;
          range: {
            start: { line: number; character: number };
            end: { line: number; character: number };
          };
        };
        message: string;
      }>
    | undefined {
    if (!relatedInfo || !Array.isArray(relatedInfo)) {
      return undefined;
    }

    if (relatedInfo.length === 0) {
      return [];
    }

    try {
      return relatedInfo.map((info: unknown) => {
        const relatedItem = info as {
          location?: {
            uri?: string;
            range?: {
              start?: { line?: number; character?: number };
              end?: { line?: number; character?: number };
            };
          };
          message?: string;
        };

        return {
          location: {
            uri: relatedItem.location?.uri || 'unknown',
            range: {
              start: {
                line: relatedItem.location?.range?.start?.line ?? 0,
                character: relatedItem.location?.range?.start?.character ?? 0,
              },
              end: {
                line: relatedItem.location?.range?.end?.line ?? 0,
                character: relatedItem.location?.range?.end?.character ?? 0,
              },
            },
          },
          message: relatedItem.message || 'No message',
        };
      });
    } catch {
      // Return undefined if conversion fails
      return undefined;
    }
  }
}
