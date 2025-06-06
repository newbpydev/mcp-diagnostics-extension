import { mockVscode } from '../setup';

interface MockDiagnostic {
  message: string;
  severity: number;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  source: string;
}

interface MockUri {
  fsPath: string;
  toString: () => string;
}

export class VsCodeTestHelpers {
  static createMockDiagnostic(message: string, severity: number = 0): MockDiagnostic {
    return {
      message,
      severity,
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
      source: 'test',
    };
  }

  static createMockUri(path: string): MockUri {
    return {
      fsPath: path,
      toString: (): string => path,
    };
  }

  static resetAllMocks(): void {
    Object.values(mockVscode).forEach((api) => {
      if (typeof api === 'object' && api !== null) {
        Object.values(api).forEach((method) => {
          if (jest.isMockFunction(method)) {
            method.mockReset();
          }
        });
      }
    });
  }
}
