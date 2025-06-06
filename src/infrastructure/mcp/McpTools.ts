import { z } from 'zod';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';

interface McpRequest {
  params: {
    name: string;
    arguments: unknown;
  };
}

interface McpServer {
  setRequestHandler(method: string, handler: (request?: McpRequest) => Promise<unknown>): void;
}

interface McpToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export class McpTools {
  constructor(private diagnosticsWatcher: DiagnosticsWatcher) {}

  public registerTools(server: McpServer): void {
    server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'getProblems',
          description: 'Get all diagnostic problems or filter by file/severity',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Optional file path filter' },
              severity: {
                type: 'string',
                enum: ['Error', 'Warning', 'Information', 'Hint'],
                description: 'Optional severity filter',
              },
            },
          },
        },
        {
          name: 'getProblemsForFile',
          description: 'Get problems for specific file',
          inputSchema: {
            type: 'object',
            properties: { filePath: { type: 'string' } },
            required: ['filePath'],
          },
        },
        {
          name: 'getProblemsForWorkspace',
          description: 'Get problems for specific workspace',
          inputSchema: {
            type: 'object',
            properties: { workspaceName: { type: 'string' } },
            required: ['workspaceName'],
          },
        },
      ],
    }));

    server.setRequestHandler('tools/call', async (request?: McpRequest) => {
      if (!request?.params) {
        throw new Error('Invalid request: missing params');
      }

      const { name, arguments: args } = request.params;

      switch (name) {
        case 'getProblems':
          return this.handleGetProblems(args);
        case 'getProblemsForFile':
          return this.handleGetProblemsForFile(args);
        case 'getProblemsForWorkspace':
          return this.handleGetProblemsForWorkspace(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleGetProblems(args: unknown): Promise<McpToolResponse> {
    const schema = z.object({
      filePath: z.string().optional(),
      severity: z.enum(['Error', 'Warning', 'Information', 'Hint']).optional(),
    });

    const { filePath, severity } = schema.parse(args);
    let problems = filePath
      ? this.diagnosticsWatcher.getProblemsForFile(filePath)
      : this.diagnosticsWatcher.getAllProblems();

    if (severity) {
      problems = problems.filter((p) => p.severity === severity);
    }

    return this.createToolResponse({
      problems,
      count: problems.length,
      filters: { filePath, severity },
    });
  }

  private async handleGetProblemsForFile(args: unknown): Promise<McpToolResponse> {
    const { filePath } = z.object({ filePath: z.string().min(1) }).parse(args);
    const problems = this.diagnosticsWatcher.getProblemsForFile(filePath);

    return this.createToolResponse({ filePath, problems, count: problems.length });
  }

  private async handleGetProblemsForWorkspace(args: unknown): Promise<McpToolResponse> {
    const { workspaceName } = z.object({ workspaceName: z.string().min(1) }).parse(args);
    const problems = this.diagnosticsWatcher.getProblemsForWorkspace(workspaceName);

    return this.createToolResponse({ workspaceName, problems, count: problems.length });
  }

  private createToolResponse(data: unknown): McpToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
}
