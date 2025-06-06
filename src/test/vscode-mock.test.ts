import { mockVscode } from './setup';
import { VsCodeTestHelpers } from './helpers/vscode-test-helpers';

describe('VS Code API Mocking', () => {
  beforeEach(() => {
    VsCodeTestHelpers.resetAllMocks();
  });

  it('should mock VS Code languages API', () => {
    expect(mockVscode.languages.onDidChangeDiagnostics).toBeDefined();
    expect(mockVscode.languages.getDiagnostics).toBeDefined();
    expect(jest.isMockFunction(mockVscode.languages.onDidChangeDiagnostics)).toBe(true);
  });

  it('should create mock diagnostics', () => {
    const diagnostic = VsCodeTestHelpers.createMockDiagnostic('Test error', 0);
    expect(diagnostic.message).toBe('Test error');
    expect(diagnostic.severity).toBe(0);
    expect(diagnostic.source).toBe('test');
  });

  it('should create mock URIs', () => {
    const uri = VsCodeTestHelpers.createMockUri('/test/file.ts');
    expect(uri.fsPath).toBe('/test/file.ts');
    expect(uri.toString()).toBe('/test/file.ts');
  });

  it('should reset mocks properly', () => {
    mockVscode.languages.onDidChangeDiagnostics.mockReturnValue('test');
    expect(mockVscode.languages.onDidChangeDiagnostics).toHaveBeenCalledTimes(0);

    VsCodeTestHelpers.resetAllMocks();
    expect(mockVscode.languages.onDidChangeDiagnostics).toHaveBeenCalledTimes(0);
  });
});
