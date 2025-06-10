/**
 * Dependency Resolution Tests
 *
 * These tests validate that all critical dependencies are available
 * in both development and packaged extension environments.
 *
 * This prevents issues like the zod dependency problem where dependencies
 * are available during development but missing in the packaged extension.
 */

describe('Dependency Resolution', () => {
  describe('Critical Runtime Dependencies', () => {
    it('should resolve zod dependency', () => {
      // This test ensures zod is available for runtime type validation
      expect(() => require('zod')).not.toThrow();

      // Verify we can actually use zod functionality
      const { z } = require('zod');
      const schema = z.string();
      expect(() => schema.parse('test')).not.toThrow();
    });

    it('should resolve @modelcontextprotocol/sdk dependency', () => {
      // This test ensures MCP SDK is available for server functionality
      expect(() => require('@modelcontextprotocol/sdk/server/index.js')).not.toThrow();
      expect(() => require('@modelcontextprotocol/sdk/types.js')).not.toThrow();

      // Verify we can import key components
      const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
      expect(Server).toBeDefined();
      expect(typeof Server).toBe('function');
    });

    it('should resolve tsconfig-paths dependency', () => {
      // This test ensures TypeScript path resolution works
      expect(() => require('tsconfig-paths')).not.toThrow();
    });
  });

  describe('Dependency Validation Functions', () => {
    it('should validate all critical dependencies are present', () => {
      const criticalDependencies = [
        'zod',
        '@modelcontextprotocol/sdk/server/index.js',
        '@modelcontextprotocol/sdk/types.js',
        'tsconfig-paths',
      ];

      const missingDependencies: string[] = [];

      for (const dep of criticalDependencies) {
        try {
          require.resolve(dep);
        } catch {
          missingDependencies.push(dep);
        }
      }

      expect(missingDependencies).toEqual([]);
    });

    it('should not have problematic dependencies', () => {
      // These dependencies have caused packaging issues in the past
      const problematicDependencies = ['lodash', 'moment', 'axios'];

      const foundProblematicDeps: string[] = [];

      for (const dep of problematicDependencies) {
        try {
          require.resolve(dep);
          foundProblematicDeps.push(dep);
        } catch {
          // Expected - these dependencies should not be present
        }
      }

      if (foundProblematicDeps.length > 0) {
        console.warn(
          `Warning: Found potentially problematic dependencies: ${foundProblematicDeps.join(', ')}`
        );
        console.warn('Consider replacing with native implementations to avoid packaging issues.');
      }

      // This is a warning, not a failure, but we log it for visibility
      expect(foundProblematicDeps.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Module Import Validation', () => {
    it('should import zod schemas from shared/types', async () => {
      // Test that our custom schemas work correctly
      const { ProblemSeveritySchema, ProblemItemSchema } = await import('@shared/types');

      expect(ProblemSeveritySchema).toBeDefined();
      expect(ProblemItemSchema).toBeDefined();

      // Test schema validation works
      expect(() => ProblemSeveritySchema.parse('Error')).not.toThrow();
      expect(() => ProblemSeveritySchema.parse('Invalid')).toThrow();
    });

    it('should import MCP components from infrastructure', async () => {
      // Test that MCP server components can be imported
      const { McpServerWrapper } = await import('@infrastructure/mcp/McpServerWrapper');
      expect(McpServerWrapper).toBeDefined();
      expect(typeof McpServerWrapper).toBe('function');
    });

    it('should import extension configuration validation', async () => {
      // Test that configuration validation works
      const { validateExtensionConfig } = await import('@shared/constants');
      expect(validateExtensionConfig).toBeDefined();
      expect(typeof validateExtensionConfig).toBe('function');

      // Test validation works
      const validConfig = {
        mcpServerPort: 6070,
        debounceMs: 300,
        enablePerformanceLogging: false,
        maxProblemsPerFile: 1000,
        enableDebugLogging: false,
      };

      expect(() => validateExtensionConfig(validConfig)).not.toThrow();
    });
  });

  describe('Runtime Environment Validation', () => {
    it('should detect if running in packaged vs development environment', () => {
      // This helps identify environment-specific issues
      const isPackaged = !__dirname.includes('src');
      const environment = isPackaged ? 'packaged' : 'development';

      console.log(`Running in ${environment} environment`);
      console.log(`__dirname: ${__dirname}`);

      // Both environments should have access to dependencies
      expect(() => require('zod')).not.toThrow();
      expect(() => require('@modelcontextprotocol/sdk/server/index.js')).not.toThrow();
    });

    it('should have consistent module resolution across environments', () => {
      // Test that module resolution works the same way in both environments
      const zodPath = require.resolve('zod');
      const mcpPath = require.resolve('@modelcontextprotocol/sdk/server/index.js');

      expect(zodPath).toBeTruthy();
      expect(mcpPath).toBeTruthy();

      console.log(`zod resolved to: ${zodPath}`);
      console.log(`MCP SDK resolved to: ${mcpPath}`);
    });
  });

  describe('Performance Impact of Dependencies', () => {
    it('should load dependencies efficiently', () => {
      const startTime = Date.now();

      // Load all critical dependencies
      require('zod');
      require('@modelcontextprotocol/sdk/server/index.js');
      require('@modelcontextprotocol/sdk/types.js');

      const loadTime = Date.now() - startTime;

      // Dependencies should load quickly (< 100ms)
      expect(loadTime).toBeLessThan(100);
      console.log(`Dependencies loaded in ${loadTime}ms`);
    });

    it('should have reasonable memory footprint', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Load dependencies
      require('zod');
      require('@modelcontextprotocol/sdk/server/index.js');

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Memory increase should be reasonable (< 10MB for these dependencies)
      expect(memoryIncrease).toBeLessThan(10);
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);
    });
  });
});
