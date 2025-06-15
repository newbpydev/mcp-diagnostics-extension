import path from 'path';
import { EventEmitter } from 'events';

// ------------------------------------------------------------------
// Silence noisy console output emitted by the bootstrap code in the
// bundled `scripts/mcp-server.js` when it is required under Jest.
// ------------------------------------------------------------------
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

// Restore the spies after the entire test file has finished.
afterAll(() => {
  consoleErrorSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

// -------------------------------------------------------------
// 🧩 Necessary mocks BEFORE requiring the server script so that
// heavy dependencies are stubbed out and no long-running server
// starts during unit-tests.
// -------------------------------------------------------------

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

// Mock child_process.spawn to avoid actually spawning commands
jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    const ee = new EventEmitter();
    // simulate async close immediately (success exit code 0)
    process.nextTick(() => ee.emit('close', 0));
    return ee as any;
  }),
}));

// Mock fs for initial compiled util detection
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Require the script AFTER mocks so that it uses the stubs.
// NODE_ENV is set to 'test' automatically by Jest, so the server
// bootstrap path is skipped.

const {
  parseTypeScriptOutput,
  parseESLintOutput,
  CrossPlatform,
} = require('../../../../scripts/mcp-server.js');

// Helper to temporarily spoof process.platform
const withPlatform = (platform: NodeJS.Platform, fn: () => void) => {
  const original = Object.getOwnPropertyDescriptor(process, 'platform') as PropertyDescriptor;
  Object.defineProperty(process, 'platform', { value: platform });
  try {
    fn();
  } finally {
    Object.defineProperty(process, 'platform', original);
  }
};

describe('mcp-server pure helpers', () => {
  describe('parseTypeScriptOutput', () => {
    it('parses tsc error lines into ProblemItem objects', () => {
      const relFile = path.join('src', 'index.ts');
      const output = `${relFile}(10,5): error TS1005: ';' expected`;
      const result = parseTypeScriptOutput(output);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        severity: 'Error',
        code: 'TS1005',
        message: "';' expected",
      });
      // Ensure path has been absolutised using extensionDir heuristics
      expect(path.isAbsolute(result[0].filePath)).toBe(true);
    });

    it('returns empty array when no valid lines present', () => {
      expect(parseTypeScriptOutput('random noise')).toEqual([]);
    });
  });

  describe('parseESLintOutput', () => {
    it('parses ESLint JSON into ProblemItem objects', () => {
      const eslintJson = JSON.stringify([
        {
          filePath: '/tmp/app.js',
          messages: [
            {
              line: 1,
              column: 7,
              endLine: 1,
              endColumn: 8,
              severity: 2,
              message: 'Unexpected token',
              ruleId: 'syntax-error',
            },
          ],
        },
      ]);

      const result = parseESLintOutput(eslintJson);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        severity: 'Error',
        message: 'Unexpected token',
        code: 'syntax-error',
      });
    });

    it('handles malformed JSON gracefully', () => {
      // Should not throw and must return empty array
      expect(parseESLintOutput('not-json')).toEqual([]);
    });
  });

  describe('CrossPlatform helpers', () => {
    it('getSpawnOptions returns shell true on Windows', () => {
      withPlatform('win32', () => {
        const opts = CrossPlatform.getSpawnOptions('/cwd');
        expect(opts.shell).toBe(true);
        expect(opts.cwd).toBe('/cwd');
        expect(opts.env.NODE_ENV).toBe('production');
      });
    });

    it('getSpawnOptions returns shell false on Linux', () => {
      withPlatform('linux', () => {
        const opts = CrossPlatform.getSpawnOptions('/cwd');
        expect(opts.shell).toBeUndefined();
        expect(opts.cwd).toBe('/cwd');
      });
    });

    it('getCommandForPlatform appends .cmd on Windows only', () => {
      withPlatform('win32', () => {
        expect(CrossPlatform.getCommandForPlatform('npm')).toBe('npm.cmd');
      });

      withPlatform('darwin', () => {
        expect(CrossPlatform.getCommandForPlatform('npm')).toBe('npm');
      });
    });

    it('platform detection helpers work', () => {
      withPlatform('win32', () => {
        expect(CrossPlatform.isWindows()).toBe(true);
        expect(CrossPlatform.isMac()).toBe(false);
        expect(CrossPlatform.isLinux()).toBe(false);
      });

      withPlatform('darwin', () => {
        expect(CrossPlatform.isMac()).toBe(true);
      });
    });
  });
});
