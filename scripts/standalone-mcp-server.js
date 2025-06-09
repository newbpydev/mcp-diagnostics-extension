#!/usr/bin/env node

/**
 * Standalone MCP Server for Diagnostics
 *
 * ⚠️  IMPORTANT: This is a MOCK server for testing MCP integration!
 *
 * This script provides a standalone MCP server that simulates diagnostic data
 * for testing purposes when the VS Code extension is not available.
 *
 * For REAL diagnostics from VS Code, use the actual extension in VS Code
 * Extension Development Host (F5) which connects to the real VS Code API.
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
        name: 'vscode-diagnostics-server-mock',
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
      console.error('[MOCK MCP Server] Handling ListToolsRequest');
      return {
        tools: [
          {
            name: 'getProblems',
            description: '🧪 MOCK: Get simulated problems/diagnostics (not real VS Code data)',
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
            description: '🧪 MOCK: Get simulated problems for a specific file',
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
            description: '🧪 MOCK: Get simulated workspace summary statistics',
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
      console.error(`[MOCK MCP Server] Handling tool call: ${request.params.name}`);

      // Move require statements to the top of the handler
      const fs = require('fs');
      const path = require('path');

      try {
        switch (request.params.name) {
          case 'getProblems': {
            const args = request.params.arguments || {};

            // Check if we're in a real workspace with test files

            let mockProblems = [];

            // Try to detect if we're in the extension workspace
            const testFilePath = path.join(process.cwd(), 'test-workspace/example.ts');
            const testJsFilePath = path.join(process.cwd(), 'test-workspace/utils.js');

            if (fs.existsSync(testFilePath)) {
              // We're in the extension workspace, provide realistic mock data
              mockProblems = [
                {
                  filePath: testFilePath,
                  workspaceFolder: 'mcp-diagnostics-extension',
                  range: {
                    start: { line: 10, character: 5 },
                    end: { line: 10, character: 9 }
                  },
                  severity: 'Error',
                  message: 'Type \'string\' is not assignable to type \'number\'',
                  source: 'typescript',
                  code: '2322'
                }
              ];

              if (fs.existsSync(testJsFilePath)) {
                mockProblems.push({
                  filePath: testJsFilePath,
                  workspaceFolder: 'mcp-diagnostics-extension',
                  range: {
                    start: { line: 4, character: 6 },
                    end: { line: 4, character: 15 }
                  },
                  severity: 'Warning',
                  message: '\'unusedVar\' is assigned a value but never used',
                  source: 'eslint',
                  code: 'no-unused-vars'
                });
              }
            } else {
              // Generic mock data for other workspaces
              mockProblems = [
                {
                  filePath: path.join(process.cwd(), 'example-file.ts'),
                  workspaceFolder: path.basename(process.cwd()),
                  range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 10 }
                  },
                  severity: 'Information',
                  message: '🧪 MOCK: This is simulated diagnostic data. For real diagnostics, use the VS Code extension.',
                  source: 'mock-server',
                  code: 'MOCK001'
                }
              ];
            }

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
                      notice: "🧪 MOCK SERVER: This is simulated data. For real VS Code diagnostics, use the extension in VS Code Extension Development Host (F5).",
                      problems: filteredProblems,
                      count: filteredProblems.length,
                      timestamp: new Date().toISOString(),
                      filters: args,
                      serverType: "mock-standalone"
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
                workspaceFolder: path.basename(process.cwd()),
                range: {
                  start: { line: 1, character: 0 },
                  end: { line: 1, character: 10 }
                },
                severity: 'Information',
                message: '🧪 MOCK: Simulated diagnostic for requested file. Use VS Code extension for real diagnostics.',
                source: 'mock-server',
                code: 'MOCK002'
              }
            ];

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      notice: "🧪 MOCK SERVER: This is simulated data for the requested file.",
                      filePath: args.filePath,
                      problems: fileProblems,
                      count: fileProblems.length,
                      timestamp: new Date().toISOString(),
                      serverType: "mock-standalone"
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
              notice: "🧪 MOCK SERVER: This is simulated workspace summary data.",
              totalProblems: 1,
              bySeverity: {
                Error: 0,
                Warning: 0,
                Information: 1,
                Hint: 0
              },
              bySource: {
                'mock-server': 1
              },
              byWorkspace: {
                [path.basename(process.cwd())]: 1
              },
              affectedFiles: 1,
              groupBy: args.groupBy || 'severity',
              serverType: "mock-standalone"
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
        console.error('[MOCK MCP Server] Tool execution error:', error);
        return {
          content: [
            {
              type: 'text',
              text: `🧪 MOCK SERVER ERROR: ${error.message}`,
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
    console.error('[MOCK MCP Server] ✅ Mock MCP Diagnostics server started!');
    console.error('[MOCK MCP Server] ⚠️  WARNING: This is a MOCK server with simulated data!');
    console.error('[MOCK MCP Server] 📋 Available tools:');
    console.error('[MOCK MCP Server] - getProblems: Get simulated problems/diagnostics');
    console.error('[MOCK MCP Server] - getProblemsForFile: Get simulated problems for a file');
    console.error('[MOCK MCP Server] - getWorkspaceSummary: Get simulated workspace summary');
    console.error('[MOCK MCP Server] 🔧 For REAL diagnostics, use the VS Code extension in Extension Development Host (F5)');
    console.error('[MOCK MCP Server] Server is ready to accept MCP connections via stdio');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[MOCK MCP Server] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MOCK MCP Server] Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the server
const server = new StandaloneMcpServer();
server.start().catch((error) => {
  console.error('[MOCK MCP Server] ❌ Failed to start mock MCP server:', error);
  process.exit(1);
});
