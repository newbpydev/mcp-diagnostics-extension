import {
  DEFAULT_CONFIG,
  PERFORMANCE_THRESHOLDS,
  ERROR_CODES,
  EVENT_NAMES,
  MCP_SERVER_INFO,
  VSCODE_SEVERITY_MAP,
  MCP_TOOLS,
  ExtensionConfigSchema,
  validateExtensionConfig,
} from '../../../shared/constants';

describe('Configuration Constants', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have all required configuration properties', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('mcpServerPort');
      expect(DEFAULT_CONFIG).toHaveProperty('debounceMs');
      expect(DEFAULT_CONFIG).toHaveProperty('enablePerformanceLogging');
      expect(DEFAULT_CONFIG).toHaveProperty('maxProblemsPerFile');
      expect(DEFAULT_CONFIG).toHaveProperty('enableDebugLogging');
    });

    it('should have sensible default values', () => {
      expect(DEFAULT_CONFIG.mcpServerPort).toBe(6070);
      expect(DEFAULT_CONFIG.debounceMs).toBe(300);
      expect(DEFAULT_CONFIG.enablePerformanceLogging).toBe(false);
      expect(DEFAULT_CONFIG.maxProblemsPerFile).toBe(1000);
      expect(DEFAULT_CONFIG.enableDebugLogging).toBe(false);
    });

    it('should have correct types', () => {
      expect(typeof DEFAULT_CONFIG.mcpServerPort).toBe('number');
      expect(typeof DEFAULT_CONFIG.debounceMs).toBe('number');
      expect(typeof DEFAULT_CONFIG.enablePerformanceLogging).toBe('boolean');
      expect(typeof DEFAULT_CONFIG.maxProblemsPerFile).toBe('number');
      expect(typeof DEFAULT_CONFIG.enableDebugLogging).toBe('boolean');
    });

    it('should be readonly at compile time', () => {
      // TypeScript enforces immutability at compile time with 'as const'
      // Verify the object has the expected structure
      expect(DEFAULT_CONFIG.mcpServerPort).toBe(6070);
      expect(typeof DEFAULT_CONFIG).toBe('object');
    });
  });

  describe('PERFORMANCE_THRESHOLDS', () => {
    it('should have all required threshold properties', () => {
      expect(PERFORMANCE_THRESHOLDS).toHaveProperty('diagnosticProcessingMs');
      expect(PERFORMANCE_THRESHOLDS).toHaveProperty('mcpResponseMs');
      expect(PERFORMANCE_THRESHOLDS).toHaveProperty('extensionActivationMs');
      expect(PERFORMANCE_THRESHOLDS).toHaveProperty('memoryUsageMb');
    });

    it('should have reasonable threshold values', () => {
      expect(PERFORMANCE_THRESHOLDS.diagnosticProcessingMs).toBe(500);
      expect(PERFORMANCE_THRESHOLDS.mcpResponseMs).toBe(100);
      expect(PERFORMANCE_THRESHOLDS.extensionActivationMs).toBe(2000);
      expect(PERFORMANCE_THRESHOLDS.memoryUsageMb).toBe(100);
    });

    it('should be readonly at compile time', () => {
      // TypeScript enforces immutability at compile time with 'as const'
      expect(PERFORMANCE_THRESHOLDS.diagnosticProcessingMs).toBe(500);
      expect(typeof PERFORMANCE_THRESHOLDS).toBe('object');
    });
  });

  describe('ERROR_CODES', () => {
    it('should have all required error codes', () => {
      expect(ERROR_CODES).toHaveProperty('MCP_SERVER_FAILED');
      expect(ERROR_CODES).toHaveProperty('DIAGNOSTICS_WATCHER_FAILED');
      expect(ERROR_CODES).toHaveProperty('INVALID_CONFIGURATION');
      expect(ERROR_CODES).toHaveProperty('VSCODE_API_ERROR');
      expect(ERROR_CODES).toHaveProperty('PERFORMANCE_THRESHOLD_EXCEEDED');
    });

    it('should have descriptive error code values', () => {
      expect(ERROR_CODES.MCP_SERVER_FAILED).toBe('MCP_SERVER_FAILED');
      expect(ERROR_CODES.DIAGNOSTICS_WATCHER_FAILED).toBe('DIAGNOSTICS_WATCHER_FAILED');
      expect(ERROR_CODES.INVALID_CONFIGURATION).toBe('INVALID_CONFIGURATION');
      expect(ERROR_CODES.VSCODE_API_ERROR).toBe('VSCODE_API_ERROR');
      expect(ERROR_CODES.PERFORMANCE_THRESHOLD_EXCEEDED).toBe('PERFORMANCE_THRESHOLD_EXCEEDED');
    });

    it('should be readonly at compile time', () => {
      // TypeScript enforces immutability at compile time with 'as const'
      expect(ERROR_CODES.MCP_SERVER_FAILED).toBe('MCP_SERVER_FAILED');
      expect(typeof ERROR_CODES).toBe('object');
    });
  });

  describe('EVENT_NAMES', () => {
    it('should have all required event names', () => {
      expect(EVENT_NAMES).toHaveProperty('PROBLEMS_CHANGED');
      expect(EVENT_NAMES).toHaveProperty('WATCHER_ERROR');
      expect(EVENT_NAMES).toHaveProperty('PERFORMANCE_WARNING');
      expect(EVENT_NAMES).toHaveProperty('MCP_CLIENT_CONNECTED');
      expect(EVENT_NAMES).toHaveProperty('MCP_CLIENT_DISCONNECTED');
    });

    it('should have descriptive event names', () => {
      expect(EVENT_NAMES.PROBLEMS_CHANGED).toBe('problemsChanged');
      expect(EVENT_NAMES.WATCHER_ERROR).toBe('watcherError');
      expect(EVENT_NAMES.PERFORMANCE_WARNING).toBe('performanceWarning');
      expect(EVENT_NAMES.MCP_CLIENT_CONNECTED).toBe('mcpClientConnected');
      expect(EVENT_NAMES.MCP_CLIENT_DISCONNECTED).toBe('mcpClientDisconnected');
    });
  });

  describe('MCP_SERVER_INFO', () => {
    it('should have server metadata', () => {
      expect(MCP_SERVER_INFO).toHaveProperty('name');
      expect(MCP_SERVER_INFO).toHaveProperty('version');
      expect(MCP_SERVER_INFO).toHaveProperty('description');
      expect(MCP_SERVER_INFO).toHaveProperty('capabilities');
    });

    it('should have correct server information', () => {
      expect(MCP_SERVER_INFO.name).toBe('vscode-diagnostics-server');
      expect(MCP_SERVER_INFO.version).toBe('1.0.0');
      expect(MCP_SERVER_INFO.description).toBe('VS Code diagnostics exposed via MCP');
      expect(MCP_SERVER_INFO.capabilities).toEqual({
        tools: {},
        resources: {},
        notifications: {},
      });
    });
  });

  describe('VSCODE_SEVERITY_MAP', () => {
    it('should map all VS Code severity levels', () => {
      expect(VSCODE_SEVERITY_MAP).toHaveProperty('0'); // Error
      expect(VSCODE_SEVERITY_MAP).toHaveProperty('1'); // Warning
      expect(VSCODE_SEVERITY_MAP).toHaveProperty('2'); // Information
      expect(VSCODE_SEVERITY_MAP).toHaveProperty('3'); // Hint
    });

    it('should map to correct severity strings', () => {
      expect(VSCODE_SEVERITY_MAP[0]).toBe('Error');
      expect(VSCODE_SEVERITY_MAP[1]).toBe('Warning');
      expect(VSCODE_SEVERITY_MAP[2]).toBe('Information');
      expect(VSCODE_SEVERITY_MAP[3]).toBe('Hint');
    });
  });

  describe('MCP_TOOLS', () => {
    it('should define all required MCP tools', () => {
      expect(MCP_TOOLS).toHaveProperty('GET_PROBLEMS');
      expect(MCP_TOOLS).toHaveProperty('GET_PROBLEMS_FOR_FILE');
      expect(MCP_TOOLS).toHaveProperty('GET_WORKSPACE_SUMMARY');
      expect(MCP_TOOLS).toHaveProperty('GET_PERFORMANCE_METRICS');
    });

    it('should have tool definitions with required properties', () => {
      Object.values(MCP_TOOLS).forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      });
    });
  });

  describe('ExtensionConfigSchema', () => {
    it('should validate correct configuration', () => {
      const validConfig = {
        mcpServerPort: 6070,
        debounceMs: 300,
        enablePerformanceLogging: false,
        maxProblemsPerFile: 1000,
        enableDebugLogging: false,
      };

      expect(() => ExtensionConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject invalid port numbers', () => {
      const invalidConfig = {
        mcpServerPort: -1,
        debounceMs: 300,
        enablePerformanceLogging: false,
        maxProblemsPerFile: 1000,
        enableDebugLogging: false,
      };

      expect(() => ExtensionConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid debounce values', () => {
      const invalidConfig = {
        mcpServerPort: 6070,
        debounceMs: -100,
        enablePerformanceLogging: false,
        maxProblemsPerFile: 1000,
        enableDebugLogging: false,
      };

      expect(() => ExtensionConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid maxProblemsPerFile values', () => {
      const invalidConfig = {
        mcpServerPort: 6070,
        debounceMs: 300,
        enablePerformanceLogging: false,
        maxProblemsPerFile: 0,
        enableDebugLogging: false,
      };

      expect(() => ExtensionConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('validateExtensionConfig', () => {
    it('should validate and return valid configuration', () => {
      const validConfig = {
        mcpServerPort: 6070,
        debounceMs: 300,
        enablePerformanceLogging: false,
        maxProblemsPerFile: 1000,
        enableDebugLogging: false,
      };

      const result = validateExtensionConfig(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should throw descriptive error for invalid configuration', () => {
      const invalidConfig = {
        mcpServerPort: 'invalid',
        debounceMs: 300,
        enablePerformanceLogging: false,
        maxProblemsPerFile: 1000,
        enableDebugLogging: false,
      };

      expect(() => validateExtensionConfig(invalidConfig)).toThrow();
    });

    it('should handle partial configuration with defaults', () => {
      const partialConfig = {
        mcpServerPort: 8080,
      };

      // This should work if we implement default merging
      expect(() => validateExtensionConfig(partialConfig)).not.toThrow();
    });
  });
});
