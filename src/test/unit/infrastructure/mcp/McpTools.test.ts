import { McpTools } from '@infrastructure/mcp/McpTools';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { ProblemItem } from '@shared/types';

describe('McpTools', () => {
  let mockWatcher: jest.Mocked<DiagnosticsWatcher>;
  let mcpTools: McpTools;
  let mockServer: any;

  const mockProblems: ProblemItem[] = [
    {
      filePath: '/test/file1.ts',
      workspaceFolder: 'test-workspace',
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 },
      },
      severity: 'Error',
      message: 'Test error message',
      source: 'typescript',
      code: 'TS2304',
    },
    {
      filePath: '/test/file2.ts',
      workspaceFolder: 'test-workspace',
      range: {
        start: { line: 5, character: 0 },
        end: { line: 5, character: 15 },
      },
      severity: 'Warning',
      message: 'Test warning message',
      source: 'eslint',
      code: 'no-unused-vars',
    },
  ];

  beforeEach(() => {
    mockWatcher = {
      getAllProblems: jest.fn().mockReturnValue(mockProblems),
      getProblemsForFile: jest.fn().mockReturnValue([mockProblems[0]]),
      getProblemsForWorkspace: jest.fn().mockReturnValue(mockProblems),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      dispose: jest.fn(),
    } as any;

    mockServer = {
      setRequestHandler: jest.fn(),
    };

    mcpTools = new McpTools(mockWatcher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create McpTools instance with diagnostics watcher', () => {
      expect(mcpTools).toBeDefined();
    });
  });

  describe('Tool Registration', () => {
    beforeEach(() => {
      mcpTools.registerTools(mockServer);
    });

    it('should register tools/list handler', () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should register tools/call handler', () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should return correct tools list', async () => {
      // Get the first handler (ListToolsRequestSchema)
      const listHandler = mockServer.setRequestHandler.mock.calls[0][1];

      const result = await listHandler();

      expect(result.tools).toHaveLength(3);
      expect(result.tools[0].name).toBe('getProblems');
      expect(result.tools[1].name).toBe('getProblemsForFile');
      expect(result.tools[2].name).toBe('getProblemsForWorkspace');
    });
  });

  describe('getProblems Tool', () => {
    let callHandler: any;

    beforeEach(() => {
      mcpTools.registerTools(mockServer);
      // Get the second handler (CallToolRequestSchema)
      callHandler = mockServer.setRequestHandler.mock.calls[1][1];
    });

    it('should handle getProblems without filters', async () => {
      const request = {
        params: {
          name: 'getProblems',
          arguments: {},
        },
      };

      const result = await callHandler(request);

      expect(mockWatcher.getAllProblems).toHaveBeenCalled();
      expect(result.content[0].type).toBe('text');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.problems).toEqual(mockProblems);
      expect(responseData.count).toBe(2);
    });

    it('should handle getProblems with filePath filter', async () => {
      const request = {
        params: {
          name: 'getProblems',
          arguments: { filePath: '/test/file1.ts' },
        },
      };

      const result = await callHandler(request);

      expect(mockWatcher.getProblemsForFile).toHaveBeenCalledWith('/test/file1.ts');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.problems).toEqual([mockProblems[0]]);
      expect(responseData.filters.filePath).toBe('/test/file1.ts');
    });

    it('should handle getProblems with severity filter', async () => {
      const request = {
        params: {
          name: 'getProblems',
          arguments: { severity: 'Error' },
        },
      };

      const result = await callHandler(request);

      expect(mockWatcher.getAllProblems).toHaveBeenCalled();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.problems).toHaveLength(1);
      expect(responseData.problems[0].severity).toBe('Error');
    });

    it('should validate input arguments', async () => {
      const request = {
        params: {
          name: 'getProblems',
          arguments: { severity: 'InvalidSeverity' },
        },
      };

      await expect(callHandler(request)).rejects.toThrow();
    });
  });

  describe('getProblemsForFile Tool', () => {
    let callHandler: any;

    beforeEach(() => {
      mcpTools.registerTools(mockServer);
      // Get the second handler (CallToolRequestSchema)
      callHandler = mockServer.setRequestHandler.mock.calls[1][1];
    });

    it('should handle getProblemsForFile with valid filePath', async () => {
      const request = {
        params: {
          name: 'getProblemsForFile',
          arguments: { filePath: '/test/file1.ts' },
        },
      };

      const result = await callHandler(request);

      expect(mockWatcher.getProblemsForFile).toHaveBeenCalledWith('/test/file1.ts');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.filePath).toBe('/test/file1.ts');
      expect(responseData.problems).toEqual([mockProblems[0]]);
      expect(responseData.count).toBe(1);
    });

    it('should validate required filePath argument', async () => {
      const request = {
        params: {
          name: 'getProblemsForFile',
          arguments: {},
        },
      };

      await expect(callHandler(request)).rejects.toThrow();
    });

    it('should validate non-empty filePath', async () => {
      const request = {
        params: {
          name: 'getProblemsForFile',
          arguments: { filePath: '' },
        },
      };

      await expect(callHandler(request)).rejects.toThrow();
    });
  });

  describe('getProblemsForWorkspace Tool', () => {
    let callHandler: any;

    beforeEach(() => {
      mcpTools.registerTools(mockServer);
      // Get the second handler (CallToolRequestSchema)
      callHandler = mockServer.setRequestHandler.mock.calls[1][1];
    });

    it('should handle getProblemsForWorkspace with valid workspaceName', async () => {
      const request = {
        params: {
          name: 'getProblemsForWorkspace',
          arguments: { workspaceName: 'test-workspace' },
        },
      };

      const result = await callHandler(request);

      expect(mockWatcher.getProblemsForWorkspace).toHaveBeenCalledWith('test-workspace');

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.workspaceName).toBe('test-workspace');
      expect(responseData.problems).toEqual(mockProblems);
      expect(responseData.count).toBe(2);
    });

    it('should validate required workspaceName argument', async () => {
      const request = {
        params: {
          name: 'getProblemsForWorkspace',
          arguments: {},
        },
      };

      await expect(callHandler(request)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    let callHandler: any;

    beforeEach(() => {
      mcpTools.registerTools(mockServer);
      // Get the second handler (CallToolRequestSchema)
      callHandler = mockServer.setRequestHandler.mock.calls[1][1];
    });

    it('should throw error for unknown tool', async () => {
      const request = {
        params: {
          name: 'unknownTool',
          arguments: {},
        },
      };

      await expect(callHandler(request)).rejects.toThrow('Unknown tool: unknownTool');
    });

    it('should handle diagnostics watcher errors gracefully', async () => {
      mockWatcher.getAllProblems.mockImplementation(() => {
        throw new Error('Watcher error');
      });

      const request = {
        params: {
          name: 'getProblems',
          arguments: {},
        },
      };

      await expect(callHandler(request)).rejects.toThrow('Watcher error');
    });
  });
});
