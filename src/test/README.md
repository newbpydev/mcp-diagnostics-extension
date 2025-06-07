# Testing Infrastructure 🧪

This directory contains the comprehensive test suite for the MCP Diagnostics Extension, implementing a **Test-Driven Development (TDD)** approach with multiple testing strategies to ensure reliability and maintainability.

## 📋 Overview

Our testing strategy follows the **Test Pyramid** principle:
- **Unit Tests (70%)** - Fast, isolated component testing
- **Integration Tests (20%)** - Component interaction testing
- **End-to-End Tests (10%)** - Full workflow validation

**Current Status**: 300+ tests with >96% statement coverage

## 📁 Directory Structure

```
test/
├── setup.ts                 # Global test configuration and VS Code mocking
├── extension.test.ts        # Main extension activation/deactivation tests
├── vscode-mock.test.ts      # VS Code API mock validation
├── unit/                    # Isolated component tests
│   ├── commands/           # Command layer tests
│   ├── core/               # Business logic tests
│   ├── infrastructure/     # External adapter tests
│   └── shared/             # Shared utilities tests
├── integration/            # Component interaction tests
│   ├── extension/          # Extension-level integration
│   └── mcp/                # MCP server integration
├── fixtures/               # Test data and mock objects
│   ├── diagnostics/        # Sample diagnostic data
│   └── workspaces/         # Mock workspace configurations
└── helpers/                # Test utilities and common functions
    ├── mocks/              # Reusable mock implementations
    └── assertions/         # Custom Jest matchers
```

## 🎯 Testing Strategies

### Unit Testing (70% of tests)
**Purpose**: Test individual components in isolation

#### Key Characteristics
- **Fast execution** (<10ms per test)
- **No external dependencies** (VS Code API mocked)
- **Single responsibility** (one component per test file)
- **High coverage** (>95% for core logic)

#### Example Structure
```typescript
describe('DiagnosticsWatcher', () => {
  let mockVscode: jest.Mocked<typeof vscode>;
  let watcher: DiagnosticsWatcher;

  beforeEach(() => {
    mockVscode = createMockVscode();
    watcher = new DiagnosticsWatcher(mockVscode);
  });

  afterEach(() => {
    watcher.dispose();
  });

  describe('Constructor', () => {
    it('should subscribe to diagnostic changes', () => {
      expect(mockVscode.languages.onDidChangeDiagnostics).toHaveBeenCalled();
    });
  });
});
```

### Integration Testing (20% of tests)
**Purpose**: Test component interactions and data flow

#### Key Characteristics
- **Component boundaries** (2-3 components working together)
- **Real data flow** (actual events and responses)
- **Configuration testing** (different settings scenarios)
- **Error propagation** (how errors flow between components)

#### Example Structure
```typescript
describe('Extension Integration', () => {
  it('should connect DiagnosticsWatcher to McpServer', async () => {
    const { diagnosticsWatcher, mcpServer } = await setupIntegration();

    // Trigger diagnostic change
    await simulateDiagnosticChange('/test/file.ts', mockDiagnostics);

    // Verify MCP notification sent
    expect(mcpServer.getLastNotification()).toMatchObject({
      method: 'problemsChanged',
      params: expect.objectContaining({
        uri: '/test/file.ts'
      })
    });
  });
});
```

### End-to-End Testing (10% of tests)
**Purpose**: Validate complete user workflows

#### Key Characteristics
- **Full extension lifecycle** (activation to deactivation)
- **Real VS Code environment** (using @vscode/test-electron)
- **User scenarios** (command execution, status updates)
- **Performance validation** (timing and memory usage)

## 🔧 Test Configuration

### Jest Configuration (jest.config.js)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/test/**',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    }
  }
};
```

### VS Code API Mocking (setup.ts)
```typescript
// Global VS Code mock setup
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
    getWorkspaceFolder: jest.fn(),
  },
  languages: {
    onDidChangeDiagnostics: jest.fn(),
    getDiagnostics: jest.fn(),
  },
  window: {
    createStatusBarItem: jest.fn(() => ({
      text: '',
      show: jest.fn(),
      dispose: jest.fn(),
    })),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  },
  // ... complete mock implementation
}));
```

## 🧪 Test Categories by Component

### Core Layer Tests
```
core/
├── diagnostics/
│   ├── DiagnosticsWatcher.test.ts     # Event handling, debouncing
│   └── DiagnosticConverter.test.ts    # VS Code → ProblemItem conversion
├── models/
│   └── ProblemItem.test.ts            # Data model validation
└── services/
    └── PerformanceMonitor.test.ts     # Performance tracking
```

### Infrastructure Layer Tests
```
infrastructure/
├── mcp/
│   ├── McpServerWrapper.test.ts       # Server lifecycle, tool registration
│   ├── McpTools.test.ts               # Individual tool implementations
│   ├── McpResources.test.ts           # Resource exposure
│   └── McpNotifications.test.ts       # Real-time notifications
└── vscode/
    └── VsCodeApiAdapter.test.ts       # API wrapper functionality
```

### Commands Layer Tests
```
commands/
└── ExtensionCommands.test.ts          # UI interactions, command handling
```

### Integration Tests
```
integration/
├── extension/
│   └── ExtensionIntegration.test.ts   # Full extension workflow
└── mcp/
    └── McpIntegration.test.ts         # MCP client-server interaction
```

## 🎯 TDD Workflow

### Red-Green-Refactor Cycle
1. **🔴 Red**: Write failing test that describes desired behavior
2. **🟢 Green**: Write minimal code to make test pass
3. **🔵 Refactor**: Improve code while keeping tests green

### Example TDD Session
```typescript
// 1. RED: Write failing test
describe('DiagnosticsWatcher', () => {
  it('should debounce diagnostic changes', async () => {
    const handler = jest.fn();
    watcher.on('problemsChanged', handler);

    // Trigger multiple rapid changes
    triggerDiagnosticChange();
    triggerDiagnosticChange();
    triggerDiagnosticChange();

    // Should only call handler once after debounce
    await waitFor(400); // Wait for debounce
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// 2. GREEN: Implement minimal solution
private handleDiagnosticChange = debounce((event) => {
  this.emit('problemsChanged', event);
}, 300);

// 3. REFACTOR: Improve implementation
private handleDiagnosticChange = debounce(
  async (event: vscode.DiagnosticChangeEvent) => {
    try {
      const updates = await this.processChanges(event);
      this.emit('problemsChanged', updates);
    } catch (error) {
      console.error('Error processing diagnostics:', error);
    }
  },
  300
);
```

## 📊 Test Quality Metrics

### Coverage Requirements
- **Statements**: >95%
- **Branches**: >90%
- **Functions**: >95%
- **Lines**: >95%

### Performance Benchmarks
- **Unit tests**: <10ms each
- **Integration tests**: <100ms each
- **E2E tests**: <5 seconds each
- **Total suite**: <30 seconds

### Current Status
```
Test Suites: 25 passed, 25 total
Tests:       300 passed, 300 total
Coverage:    96.78% statements, 94.12% branches
Time:        12.5s
```

## 🔍 Testing Best Practices

### Test Organization
```typescript
describe('ComponentName', () => {
  describe('Constructor', () => {
    // Initialization tests
  });

  describe('Public Methods', () => {
    describe('methodName', () => {
      it('should handle normal case', () => {});
      it('should handle edge case', () => {});
      it('should handle error case', () => {});
    });
  });

  describe('Event Handling', () => {
    // Event-driven behavior tests
  });

  describe('Disposal', () => {
    // Cleanup and memory management tests
  });
});
```

### Mock Management
```typescript
// Centralized mock creation
export function createMockVscode(): jest.Mocked<typeof vscode> {
  return {
    languages: {
      onDidChangeDiagnostics: jest.fn(),
      getDiagnostics: jest.fn().mockReturnValue([]),
    },
    // ... complete mock
  };
}

// Test-specific mock customization
beforeEach(() => {
  mockVscode = createMockVscode();
  mockVscode.languages.getDiagnostics.mockReturnValue(mockDiagnostics);
});
```

### Async Testing
```typescript
// Proper async test handling
it('should process diagnostics asynchronously', async () => {
  const promise = watcher.processDiagnostics(mockEvent);

  // Verify immediate state
  expect(watcher.isProcessing()).toBe(true);

  // Wait for completion
  await promise;

  // Verify final state
  expect(watcher.isProcessing()).toBe(false);
  expect(watcher.getProblems()).toHaveLength(3);
});
```

## 🛠️ Test Utilities

### Custom Matchers
```typescript
// Custom Jest matchers for domain-specific assertions
expect.extend({
  toBeValidProblemItem(received) {
    const pass = isProblemItem(received);
    return {
      message: () => `Expected ${received} to be a valid ProblemItem`,
      pass,
    };
  },
});
```

### Test Fixtures
```typescript
// Reusable test data
export const mockDiagnostics = [
  createMockDiagnostic({
    severity: vscode.DiagnosticSeverity.Error,
    message: 'Type error',
    range: new vscode.Range(0, 0, 0, 10),
  }),
  // ... more fixtures
];
```

### Helper Functions
```typescript
// Common test operations
export async function waitForDebounce(ms = 350) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export function simulateDiagnosticChange(uri: string, diagnostics: vscode.Diagnostic[]) {
  const mockEvent = { uris: [vscode.Uri.parse(uri)] };
  mockVscode.languages.getDiagnostics.mockReturnValue(diagnostics);
  return mockEvent;
}
```

## 🚀 Running Tests

### Development Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- DiagnosticsWatcher.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle errors"
```

### CI/CD Integration
```yaml
# GitHub Actions test job
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npm run test:coverage
    - uses: codecov/codecov-action@v3
```

## 🔧 Debugging Tests

### VS Code Integration
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Debugging Techniques
- **Console logging** in tests for state inspection
- **Breakpoints** in VS Code debugger
- **Test isolation** to identify specific failures
- **Mock inspection** to verify call patterns

---

*Our comprehensive testing strategy ensures the extension is reliable, maintainable, and performs well across all supported scenarios.*
