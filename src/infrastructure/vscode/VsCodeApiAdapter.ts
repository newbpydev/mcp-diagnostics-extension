import * as vscode from 'vscode';
import {
  IVsCodeApi,
  VsCodeDiagnostic,
  VsCodeUri,
  VsCodeWorkspaceFolder,
  DiagnosticChangeEvent,
} from '../../core/diagnostics/DiagnosticsWatcher';

/**
 * Adapter that bridges the actual VS Code API with our IVsCodeApi interface
 * This allows us to inject the real VS Code API while maintaining testability
 */
export class VsCodeApiAdapter implements IVsCodeApi {
  public readonly languages: IVsCodeApi['languages'];
  public readonly workspace: IVsCodeApi['workspace'];
  public readonly commands: IVsCodeApi['commands'];
  public readonly window: IVsCodeApi['window'];
  public readonly Uri: IVsCodeApi['Uri'];

  constructor(private readonly vscodeApi: typeof vscode) {
    this.languages = {
      onDidChangeDiagnostics: (
        listener: (e: DiagnosticChangeEvent) => void
      ): { dispose(): void } => {
        return this.vscodeApi.languages.onDidChangeDiagnostics(
          (event: vscode.DiagnosticChangeEvent) => {
            // Convert VS Code event to our interface
            const adaptedEvent: DiagnosticChangeEvent = {
              uris: event.uris as readonly unknown[],
            };
            listener(adaptedEvent);
          }
        );
      },

      getDiagnostics: (uri?: VsCodeUri): VsCodeDiagnostic[] => {
        if (uri) {
          // Convert our URI interface to VS Code URI
          const vsCodeUri = vscode.Uri.parse(uri.toString());
          const diagnostics = this.vscodeApi.languages.getDiagnostics(vsCodeUri);
          return this.convertDiagnostics(diagnostics);
        } else {
          // Get all diagnostics
          const allDiagnostics = this.vscodeApi.languages.getDiagnostics();
          const result: VsCodeDiagnostic[] = [];
          for (const [, diagnostics] of allDiagnostics) {
            result.push(...this.convertDiagnostics(diagnostics));
          }
          return result;
        }
      },
    };

    this.workspace = {
      getWorkspaceFolder: (uri: VsCodeUri): VsCodeWorkspaceFolder | undefined => {
        const vsCodeUri = vscode.Uri.parse(uri.toString());
        const folder = this.vscodeApi.workspace.getWorkspaceFolder(vsCodeUri);
        if (!folder) {
          return undefined;
        }
        return {
          name: folder.name,
        };
      },
      workspaceFolders: this.vscodeApi.workspace.workspaceFolders
        ? this.vscodeApi.workspace.workspaceFolders.map((folder) => ({
            uri: this.convertVsCodeUri(folder.uri),
            name: folder.name,
          }))
        : undefined,
      findFiles: (include: string, exclude?: string): Thenable<VsCodeUri[]> => {
        return this.vscodeApi.workspace
          .findFiles(include, exclude)
          .then((uris) => uris.map((uri) => this.convertVsCodeUri(uri)));
      },
      openTextDocument: (uri: VsCodeUri): Thenable<unknown> => {
        const vsCodeUri = vscode.Uri.parse(uri.toString());
        return this.vscodeApi.workspace.openTextDocument(vsCodeUri);
      },
    };

    this.commands = {
      executeCommand: (command: string): Thenable<unknown> =>
        this.vscodeApi.commands.executeCommand(command),
    };

    this.window = {
      showTextDocument: (
        uri: VsCodeUri,
        options?: { preview?: boolean; preserveFocus?: boolean }
      ): Thenable<unknown> => {
        const vsCodeUri = vscode.Uri.parse(uri.toString());
        return this.vscodeApi.window.showTextDocument(vsCodeUri, options);
      },
    };

    this.Uri = {
      file: (path: string): VsCodeUri => {
        const vsCodeUri = this.vscodeApi.Uri.file(path);
        return this.convertVsCodeUri(vsCodeUri);
      },
    };
  }

  /**
   * Converts VS Code diagnostics to our interface format
   */
  private convertDiagnostics(diagnostics: vscode.Diagnostic[]): VsCodeDiagnostic[] {
    return diagnostics.map((diagnostic) => this.convertDiagnostic(diagnostic));
  }

  /**
   * Converts a single VS Code diagnostic to our interface format
   */
  private convertDiagnostic(diagnostic: vscode.Diagnostic): VsCodeDiagnostic {
    const convertedCode = this.convertCode(diagnostic.code);
    const result: VsCodeDiagnostic = {
      range: {
        start: {
          line: diagnostic.range.start.line,
          character: diagnostic.range.start.character,
        },
        end: {
          line: diagnostic.range.end.line,
          character: diagnostic.range.end.character,
        },
      },
      message: diagnostic.message,
      severity: diagnostic.severity,
      source: diagnostic.source || null,
      relatedInformation: diagnostic.relatedInformation || null,
    };

    if (convertedCode !== undefined) {
      result.code = convertedCode;
    }

    return result;
  }

  /**
   * Converts VS Code diagnostic code to our interface format
   */
  private convertCode(code: vscode.Diagnostic['code']): string | number | undefined {
    if (code === undefined || code === null) {
      return undefined;
    }

    if (typeof code === 'string' || typeof code === 'number') {
      return code;
    }

    // Handle complex code objects by extracting the value
    if (typeof code === 'object' && 'value' in code) {
      return code.value;
    }

    return undefined;
  }

  /**
   * Converts a VS Code URI to our interface format
   */
  private convertVsCodeUri(vsCodeUri: vscode.Uri): VsCodeUri {
    return {
      fsPath: vsCodeUri.fsPath,
      toString: () => vsCodeUri.toString(),
    };
  }
}
