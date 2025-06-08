import { z } from 'zod';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * Interface for MCP server that can register request handlers
 */
interface McpServer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void;
}

/**
 * Interface for MCP tool response structure
 */
interface McpToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * McpTools provides Model Context Protocol tools for accessing diagnostic information
 *
 * This class registers MCP tools that allow AI agents and other MCP clients to query
 * diagnostic problems from VS Code. It provides three main tools:
 * - getProblems: Get all problems with optional filtering
 * - getProblemsForFile: Get problems for a specific file
 * - getProblemsForWorkspace: Get problems for a specific workspace
 *
 * @example
 * ```typescript
 * const tools = new McpTools(diagnosticsWatcher);
 * tools.registerTools(mcpServer);
 *
 * // Clients can now call:
 * // - getProblems({ severity: 'Error' })
 * // - getProblemsForFile({ filePath: '/path/to/file.ts' })
 * // - getProblemsForWorkspace({ workspaceName: 'my-project' })
 * ```
 */
export class McpTools {
  /**
   * Creates a new McpTools instance
   * @param diagnosticsWatcher - The diagnostics watcher to query for problem data
   */
  constructor(private diagnosticsWatcher: DiagnosticsWatcher) {}

  /**
   * Registers MCP tools with the server
   *
   * Sets up request handlers for:
   * - ListToolsRequestSchema: Returns available tool definitions
   * - CallToolRequestSchema: Handles tool execution requests
   *
   * @param server - The MCP server to register tools with
   */
  public registerTools(server: McpServer): void {
    try {
      // Register the list tools handler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.setRequestHandler(ListToolsRequestSchema, async (_request: any) => {
        console.log('[MCP Tools] Handling ListToolsRequest');
        return {
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
        };
      });

      // Register the call tool handler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
        console.log('[MCP Tools] Handling CallToolRequest:', request.params?.name);

        if (!request.params) {
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

      console.log('[MCP Tools] Tools registered successfully');
    } catch (error) {
      console.error('[MCP Tools] Error registering tools:', error);
      throw error;
    }
  }

  /**
   * Handles the getProblems tool request
   *
   * @param args - Tool arguments with optional filePath and severity filters
   * @returns Promise resolving to MCP tool response with problem data
   * @throws {Error} If arguments are invalid
   */
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

  /**
   * Handles the getProblemsForFile tool request
   *
   * @param args - Tool arguments with required filePath
   * @returns Promise resolving to MCP tool response with file-specific problems
   * @throws {Error} If filePath is missing or invalid
   */
  private async handleGetProblemsForFile(args: unknown): Promise<McpToolResponse> {
    const { filePath } = z.object({ filePath: z.string().min(1) }).parse(args);
    const problems = this.diagnosticsWatcher.getProblemsForFile(filePath);

    return this.createToolResponse({ filePath, problems, count: problems.length });
  }

  /**
   * Handles the getProblemsForWorkspace tool request
   *
   * @param args - Tool arguments with required workspaceName
   * @returns Promise resolving to MCP tool response with workspace-specific problems
   * @throws {Error} If workspaceName is missing or invalid
   */
  private async handleGetProblemsForWorkspace(args: unknown): Promise<McpToolResponse> {
    const { workspaceName } = z.object({ workspaceName: z.string().min(1) }).parse(args);
    const problems = this.diagnosticsWatcher.getProblemsForWorkspace(workspaceName);

    return this.createToolResponse({ workspaceName, problems, count: problems.length });
  }

  /**
   * Creates a standardized MCP tool response
   *
   * @param data - The data to include in the response
   * @returns MCP tool response with JSON-formatted content
   */
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
