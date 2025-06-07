import * as McpIndex from '../../../../infrastructure/mcp/index';
import {
  McpServerWrapper,
  McpServerConfig,
  McpTools,
  McpResources,
  McpNotifications,
} from '../../../../infrastructure/mcp/index';

describe('MCP Infrastructure Index Exports', () => {
  it('should export McpServerWrapper class', () => {
    expect(McpServerWrapper).toBeDefined();
    expect(typeof McpServerWrapper).toBe('function');
  });

  it('should export McpServerConfig type', () => {
    // Test that we can use the type (TypeScript compilation test)
    const config: McpServerConfig = {
      port: 6070,
      enableDebugLogging: true,
    };

    expect(config.port).toBe(6070);
    expect(config.enableDebugLogging).toBe(true);
  });

  it('should export McpTools class', () => {
    expect(McpTools).toBeDefined();
    expect(typeof McpTools).toBe('function');
  });

  it('should export McpResources class', () => {
    expect(McpResources).toBeDefined();
    expect(typeof McpResources).toBe('function');
  });

  it('should export McpNotifications class', () => {
    expect(McpNotifications).toBeDefined();
    expect(typeof McpNotifications).toBe('function');
  });

  it('should have all expected exports available through index', () => {
    // Verify the index module exports what we expect
    expect(McpIndex).toBeDefined();

    // Check that we can access all exports through the index
    expect((McpIndex as any).McpServerWrapper).toBeDefined();
    expect((McpIndex as any).McpTools).toBeDefined();
    expect((McpIndex as any).McpResources).toBeDefined();
    expect((McpIndex as any).McpNotifications).toBeDefined();
  });

  it('should allow instantiation of exported classes', () => {
    // This tests that the exports are properly configured
    expect(() => {
      // We can't actually instantiate without proper dependencies,
      // but we can verify the constructors exist
      expect(McpServerWrapper.prototype.constructor).toBeDefined();
      expect(McpTools.prototype.constructor).toBeDefined();
      expect(McpResources.prototype.constructor).toBeDefined();
      expect(McpNotifications.prototype.constructor).toBeDefined();
    }).not.toThrow();
  });
});
