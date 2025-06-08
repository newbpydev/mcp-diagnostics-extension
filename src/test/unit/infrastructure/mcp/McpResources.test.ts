import { McpResources } from '../../../../infrastructure/mcp/McpResources';
import { ProblemItem } from '../../../../shared/types';

// Mock the DiagnosticsWatcher
const mockDiagnosticsWatcher = {
  getAllProblems: jest.fn(),
  getProblemsForFile: jest.fn(),
  getProblemsForWorkspace: jest.fn(),
} as any;

// Mock server interface
const mockServer = {
  setRequestHandler: jest.fn(),
};

const mockProblems: ProblemItem[] = [
  {
    filePath: '/workspace/src/file1.ts',
    workspaceFolder: 'my-project',
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
    severity: 'Error',
    message: 'Test error 1',
    source: 'typescript',
    code: 'TS2304',
  },
  {
    filePath: '/workspace/src/file1.ts',
    workspaceFolder: 'my-project',
    range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
    severity: 'Warning',
    message: 'Test warning 1',
    source: 'eslint',
    code: 'no-unused-vars',
  },
  {
    filePath: '/workspace/src/file2.ts',
    workspaceFolder: 'my-project',
    range: { start: { line: 2, character: 0 }, end: { line: 2, character: 8 } },
    severity: 'Information',
    message: 'Test info 1',
    source: 'typescript',
  },
  {
    filePath: '/workspace/other/file3.ts',
    workspaceFolder: 'other-project',
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 15 } },
    severity: 'Error',
    message: 'Test error 2',
    source: 'typescript',
    code: 'TS2345',
  },
];

describe('McpResources', () => {
  let mcpResources: McpResources;

  beforeEach(() => {
    jest.clearAllMocks();
    mcpResources = new McpResources(mockDiagnosticsWatcher);
  });

  describe('Initialization', () => {
    it('should create McpResources instance with diagnostics watcher', () => {
      expect(mcpResources).toBeDefined();
    });
  });

  describe('Resource Registration', () => {
    beforeEach(() => {
      mcpResources.registerResources(mockServer);
    });

    it('should register resources/list handler', () => {
      mcpResources.registerResources(mockServer);
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should register resources/read handler', () => {
      mcpResources.registerResources(mockServer);
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('Resources List', () => {
    beforeEach(() => {
      mockDiagnosticsWatcher.getAllProblems.mockReturnValue(mockProblems);
      mcpResources.registerResources(mockServer);
    });

    it('should return summary resource', async () => {
      // Get the first handler (ListResourcesRequestSchema)
      const listHandler = mockServer.setRequestHandler.mock.calls[0][1];

      const result = await listHandler();

      expect(result.resources).toContainEqual({
        uri: 'diagnostics://summary',
        name: 'Problems Summary',
        description: 'Summary of all diagnostic problems',
        mimeType: 'application/json',
      });
    });

    it('should return file resources for each unique file', async () => {
      // Get the first handler (ListResourcesRequestSchema)
      const listHandler = mockServer.setRequestHandler.mock.calls[0][1];

      const result = await listHandler();

      expect(result.resources).toContainEqual({
        uri: 'diagnostics://file/%2Fworkspace%2Fsrc%2Ffile1.ts',
        name: 'Problems in /workspace/src/file1.ts',
        description: 'Diagnostic problems for file: /workspace/src/file1.ts',
        mimeType: 'application/json',
      });

      expect(result.resources).toContainEqual({
        uri: 'diagnostics://file/%2Fworkspace%2Fsrc%2Ffile2.ts',
        name: 'Problems in /workspace/src/file2.ts',
        description: 'Diagnostic problems for file: /workspace/src/file2.ts',
        mimeType: 'application/json',
      });
    });

    it('should return workspace resources for each unique workspace', async () => {
      // Get the first handler (ListResourcesRequestSchema)
      const listHandler = mockServer.setRequestHandler.mock.calls[0][1];

      const result = await listHandler();

      expect(result.resources).toContainEqual({
        uri: 'diagnostics://workspace/my-project',
        name: 'Problems in my-project',
        description: 'All problems in workspace: my-project',
        mimeType: 'application/json',
      });

      expect(result.resources).toContainEqual({
        uri: 'diagnostics://workspace/other-project',
        name: 'Problems in other-project',
        description: 'All problems in workspace: other-project',
        mimeType: 'application/json',
      });
    });

    it('should handle empty problems list', async () => {
      mockDiagnosticsWatcher.getAllProblems.mockReturnValue([]);

      // Get the first handler (ListResourcesRequestSchema)
      const listHandler = mockServer.setRequestHandler.mock.calls[0][1];

      const result = await listHandler();

      expect(result.resources).toEqual([
        {
          uri: 'diagnostics://summary',
          name: 'Problems Summary',
          description: 'Summary of all diagnostic problems',
          mimeType: 'application/json',
        },
      ]);
    });
  });

  describe('Resource Reading', () => {
    beforeEach(() => {
      mockDiagnosticsWatcher.getAllProblems.mockReturnValue(mockProblems);
      mockDiagnosticsWatcher.getProblemsForFile.mockImplementation((filePath: string) =>
        mockProblems.filter((p) => p.filePath === filePath)
      );
      mockDiagnosticsWatcher.getProblemsForWorkspace.mockImplementation((workspace: string) =>
        mockProblems.filter((p) => p.workspaceFolder === workspace)
      );
      mcpResources.registerResources(mockServer);
    });

    it('should read summary resource', async () => {
      // Get the second handler (ReadResourceRequestSchema)
      const readHandler = mockServer.setRequestHandler.mock.calls[1][1];

      const result = await readHandler({ params: { uri: 'diagnostics://summary' } });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('diagnostics://summary');
      expect(result.contents[0].mimeType).toBe('application/json');

      const summary = JSON.parse(result.contents[0].text);
      expect(summary.totalProblems).toBe(4);
      expect(summary.bySeverity.Error).toBe(2);
      expect(summary.bySeverity.Warning).toBe(1);
      expect(summary.bySeverity.Information).toBe(1);
      expect(summary.byWorkspace['my-project']).toBe(3);
      expect(summary.byWorkspace['other-project']).toBe(1);
    });

    it('should read file resource', async () => {
      // Get the second handler (ReadResourceRequestSchema)
      const readHandler = mockServer.setRequestHandler.mock.calls[1][1];

      const result = await readHandler({
        params: { uri: 'diagnostics://file/%2Fworkspace%2Fsrc%2Ffile1.ts' },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('diagnostics://file/%2Fworkspace%2Fsrc%2Ffile1.ts');
      expect(result.contents[0].mimeType).toBe('application/json');

      const fileData = JSON.parse(result.contents[0].text);
      expect(fileData.filePath).toBe('/workspace/src/file1.ts');
      expect(fileData.problems).toHaveLength(2);
      expect(fileData.count).toBe(2);
      expect(fileData.generatedAt).toBeDefined();
    });

    it('should read workspace resource', async () => {
      // Get the second handler (ReadResourceRequestSchema)
      const readHandler = mockServer.setRequestHandler.mock.calls[1][1];

      const result = await readHandler({
        params: { uri: 'diagnostics://workspace/my-project' },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('diagnostics://workspace/my-project');
      expect(result.contents[0].mimeType).toBe('application/json');

      const workspaceData = JSON.parse(result.contents[0].text);
      expect(workspaceData.workspace).toBe('my-project');
      expect(workspaceData.problems).toHaveLength(3);
      expect(workspaceData.count).toBe(3);
      expect(workspaceData.generatedAt).toBeDefined();
    });

    it('should handle URL encoded file paths', async () => {
      // Get the second handler (ReadResourceRequestSchema)
      const readHandler = mockServer.setRequestHandler.mock.calls[1][1];

      const result = await readHandler({
        params: { uri: 'diagnostics://file/%2Fworkspace%2Fother%2Ffile3.ts' },
      });

      const fileData = JSON.parse(result.contents[0].text);
      expect(fileData.filePath).toBe('/workspace/other/file3.ts');
      expect(fileData.problems).toHaveLength(1);
    });

    it('should throw error for unknown resource URI', async () => {
      // Get the second handler (ReadResourceRequestSchema)
      const readHandler = mockServer.setRequestHandler.mock.calls[1][1];

      await expect(
        readHandler({
          params: { uri: 'diagnostics://unknown/resource' },
        })
      ).rejects.toThrow('Unknown resource URI: diagnostics://unknown/resource');
    });
  });

  describe('Summary Generation', () => {
    it('should group problems by file correctly', async () => {
      mockDiagnosticsWatcher.getAllProblems.mockReturnValue(mockProblems);
      mcpResources.registerResources(mockServer);

      // Get the second handler (ReadResourceRequestSchema)
      const readHandler = mockServer.setRequestHandler.mock.calls[1][1];

      const result = await readHandler({ params: { uri: 'diagnostics://summary' } });
      const summary = JSON.parse(result.contents[0].text);

      expect(summary.byFile['/workspace/src/file1.ts']).toBe(2);
      expect(summary.byFile['/workspace/src/file2.ts']).toBe(1);
      expect(summary.byFile['/workspace/other/file3.ts']).toBe(1);
    });

    it('should include timestamp in generated resources', async () => {
      mockDiagnosticsWatcher.getAllProblems.mockReturnValue(mockProblems);
      mockDiagnosticsWatcher.getProblemsForFile.mockReturnValue([mockProblems[0]] as ProblemItem[]);
      mcpResources.registerResources(mockServer);

      // Get the second handler (ReadResourceRequestSchema)
      const readHandler = mockServer.setRequestHandler.mock.calls[1][1];

      const result = await readHandler({
        params: { uri: 'diagnostics://file/%2Fworkspace%2Fsrc%2Ffile1.ts' },
      });

      const fileData = JSON.parse(result.contents[0].text);
      expect(fileData.generatedAt).toBeDefined();
      expect(new Date(fileData.generatedAt)).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in resource list generation', async () => {
      mockDiagnosticsWatcher.getAllProblems.mockImplementation(() => {
        throw new Error('Test error');
      });
      mcpResources.registerResources(mockServer);

      // Get the first handler (ListResourcesRequestSchema)
      const listHandler = mockServer.setRequestHandler.mock.calls[0][1];

      await expect(listHandler()).rejects.toThrow('Test error');
    });

    it('should handle errors in resource reading', async () => {
      mockDiagnosticsWatcher.getAllProblems.mockImplementation(() => {
        throw new Error('Test error');
      });
      mcpResources.registerResources(mockServer);

      // Get the second handler (ReadResourceRequestSchema)
      const readHandler = mockServer.setRequestHandler.mock.calls[1][1];

      await expect(readHandler({ params: { uri: 'diagnostics://summary' } })).rejects.toThrow(
        'Test error'
      );
    });
  });
});
