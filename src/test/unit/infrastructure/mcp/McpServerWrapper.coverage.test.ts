/**
 * @fileoverview Coverage-focused tests for McpServerWrapper tool and resource handlers
 * Targets specific uncovered lines to improve coverage from 62.09% to 95%+
 *
 * STRATEGY: Extract actual MCP request handlers and execute them directly
 * This approach is proven successful from McpTools.test.ts patterns
 */

import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    notification: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('McpServerWrapper - Systematic Handler Coverage', () => {
  let wrapper: McpServerWrapper;
  let mockWatcher: jest.Mocked<DiagnosticsWatcher>;
  let mockServer: any;

  beforeEach(() => {
    // Create comprehensive mock for DiagnosticsWatcher
    mockWatcher = {
      getFilteredProblems: jest.fn().mockReturnValue([
        {
          filePath: '/test/file1.ts',
          severity: 'Error',
          message: 'Test error 1',
          source: 'typescript',
          workspaceFolder: 'test-workspace',
        },
        {
          filePath: '/test/file2.ts',
          severity: 'Warning',
          message: 'Test warning 1',
          source: 'eslint',
          workspaceFolder: 'test-workspace',
        },
      ]),
      getProblemsForFile: jest.fn().mockReturnValue([
        {
          filePath: '/test/specific.ts',
          severity: 'Error',
          message: 'Specific file error',
          source: 'typescript',
          workspaceFolder: 'test-workspace',
        },
      ]),
      getWorkspaceSummary: jest.fn().mockReturnValue({
        totalProblems: 5,
        bySeverity: { Error: 2, Warning: 3 },
        bySource: { typescript: 3, eslint: 2 },
        byWorkspace: { 'test-workspace': 5 },
      }),
      getFilesWithProblems: jest.fn().mockReturnValue([
        { filePath: '/test/file1.ts', problemCount: 2 },
        { filePath: '/test/file2.ts', problemCount: 1 },
      ]),
      on: jest.fn(),
      off: jest.fn(),
      exportProblemsToFile: jest.fn(),
    } as any;

    // Create mock server that captures setRequestHandler calls
    mockServer = {
      setRequestHandler: jest.fn(),
      notification: jest.fn(),
      close: jest.fn(),
    };

    const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
    (Server as jest.Mock).mockReturnValue(mockServer);

    // Create wrapper which will register handlers
    wrapper = new McpServerWrapper(mockWatcher, {
      enableDebugLogging: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🎯 CRITICAL: Tool Handler Execution (Lines 132-189)', () => {
    let listToolsHandler: any;
    let callToolHandler: any;

    beforeEach(async () => {
      // Start the wrapper to trigger setupRequestHandlers()
      await wrapper.start();

      // Extract the actual registered handlers
      const setRequestHandlerCalls = mockServer.setRequestHandler.mock.calls;

      // Find ListToolsRequestSchema handler
      const listToolsCall = setRequestHandlerCalls.find(
        (call: any[]) => call[0] === ListToolsRequestSchema
      );
      listToolsHandler = listToolsCall?.[1];

      // Find CallToolRequestSchema handler
      const callToolCall = setRequestHandlerCalls.find(
        (call: any[]) => call[0] === CallToolRequestSchema
      );
      callToolHandler = callToolCall?.[1];

      expect(listToolsHandler).toBeDefined();
      expect(callToolHandler).toBeDefined();
    });

    afterEach(async () => {
      await wrapper.stop();
    });

    it('🎯 should execute ListToolsRequest handler (Line 132)', async () => {
      // GUARANTEED TO HIT: Lines 131-132 (console.log + return tools)
      const result = await listToolsHandler();

      expect(result.tools).toHaveLength(3);
      expect(result.tools[0].name).toBe('getProblems');
      expect(result.tools[1].name).toBe('getProblemsForFile');
      expect(result.tools[2].name).toBe('getWorkspaceSummary');
    });

    it('🎯 should execute getProblems tool handler (Lines 176-189)', async () => {
      const request = {
        params: {
          name: 'getProblems',
          arguments: { severity: 'Error' },
        },
      };

      // GUARANTEED TO HIT: Lines 176-189 (getProblems case)
      const result = await callToolHandler(request);

      expect(mockWatcher.getFilteredProblems).toHaveBeenCalledWith({ severity: 'Error' });
      expect(result.content[0].type).toBe('text');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.problems).toBeDefined();
      expect(responseData.count).toBe(2);
      expect(responseData.timestamp).toBeDefined();
    });

    it('🎯 should execute getProblemsForFile tool handler (Lines 214-235)', async () => {
      const request = {
        params: {
          name: 'getProblemsForFile',
          arguments: { filePath: '/test/specific.ts' },
        },
      };

      // GUARANTEED TO HIT: Lines 214-235 (getProblemsForFile case)
      const result = await callToolHandler(request);

      expect(mockWatcher.getProblemsForFile).toHaveBeenCalledWith('/test/specific.ts');
      expect(result.content[0].type).toBe('text');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.filePath).toBe('/test/specific.ts');
      expect(responseData.problems).toBeDefined();
      expect(responseData.count).toBe(1);
    });

    it('🎯 should handle missing filePath error (Lines 216-218)', async () => {
      const request = {
        params: {
          name: 'getProblemsForFile',
          arguments: {}, // Missing filePath
        },
      };

      // GUARANTEED TO HIT: Lines 216-218 (filePath validation error)
      const result = await callToolHandler(request);

      expect(result.content[0].text).toContain('Error: filePath is required');
      expect(result.isError).toBe(true);
    });

    it('🎯 should execute getWorkspaceSummary tool handler (Lines 242-258)', async () => {
      const request = {
        params: {
          name: 'getWorkspaceSummary',
          arguments: { groupBy: 'severity' },
        },
      };

      // GUARANTEED TO HIT: Lines 242-258 (getWorkspaceSummary case)
      const result = await callToolHandler(request);

      expect(mockWatcher.getWorkspaceSummary).toHaveBeenCalledWith('severity');
      expect(result.content[0].type).toBe('text');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.summary).toBeDefined();
      expect(responseData.timestamp).toBeDefined();
    });

    it('🎯 should handle unknown tool error (Lines 261-267)', async () => {
      const request = {
        params: {
          name: 'unknownTool',
          arguments: {},
        },
      };

      // GUARANTEED TO HIT: Lines 261-267 (unknown tool error)
      const result = await callToolHandler(request);

      expect(result.content[0].text).toContain('Error: Unknown tool: unknownTool');
      expect(result.isError).toBe(true);
    });

    it('🎯 should handle tool execution errors (Lines 268-277)', async () => {
      // Mock DiagnosticsWatcher to throw error
      mockWatcher.getFilteredProblems.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = {
        params: {
          name: 'getProblems',
          arguments: {},
        },
      };

      // GUARANTEED TO HIT: Lines 268-277 (error handling)
      const result = await callToolHandler(request);

      expect(result.content[0].text).toContain('Error: Database connection failed');
      expect(result.isError).toBe(true);
    });
  });

  describe('🎯 CRITICAL: Resource Handler Execution (Lines 284-339)', () => {
    let listResourcesHandler: any;
    let readResourceHandler: any;

    beforeEach(async () => {
      // Start the wrapper to trigger setupRequestHandlers()
      await wrapper.start();

      // Extract the actual registered handlers
      const setRequestHandlerCalls = mockServer.setRequestHandler.mock.calls;

      // Find ListResourcesRequestSchema handler
      const listResourcesCall = setRequestHandlerCalls.find(
        (call: any[]) => call[0] === ListResourcesRequestSchema
      );
      listResourcesHandler = listResourcesCall?.[1];

      // Find ReadResourceRequestSchema handler
      const readResourceCall = setRequestHandlerCalls.find(
        (call: any[]) => call[0] === ReadResourceRequestSchema
      );
      readResourceHandler = readResourceCall?.[1];

      expect(listResourcesHandler).toBeDefined();
      expect(readResourceHandler).toBeDefined();
    });

    afterEach(async () => {
      await wrapper.stop();
    });

    it('🎯 should execute ListResourcesRequest handler (Line 284)', async () => {
      // GUARANTEED TO HIT: Lines 283-284 (console.log + return resources)
      const result = await listResourcesHandler();

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0].uri).toBe('diagnostics://workspace/summary');
      expect(result.resources[1].uri).toBe('diagnostics://workspace/files');
    });

    it('🎯 should handle workspace/summary resource (Lines 309-320)', async () => {
      const request = {
        params: {
          uri: 'diagnostics://workspace/summary',
        },
      };

      // GUARANTEED TO HIT: Lines 309-320 (workspace/summary resource)
      const result = await readResourceHandler(request);

      expect(mockWatcher.getWorkspaceSummary).toHaveBeenCalled();
      expect(result.contents[0].uri).toBe('diagnostics://workspace/summary');
      expect(result.contents[0].mimeType).toBe('application/json');

      const content = JSON.parse(result.contents[0].text);
      expect(content.totalProblems).toBe(5);
    });

    it('🎯 should handle workspace/files resource (Lines 322-333)', async () => {
      const request = {
        params: {
          uri: 'diagnostics://workspace/files',
        },
      };

      // GUARANTEED TO HIT: Lines 322-333 (workspace/files resource)
      const result = await readResourceHandler(request);

      expect(mockWatcher.getFilesWithProblems).toHaveBeenCalled();
      expect(result.contents[0].uri).toBe('diagnostics://workspace/files');
      expect(result.contents[0].mimeType).toBe('application/json');

      const content = JSON.parse(result.contents[0].text);
      expect(Array.isArray(content)).toBe(true);
      expect(content).toHaveLength(2);
    });

    it('🎯 should handle unknown resource error (Line 335)', async () => {
      const request = {
        params: {
          uri: 'diagnostics://unknown/resource',
        },
      };

      // GUARANTEED TO HIT: Line 335 (unknown resource error)
      const result = await readResourceHandler(request);

      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(result.contents[0].text).toContain(
        'Error: Unknown resource: diagnostics://unknown/resource'
      );
    });

    it('🎯 should handle resource processing errors (Lines 336-344)', async () => {
      // Mock DiagnosticsWatcher to throw error
      mockWatcher.getWorkspaceSummary.mockImplementation(() => {
        throw new Error('Resource processing failed');
      });

      const request = {
        params: {
          uri: 'diagnostics://workspace/summary',
        },
      };

      // GUARANTEED TO HIT: Lines 336-344 (resource error handling)
      const result = await readResourceHandler(request);

      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(result.contents[0].text).toContain('Error: Resource processing failed');
    });
  });

  describe('🎯 CRITICAL: Setup and Debug Logging Coverage', () => {
    it('🎯 should execute setupRequestHandlers debug logging (Lines 126-127)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create wrapper with debug logging enabled
      const debugWrapper = new McpServerWrapper(mockWatcher, {
        enableDebugLogging: true,
      });

      await debugWrapper.start();

      // GUARANTEED TO HIT: Lines 126-127 (debug logging in setupRequestHandlers)
      expect(consoleSpy).toHaveBeenCalledWith('[MCP Server] Setting up request handlers...');

      await debugWrapper.stop();
      consoleSpy.mockRestore();
    });

    it('🎯 should execute setupRequestHandlers success logging (Line 351)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create wrapper with debug logging enabled
      const debugWrapper = new McpServerWrapper(mockWatcher, {
        enableDebugLogging: true,
      });

      await debugWrapper.start();

      // GUARANTEED TO HIT: Line 351 (success debug logging)
      expect(consoleSpy).toHaveBeenCalledWith('[MCP Server] Request handlers set up successfully');

      await debugWrapper.stop();
      consoleSpy.mockRestore();
    });

    it('🎯 should handle setupRequestHandlers errors (Lines 352-355)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock setRequestHandler to throw error
      mockServer.setRequestHandler.mockImplementation(() => {
        throw new Error('Handler registration failed');
      });

      // GUARANTEED TO HIT: Lines 352-355 (setupRequestHandlers error handling)
      await expect(wrapper.start()).rejects.toThrow('Handler registration failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[MCP Server] Error setting up request handlers:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('🎯 Additional Coverage: Event Listeners and Export', () => {
    it('🎯 should execute setupEventListeners with debug logging (Lines 370-377)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create wrapper with debug logging
      const debugWrapper = new McpServerWrapper(mockWatcher, {
        enableDebugLogging: true,
      });

      await debugWrapper.start();

      // GUARANTEED TO HIT: Lines 370-377 (event listener debug logging)
      expect(consoleSpy).toHaveBeenCalledWith('[MCP Server] Setting up event listeners...');
      expect(consoleSpy).toHaveBeenCalledWith('[MCP Server] Event listeners set up successfully');

      await debugWrapper.stop();
      consoleSpy.mockRestore();
    });

    it('🎯 should execute startContinuousExport debug logging (Lines 393-394)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create wrapper with debug logging
      const debugWrapper = new McpServerWrapper(mockWatcher, {
        enableDebugLogging: true,
      });

      await debugWrapper.start();

      // GUARANTEED TO HIT: Lines 393-394 (continuous export debug logging)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[MCP Server] Continuous export started, exporting every 2 seconds'
      );

      await debugWrapper.stop();
      consoleSpy.mockRestore();
    });
  });

  describe('🎯 CRITICAL: Additional Line Coverage', () => {
    let callToolHandler: any;

    beforeEach(async () => {
      await wrapper.start();
      const setRequestHandlerCalls = mockServer.setRequestHandler.mock.calls;
      const callToolCall = setRequestHandlerCalls.find(
        (call: any[]) => call[0] === CallToolRequestSchema
      );
      callToolHandler = callToolCall?.[1];
    });

    afterEach(async () => {
      await wrapper.stop();
    });

    it('🎯 should handle complete getProblems JSON formatting (Lines 199-213)', async () => {
      // Mock to return specific data structure
      mockWatcher.getFilteredProblems.mockReturnValue([
        {
          filePath: '/test/complete.ts',
          severity: 'Error',
          message: 'Complete test error',
          source: 'typescript',
          workspaceFolder: 'test-workspace',
          range: {
            start: { line: 10, character: 5 },
            end: { line: 10, character: 15 },
          },
        },
      ]);

      const request = {
        params: {
          name: 'getProblems',
          arguments: { severity: 'Error', workspaceFolder: 'test-workspace' },
        },
      };

      // GUARANTEED TO HIT: Lines 199-213 (complete JSON formatting)
      const result = await callToolHandler(request);

      expect(result.content[0].type).toBe('text');
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.problems).toHaveLength(1);
      expect(responseData.count).toBe(1);
      expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('🎯 should handle complete getProblemsForFile JSON formatting (Lines 225-239)', async () => {
      // Mock specific response
      mockWatcher.getProblemsForFile.mockReturnValue([
        {
          filePath: '/test/specific-complete.ts',
          severity: 'Warning',
          message: 'Specific file warning',
          source: 'eslint',
          workspaceFolder: 'test-workspace',
          range: {
            start: { line: 15, character: 8 },
            end: { line: 15, character: 20 },
          },
        },
      ]);

      const request = {
        params: {
          name: 'getProblemsForFile',
          arguments: { filePath: '/test/specific-complete.ts' },
        },
      };

      // GUARANTEED TO HIT: Lines 225-239 (complete JSON formatting)
      const result = await callToolHandler(request);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.filePath).toBe('/test/specific-complete.ts');
      expect(responseData.problems).toHaveLength(1);
      expect(responseData.count).toBe(1);
      expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('🎯 should handle complete getWorkspaceSummary JSON formatting (Lines 249-257)', async () => {
      // Mock detailed summary response
      mockWatcher.getWorkspaceSummary.mockReturnValue({
        totalProblems: 10,
        bySeverity: { Error: 4, Warning: 6 },
        bySource: { typescript: 7, eslint: 3 },
        byWorkspace: { 'test-workspace': 10 },
      });

      const request = {
        params: {
          name: 'getWorkspaceSummary',
          arguments: { groupBy: 'source' },
        },
      };

      // GUARANTEED TO HIT: Lines 249-257 (complete JSON formatting)
      const result = await callToolHandler(request);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.summary).toBeDefined();
      expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('🎯 should handle string error conversion (Line 274)', async () => {
      // Mock to throw non-Error object
      mockWatcher.getFilteredProblems.mockImplementation(() => {
        throw 'String error message'; // Non-Error object
      });

      const request = {
        params: {
          name: 'getProblems',
          arguments: {},
        },
      };

      // GUARANTEED TO HIT: Line 274 (String error conversion)
      const result = await callToolHandler(request);

      expect(result.content[0].text).toBe('Error: String error message');
      expect(result.isError).toBe(true);
    });

    it('🎯 should reach JSON formatting in getProblemsForFile (Lines 220, 222-243)', async () => {
      // Mock specific file problems for JSON formatting
      mockWatcher.getProblemsForFile.mockReturnValue([
        {
          filePath: '/test/specific-file.ts',
          severity: 'Warning',
          message: 'File-specific warning',
          source: 'eslint',
          workspaceFolder: 'test-workspace',
          range: {
            start: { line: 12, character: 15 },
            end: { line: 12, character: 25 },
          },
        },
      ]);

      const request = {
        params: {
          name: 'getProblemsForFile',
          arguments: { filePath: '/test/specific-file.ts' },
        },
      };

      // GUARANTEED TO HIT: Lines 220, 222-243 (JSON.stringify with filePath, problems, count, timestamp)
      const result = await callToolHandler(request);

      expect(result.content[0].type).toBe('text');
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.filePath).toBe('/test/specific-file.ts');
      expect(parsedResult.problems).toHaveLength(1);
      expect(parsedResult.count).toBe(1);
      expect(parsedResult.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('🎯 should reach JSON formatting in getWorkspaceSummary (Lines 246-265)', async () => {
      // Mock workspace summary for JSON formatting
      mockWatcher.getWorkspaceSummary.mockReturnValue({
        totalProblems: 5,
        errorCount: 2,
        warningCount: 3,
        infoCount: 0,
        workspaceFolders: ['test-workspace'],
      });

      const request = {
        params: {
          name: 'getWorkspaceSummary',
          arguments: { groupBy: 'severity' },
        },
      };

      // GUARANTEED TO HIT: Lines 246-265 (JSON.stringify with summary, timestamp)
      const result = await callToolHandler(request);

      expect(result.content[0].type).toBe('text');
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.summary.totalProblems).toBe(5);
      expect(parsedResult.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('🎯 should reach unknown tool error path (Lines 267-268)', async () => {
      const request = {
        params: {
          name: 'unknownTool',
          arguments: {},
        },
      };

      // GUARANTEED TO HIT: Lines 267-268 (default case: throw new Error)
      const result = await callToolHandler(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Unknown tool: unknownTool');
    });

    it('🎯 should reach tool execution error handling (Lines 271-273, 275-282)', async () => {
      // Mock to throw error during execution
      mockWatcher.getFilteredProblems.mockImplementation(() => {
        throw new Error('Tool execution failure');
      });

      const request = {
        params: {
          name: 'getProblems',
          arguments: {},
        },
      };

      // GUARANTEED TO HIT: Lines 271-273 (catch block), 275-282 (error response formatting)
      const result = await callToolHandler(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Error: Tool execution failure');
    });
  });

  describe('🎯 CRITICAL: Resource Handler Complete Coverage', () => {
    let readResourceHandler: any;

    beforeEach(async () => {
      await wrapper.start();
      const setRequestHandlerCalls = mockServer.setRequestHandler.mock.calls;
      const readResourceCall = setRequestHandlerCalls.find(
        (call: any[]) => call[0] === ReadResourceRequestSchema
      );
      readResourceHandler = readResourceCall?.[1];
    });

    afterEach(async () => {
      await wrapper.stop();
    });

    it('🎯 should handle complete workspace/summary JSON formatting (Lines 313-322)', async () => {
      // Mock detailed workspace summary
      mockWatcher.getWorkspaceSummary.mockReturnValue({
        totalProblems: 15,
        bySeverity: { Error: 5, Warning: 8, Information: 2 },
        bySource: { typescript: 10, eslint: 5 },
        byWorkspace: { 'main-workspace': 15 },
      });

      const request = {
        params: {
          uri: 'diagnostics://workspace/summary',
        },
      };

      // GUARANTEED TO HIT: Lines 313-322 (complete JSON formatting)
      const result = await readResourceHandler(request);

      expect(result.contents[0].mimeType).toBe('application/json');
      const content = JSON.parse(result.contents[0].text);
      expect(content.totalProblems).toBe(15);
      expect(content.bySeverity.Error).toBe(5);
      expect(content.bySource.typescript).toBe(10);
    });

    it('🎯 should handle complete workspace/files JSON formatting (Lines 326-335)', async () => {
      // Mock detailed files with problems
      mockWatcher.getFilesWithProblems.mockReturnValue([
        '/test/file1.ts',
        '/test/file2.ts',
        '/test/file3.ts',
      ]);

      const request = {
        params: {
          uri: 'diagnostics://workspace/files',
        },
      };

      // GUARANTEED TO HIT: Lines 326-335 (complete JSON formatting)
      const result = await readResourceHandler(request);

      expect(result.contents[0].mimeType).toBe('application/json');
      const content = JSON.parse(result.contents[0].text);
      expect(Array.isArray(content)).toBe(true);
      expect(content).toHaveLength(3);
      expect(content[0]).toBe('/test/file1.ts');
    });

    it('🎯 should handle string error conversion in resources (Line 344)', async () => {
      // Mock to throw non-Error object
      mockWatcher.getWorkspaceSummary.mockImplementation(() => {
        throw 'Resource string error'; // Non-Error object
      });

      const request = {
        params: {
          uri: 'diagnostics://workspace/summary',
        },
      };

      // GUARANTEED TO HIT: Line 344 (String error conversion)
      const result = await readResourceHandler(request);

      expect(result.contents[0].text).toBe('Error: Resource string error');
      expect(result.contents[0].mimeType).toBe('text/plain');
    });
  });
});
