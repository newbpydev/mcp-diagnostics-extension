// Mock VS Code API for Jest tests
const mockVscode = {
  languages: {
    onDidChangeDiagnostics: jest.fn(),
    getDiagnostics: jest.fn(),
    createDiagnosticCollection: jest.fn(),
  },
  workspace: {
    getWorkspaceFolder: jest.fn(),
    onDidDeleteFiles: jest.fn(),
    getConfiguration: jest.fn(),
  },
  window: {
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    })),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      text: '',
      tooltip: '',
      command: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
    createWebviewPanel: jest.fn(() => ({
      webview: { html: '' },
      dispose: jest.fn(),
    })),
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
  Range: jest.fn(),
  Position: jest.fn(),
  Uri: {
    file: jest.fn(),
    parse: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
  },
  Disposable: {
    from: jest.fn(),
  },
};

// Global mock for vscode module
jest.mock('vscode', () => mockVscode, { virtual: true });

// Export mock for test files
export { mockVscode };
