import { ConfigurationValidator } from '../../../../infrastructure/mcp/ConfigurationValidator';
import { CrossPlatformUtils } from '@shared/utils/CrossPlatformUtils';
import * as fs from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('@shared/utils/CrossPlatformUtils');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedCrossPlatformUtils = CrossPlatformUtils as jest.Mocked<typeof CrossPlatformUtils>;

describe('ConfigurationValidator', () => {
  let validator: ConfigurationValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new ConfigurationValidator();

    // Setup default mocks
    mockedCrossPlatformUtils.getExtensionPath.mockReturnValue('/test/extension/path');
    mockedCrossPlatformUtils.normalizePath.mockImplementation((path) => path.replace(/\\/g, '/'));
    mockedCrossPlatformUtils.getIdeConfigPaths.mockReturnValue({
      vscode: '/mock/vscode/config',
      cursor: '/mock/cursor/config',
      windsurf: '/mock/windsurf/config',
    });
    mockedCrossPlatformUtils.isWindows.mockReturnValue(false);
    mockedCrossPlatformUtils.getSpawnOptions.mockReturnValue({
      cwd: '/test/extension/path',
      env: { NODE_ENV: 'production' },
    });
  });

  describe('validateExistingConfigurations', () => {
    it('should validate VS Code configuration', async () => {
      const mockVSCodeConfig = {
        servers: {
          'vscode-diagnostics': {
            type: 'stdio',
            command: 'node',
            args: ['scripts/mcp-server.js'],
            cwd: '/test/extension/path',
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockVSCodeConfig));

      const result = await validator.validateVSCodeConfig('.vscode/mcp.json');

      expect(result.isValid).toBe(true);
      expect(result.configType).toBe('vscode');
      expect(result.serverName).toBe('vscode-diagnostics');
    });

    it('should validate Cursor configuration', async () => {
      const mockCursorConfig = {
        mcpServers: {
          'vscode-diagnostics': {
            command: 'node',
            args: ['scripts/mcp-server.js'],
            cwd: '/test/extension/path',
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockCursorConfig));

      const result = await validator.validateCursorConfig('cursor-mcp-config.json');

      expect(result.isValid).toBe(true);
      expect(result.configType).toBe('cursor');
      expect(result.serverName).toBe('vscode-diagnostics');
    });

    it('should validate Windsurf configuration', async () => {
      const mockWindsurfConfig = {
        servers: {
          'vscode-diagnostics': {
            command: 'node',
            args: ['scripts/mcp-server.js'],
            cwd: '/test/extension/path',
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockWindsurfConfig));

      const result = await validator.validateWindsurfConfig('.windsurf/mcp.json');

      expect(result.isValid).toBe(true);
      expect(result.configType).toBe('windsurf');
      expect(result.serverName).toBe('vscode-diagnostics');
    });

    it('should detect hardcoded Windows paths in configuration', async () => {
      const mockConfigWithHardcodedPath = {
        servers: {
          'vscode-diagnostics': {
            command: 'node',
            args: ['scripts/mcp-server.js'],
            cwd: 'C:/Users/Remym/pythonProject/__personal-projects/mcp-diagnostics-extension',
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfigWithHardcodedPath));

      const result = await validator.validateVSCodeConfig('.vscode/mcp.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Hardcoded path detected');
      expect(result.suggestions).toContain('Replace hardcoded paths with dynamic paths');
    });

    it('should detect missing shell option for Windows compatibility', async () => {
      const mockConfigWithoutShell = {
        servers: {
          'vscode-diagnostics': {
            command: 'node',
            args: ['scripts/mcp-server.js'],
            cwd: '/test/extension/path',
            // Missing shell option
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfigWithoutShell));
      mockedCrossPlatformUtils.isWindows.mockReturnValue(true);

      const result = await validator.validateVSCodeConfig('.vscode/mcp.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing Windows shell option');
      expect(result.suggestions).toContain('Add shell: true for Windows compatibility');
    });
  });

  describe('enhanceConfiguration', () => {
    it('should enhance VS Code configuration with cross-platform support', async () => {
      const mockOriginalConfig = {
        servers: {
          'vscode-diagnostics': {
            type: 'stdio',
            command: 'node',
            args: ['scripts/mcp-server.js'],
            cwd: 'C:/hardcoded/path',
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockOriginalConfig));
      mockedCrossPlatformUtils.getExtensionPath.mockReturnValue('/dynamic/extension/path');
      mockedCrossPlatformUtils.getSpawnOptions.mockReturnValue({
        cwd: '/dynamic/extension/path',
        env: { NODE_ENV: 'production' },
        shell: true,
      });

      const enhanced = await validator.enhanceVSCodeConfig('.vscode/mcp.json');

      expect(enhanced.servers['vscode-diagnostics']?.cwd).toBe('/dynamic/extension/path');
      expect(enhanced.servers['vscode-diagnostics']?.shell).toBe(true);
      expect(enhanced.servers['vscode-diagnostics']?.env).toEqual({ NODE_ENV: 'production' });
    });

    it('should enhance Cursor configuration with cross-platform support', async () => {
      const mockOriginalConfig = {
        mcpServers: {
          'vscode-diagnostics': {
            command: 'node',
            args: ['scripts/mcp-server.js'],
            cwd: 'C:/hardcoded/path',
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockOriginalConfig));
      mockedCrossPlatformUtils.getExtensionPath.mockReturnValue('/dynamic/extension/path');
      mockedCrossPlatformUtils.getSpawnOptions.mockReturnValue({
        cwd: '/dynamic/extension/path',
        env: { NODE_ENV: 'production' },
        shell: true,
      });

      const enhanced = await validator.enhanceCursorConfig('cursor-mcp-config.json');

      expect(enhanced.mcpServers['vscode-diagnostics']?.cwd).toBe('/dynamic/extension/path');
      expect(enhanced.mcpServers['vscode-diagnostics']?.shell).toBe(true);
      expect(enhanced.mcpServers['vscode-diagnostics']?.env).toEqual({ NODE_ENV: 'production' });
    });
  });

  describe('generateValidationReport', () => {
    it('should generate comprehensive validation report for all configurations', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          servers: { 'vscode-diagnostics': { command: 'node' } },
        })
      );

      const report = await validator.generateValidationReport();

      expect(report.totalConfigs).toBe(3);
      expect(report.validConfigs).toBeDefined();
      expect(report.invalidConfigs).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.crossPlatformCompliance).toBeDefined();
    });

    it('should provide specific recommendations for cross-platform compatibility', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          servers: {
            'vscode-diagnostics': {
              command: 'node',
              cwd: 'C:/hardcoded/path', // Hardcoded path
            },
          },
        })
      );

      const report = await validator.generateValidationReport();

      expect(report.recommendations).toContain('Replace hardcoded paths with dynamic paths');
      expect(report.recommendations).toContain('Add cross-platform spawn options');
      expect(report.crossPlatformCompliance.score).toBeLessThan(100);
    });
  });

  describe('error handling', () => {
    it('should handle missing configuration files gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await validator.validateVSCodeConfig('.vscode/mcp.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Configuration file not found');
    });

    it('should handle malformed JSON gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('{ invalid json }');

      const result = await validator.validateVSCodeConfig('.vscode/mcp.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Invalid JSON format');
    });

    it('should handle missing required fields', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({
          servers: {
            'vscode-diagnostics': {
              // Missing command and args
              cwd: '/test/path',
            },
          },
        })
      );

      const result = await validator.validateVSCodeConfig('.vscode/mcp.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing required field: command');
    });
  });

  // -------------------------------------------------------------
  // 🎯 Additional tests for improved branch and error coverage
  // -------------------------------------------------------------

  describe('enhanceVSCodeConfig – script path normalization', () => {
    it('should replace relative script path with normalized absolute path', async () => {
      const originalConfig = {
        servers: {
          diagnostics: {
            type: 'stdio',
            command: 'node',
            args: ['--flag', 'scripts/mcp-server.js'],
            cwd: 'relative/path',
          },
        },
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(originalConfig));
      mockedCrossPlatformUtils.getExtensionPath.mockReturnValue('/ext/root');
      mockedCrossPlatformUtils.getSpawnOptions.mockReturnValue({
        cwd: '/ext/root',
        env: { NODE_ENV: 'production' },
      });

      const enhanced = await validator.enhanceVSCodeConfig('dummy.json');

      const args = enhanced.servers['diagnostics']!.args;
      expect(args).toContain('/ext/root/scripts/mcp-server.js');
      // Ensure the old relative arg is gone
      expect(args).not.toContain('scripts/mcp-server.js');
    });
  });

  describe('validateCursorConfig – edge cases', () => {
    it('should flag missing args field', async () => {
      const invalidConfig = {
        mcpServers: {
          diagnostics: {
            command: 'node',
            // args missing
            cwd: '/cwd',
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      const result = await validator.validateCursorConfig('cursor.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing or invalid args field');
    });

    it('should detect missing mcpServers section', async () => {
      const configMissingSection = {};
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(configMissingSection));

      const result = await validator.validateCursorConfig('cursor.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing mcpServers section');
    });

    it('should flag hardcoded path detection', async () => {
      const configHardcoded = {
        mcpServers: {
          diagnostics: {
            command: 'node',
            args: ['a'],
            cwd: 'C:/Users/Me/project',
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(configHardcoded));

      const result = await validator.validateCursorConfig('cursor.json');

      expect(result.issues).toContain('Hardcoded path detected');
      expect(result.suggestions).toContain('Replace hardcoded paths with dynamic paths');
    });

    it('should detect missing shell option on Windows', async () => {
      const configNoShell = {
        mcpServers: {
          diagnostics: {
            command: 'node',
            args: [],
            cwd: '/cwd',
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(configNoShell));
      mockedCrossPlatformUtils.isWindows.mockReturnValue(true);

      const result = await validator.validateCursorConfig('cursor.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing Windows shell option');
    });
  });

  describe('validateWindsurfConfig – malformed JSON', () => {
    it('should detect malformed JSON and set isValid=false', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('{ malformed json');

      const result = await validator.validateWindsurfConfig('windsurf.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Invalid JSON format');
    });
  });

  describe('generateValidationReport – no configs present', () => {
    it('should return compliance score 100 when no configs exist', async () => {
      // existsSync always false – no configuration files found
      mockedFs.existsSync.mockReturnValue(false);

      const report = await validator.generateValidationReport();

      expect(report.totalConfigs).toBe(0);
      expect(report.crossPlatformCompliance.score).toBe(100);
      expect(report.validConfigs.length).toBe(0);
      expect(report.invalidConfigs.length).toBe(0);
    });
  });

  describe('isHardcodedPath (private)', () => {
    const callIsHardcoded = (p: string): boolean => (validator as any).isHardcodedPath(p);

    it.each([
      ['Windows drive letter', 'C:/Users/test/project/file', true],
      ['Unix home dir', '/home/test/project/file', true],
      ['AppData path', 'C:/Users/test/AppData/Roaming/Code', true],
      ['Relative path', 'some/relative/path', false],
      ['Absolute system path', '/usr/bin/node', false],
    ])('detects %s correctly', (_desc, input, expected) => {
      expect(callIsHardcoded(input)).toBe(expected);
    });
  });

  describe('validateVSCodeConfig – missing servers section', () => {
    it('should set isValid false when servers section missing', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const result = await validator.validateVSCodeConfig('vscode.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing servers section');
    });
  });

  describe('validateWindsurfConfig – other branches', () => {
    it('should detect missing servers section', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({}));

      const result = await validator.validateWindsurfConfig('windsurf.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing servers section');
    });

    it('should detect missing shell option on Windows', async () => {
      const configNoShell = {
        servers: {
          diagnostics: {
            command: 'node',
            args: [],
            cwd: '/cwd',
          },
        },
      };
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(configNoShell));
      mockedCrossPlatformUtils.isWindows.mockReturnValue(true);

      const result = await validator.validateWindsurfConfig('windsurf.json');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Missing Windows shell option');
    });
  });

  describe('validateVSCodeConfig – env suggestions', () => {
    it('should suggest adding NODE_ENV when env missing', async () => {
      const configNoEnv = {
        servers: {
          diagnostics: {
            command: 'node',
            args: ['a'],
            cwd: '/cwd',
            // env missing
          },
        },
      } as any;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(configNoEnv));

      const result = await validator.validateVSCodeConfig('vscode.json');

      expect(result.suggestions).toContain('Add NODE_ENV environment variable');
    });

    it('should suggest adding cross-platform spawn options when env and shell missing', async () => {
      const configNoEnvShell = {
        servers: {
          diagnostics: {
            command: 'node',
            args: [],
            cwd: '/cwd',
            // env and shell missing
          },
        },
      } as any;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(configNoEnvShell));

      const result = await validator.validateVSCodeConfig('vscode.json');

      expect(result.crossPlatformCompliant).toBe(false);
      expect(result.suggestions).toContain('Add cross-platform spawn options');
    });
  });

  describe('validateCursorConfig – cross-platform spawn suggestion', () => {
    it('should suggest adding spawn options when env and shell missing', async () => {
      const cfg = {
        mcpServers: {
          diagnostics: {
            command: 'node',
            args: [],
            cwd: '/cwd',
            // env and shell missing
          },
        },
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(cfg));

      const result = await validator.validateCursorConfig('cursor.json');

      expect(result.crossPlatformCompliant).toBe(false);
      expect(result.suggestions).toContain('Add cross-platform spawn options');
    });
  });
});
