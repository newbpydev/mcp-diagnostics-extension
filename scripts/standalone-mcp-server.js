#!/usr/bin/env node

/**
 * Standalone MCP Server for Diagnostics
 * This script runs the MCP server independently for use with Cursor
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

class StandaloneMcpServer {
  constructor() {
    this.server = new Server(
      {
        name: 'vscode-diagnostics-server',
        version: '1.0.9',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('[MCP Server] Handling ListToolsRequest');
      return {
        tools: [
          {
            name: 'getProblems',
            description: 'Get all current problems/diagnostics from the workspace',
            inputSchema: {
              type: 'object',
              properties: {
                severity: {
                  type: 'string',
                  enum: ['Error', 'Warning', 'Information', 'Hint'],
                  description: 'Filter by problem severity',
                },
                workspaceFolder: {
                  type: 'string',
                  description: 'Filter by workspace folder name',
                },
                filePath: {
                  type: 'string',
                  description: 'Filter by specific file path',
                },
              },
            },
          },
          {
            name: 'getProblemsForFile',
            description: 'Get problems for a specific file',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Absolute file path',
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'getWorkspaceSummary',
            description: 'Get summary statistics of problems across workspace',
            inputSchema: {
              type: 'object',
              properties: {
                groupBy: {
                  type: 'string',
                  enum: ['severity', 'source', 'workspaceFolder'],
                  description: 'How to group the summary statistics',
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(`[MCP Server] Handling tool call: ${request.params.name}`);

      try {
        switch (request.params.name) {
          case 'getProblems': {
            const args = request.params.arguments || {};

            // Mock response for demonstration
            const mockProblems = [
              {
                filePath: '/workspace/src/example.ts',
                workspaceFolder: 'current-workspace',
                range: {
                  start: { line: 10, character: 5 },
                  end: { line: 10, character: 15 }
                },
                severity: 'Error',
                message: 'Type error: Cannot assign string to number',
                source: 'typescript',
                code: '2322'
              },
              {
                filePath: '/workspace/src/utils.js',
                workspaceFolder: 'current-workspace',
                range: {
                  start: { line: 25, character: 0 },
                  end: { line: 25, character: 20 }
                },
                severity: 'Warning',
                message: 'Unused variable: unusedVar',
                source: 'eslint',
                code: 'no-unused-vars'
              }
            ];

            // Apply filters if provided
            let filteredProblems = mockProblems;
            if (args.severity) {
              filteredProblems = filteredProblems.filter(p => p.severity === args.severity);
            }
            if (args.filePath) {
              filteredProblems = filteredProblems.filter(p => p.filePath.includes(args.filePath));
            }
            if (args.workspaceFolder) {
              filteredProblems = filteredProblems.filter(p => p.workspaceFolder === args.workspaceFolder);
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      problems: filteredProblems,
                      count: filteredProblems.length,
                      timestamp: new Date().toISOString(),
                      filters: args
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'getProblemsForFile': {
            const args = request.params.arguments || {};
            if (!args.filePath) {
              throw new Error('filePath is required');
            }

            // Mock response for specific file
            const fileProblems = [
              {
                filePath: args.filePath,
                workspaceFolder: 'current-workspace',
                range: {
                  start: { line: 5, character: 10 },
                  end: { line: 5, character: 20 }
                },
                severity: 'Error',
                message: 'Syntax error: Missing semicolon',
                source: 'typescript',
                code: '1005'
              }
            ];

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      filePath: args.filePath,
                      problems: fileProblems,
                      count: fileProblems.length,
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'getWorkspaceSummary': {
            const args = request.params.arguments || {};

            // Mock workspace summary
            const summary = {
              totalProblems: 2,
              bySevertiy: {
                Error: 1,
                Warning: 1,
                Information: 0,
                Hint: 0
              },
              bySource: {
                typescript: 1,
                eslint: 1
              },
              byWorkspace: {
                'current-workspace': 2
              },
              affectedFiles: 2,
              groupBy: args.groupBy || 'severity'
            };

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      summary,
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error('[MCP Server] Tool execution error:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[MCP Server] ✅ MCP Diagnostics server started successfully!');
    console.error('[MCP Server] Available tools:');
    console.error('[MCP Server] - getProblems: Get all current problems/diagnostics');
    console.error('[MCP Server] - getProblemsForFile: Get problems for a specific file');
    console.error('[MCP Server] - getWorkspaceSummary: Get summary statistics of problems');
    console.error('[MCP Server] Server is ready to accept MCP connections via stdio');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[MCP Server] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MCP Server] Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the server
const server = new StandaloneMcpServer();
server.start().catch((error) => {
  console.error('[MCP Server] ❌ Failed to start MCP server:', error);
  process.exit(1);
});
