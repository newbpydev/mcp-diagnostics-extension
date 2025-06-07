import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';
import { ProblemItem } from '@shared/types';

// Resource URI constants for better maintainability
const RESOURCE_URIS = {
  SUMMARY: 'diagnostics://summary',
  FILE_PREFIX: 'diagnostics://file/',
  WORKSPACE_PREFIX: 'diagnostics://workspace/',
} as const;

// Resource metadata for consistent naming
const RESOURCE_METADATA = {
  SUMMARY: {
    name: 'Problems Summary',
    description: 'Summary of all diagnostic problems',
    mimeType: 'application/json' as const,
  },
  FILE: {
    nameTemplate: (filePath: string) => `Problems in ${filePath}`,
    descriptionTemplate: (filePath: string) => `Diagnostic problems for file: ${filePath}`,
    mimeType: 'application/json' as const,
  },
  WORKSPACE: {
    nameTemplate: (workspace: string) => `Problems in ${workspace}`,
    descriptionTemplate: (workspace: string) => `All problems in workspace: ${workspace}`,
    mimeType: 'application/json' as const,
  },
} as const;

/**
 * Interface for MCP resource content
 */
interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

/**
 * Interface for MCP resource response
 */
interface ResourceResponse {
  contents: ResourceContent[];
}

/**
 * Interface for MCP resource list item
 */
interface ResourceListItem {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Interface for MCP resource list response
 */
interface ResourceListResponse {
  resources: ResourceListItem[];
}

/**
 * Interface for MCP server that can register request handlers
 */
interface McpServer {
  setRequestHandler: (method: string, handler: (request?: unknown) => Promise<unknown>) => void;
}

/**
 * Interface for resource read request
 */
interface ResourceReadRequest {
  params: {
    uri: string;
  };
}

/**
 * McpResources provides Model Context Protocol resources for accessing diagnostic information
 *
 * This class exposes diagnostic data as MCP resources that can be read by AI agents and
 * other MCP clients. It provides both static and dynamic resources:
 *
 * Static Resources:
 * - `diagnostics://summary` - Overall workspace diagnostics summary
 *
 * Dynamic Resources:
 * - `diagnostics://file/{encodedFilePath}` - Problems for specific files
 * - `diagnostics://workspace/{encodedWorkspaceName}` - Problems for specific workspaces
 *
 * @example
 * ```typescript
 * const resources = new McpResources(diagnosticsWatcher);
 * resources.registerResources(mcpServer);
 *
 * // Clients can now read:
 * // - diagnostics://summary
 * // - diagnostics://file/base64(file-path)
 * // - diagnostics://workspace/base64(workspace-name)
 * ```
 */
export class McpResources {
  /**
   * Creates a new McpResources instance
   * @param diagnosticsWatcher - The diagnostics watcher to query for problem data
   */
  constructor(private diagnosticsWatcher: DiagnosticsWatcher) {}

  /**
   * Registers MCP resource handlers with the server
   *
   * Sets up request handlers for:
   * - resources/list: Returns available resource definitions
   * - resources/read: Handles resource content requests
   *
   * @param server - The MCP server to register resources with
   */
  public registerResources(server: McpServer): void {
    server.setRequestHandler('resources/list', async (): Promise<ResourceListResponse> => {
      try {
        return this.generateResourceList();
      } catch (error) {
        console.error('Error generating resource list:', error);
        throw error;
      }
    });

    server.setRequestHandler(
      'resources/read',
      async (request?: unknown): Promise<ResourceResponse> => {
        try {
          const typedRequest = request as ResourceReadRequest;
          const { uri } = typedRequest.params;
          if (!uri || typeof uri !== 'string') {
            throw new Error('Invalid or missing URI parameter');
          }
          return this.handleResourceRead(uri);
        } catch (error) {
          console.error('Error reading resource:', error);
          throw error;
        }
      }
    );
  }

  /**
   * Generates the list of available MCP resources
   *
   * Creates a dynamic list based on current diagnostic data, including:
   * - Summary resource (always available)
   * - File-specific resources (one per file with problems)
   * - Workspace-specific resources (one per workspace with problems)
   *
   * @returns Promise resolving to resource list response
   */
  private generateResourceList(): ResourceListResponse {
    const allProblems = this.diagnosticsWatcher.getAllProblems();
    const uniqueFiles = [...new Set(allProblems.map((p) => p.filePath))];
    const uniqueWorkspaces = [...new Set(allProblems.map((p) => p.workspaceFolder))];

    const resources: ResourceListItem[] = [
      // Summary resource
      {
        uri: RESOURCE_URIS.SUMMARY,
        name: RESOURCE_METADATA.SUMMARY.name,
        description: RESOURCE_METADATA.SUMMARY.description,
        mimeType: RESOURCE_METADATA.SUMMARY.mimeType,
      },
      // File resources
      ...uniqueFiles.map((filePath) => ({
        uri: this.createFileResourceUri(filePath),
        name: RESOURCE_METADATA.FILE.nameTemplate(filePath),
        description: RESOURCE_METADATA.FILE.descriptionTemplate(filePath),
        mimeType: RESOURCE_METADATA.FILE.mimeType,
      })),
      // Workspace resources
      ...uniqueWorkspaces.map((workspace) => ({
        uri: this.createWorkspaceResourceUri(workspace),
        name: RESOURCE_METADATA.WORKSPACE.nameTemplate(workspace),
        description: RESOURCE_METADATA.WORKSPACE.descriptionTemplate(workspace),
        mimeType: RESOURCE_METADATA.WORKSPACE.mimeType,
      })),
    ];

    return { resources };
  }

  /**
   * Handles resource read requests for specific URIs
   *
   * Routes requests to appropriate handlers based on URI pattern:
   * - diagnostics://summary → summary resource
   * - diagnostics://file/* → file-specific resource
   * - diagnostics://workspace/* → workspace-specific resource
   *
   * @param uri - The resource URI to read
   * @returns Promise resolving to resource response
   * @throws {Error} If URI is unknown or invalid
   */
  private async handleResourceRead(uri: string): Promise<ResourceResponse> {
    if (uri === RESOURCE_URIS.SUMMARY) {
      return this.generateSummaryResource();
    }

    if (uri.startsWith(RESOURCE_URIS.FILE_PREFIX)) {
      const filePath = this.extractFilePathFromUri(uri);
      return this.generateFileResource(filePath);
    }

    if (uri.startsWith(RESOURCE_URIS.WORKSPACE_PREFIX)) {
      const workspace = this.extractWorkspaceFromUri(uri);
      return this.generateWorkspaceResource(workspace);
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  }

  /**
   * Generates the summary resource with aggregated diagnostic statistics
   *
   * @returns Resource response with summary data including:
   *   - Total problem count
   *   - Problems grouped by file, severity, and workspace
   *   - Generation timestamp
   */
  private generateSummaryResource(): ResourceResponse {
    const allProblems = this.diagnosticsWatcher.getAllProblems();
    const summary = {
      totalProblems: allProblems.length,
      byFile: this.groupBy(allProblems, 'filePath'),
      bySeverity: this.groupBy(allProblems, 'severity'),
      byWorkspace: this.groupBy(allProblems, 'workspaceFolder'),
      generatedAt: new Date().toISOString(),
    };

    return {
      contents: [
        {
          uri: RESOURCE_URIS.SUMMARY,
          mimeType: RESOURCE_METADATA.SUMMARY.mimeType,
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  /**
   * Generates a file-specific resource with problems for the given file
   *
   * @param filePath - The file path to get problems for
   * @returns Resource response with file-specific problem data
   */
  private generateFileResource(filePath: string): ResourceResponse {
    const problems = this.diagnosticsWatcher.getProblemsForFile(filePath);
    const fileData = {
      filePath,
      problems,
      count: problems.length,
      generatedAt: new Date().toISOString(),
    };

    return {
      contents: [
        {
          uri: this.createFileResourceUri(filePath),
          mimeType: RESOURCE_METADATA.FILE.mimeType,
          text: JSON.stringify(fileData, null, 2),
        },
      ],
    };
  }

  /**
   * Generates a workspace-specific resource with problems for the given workspace
   *
   * @param workspace - The workspace name to get problems for
   * @returns Resource response with workspace-specific problem data
   */
  private generateWorkspaceResource(workspace: string): ResourceResponse {
    const problems = this.diagnosticsWatcher.getProblemsForWorkspace(workspace);
    const workspaceData = {
      workspace,
      problems,
      count: problems.length,
      generatedAt: new Date().toISOString(),
    };

    return {
      contents: [
        {
          uri: this.createWorkspaceResourceUri(workspace),
          mimeType: RESOURCE_METADATA.WORKSPACE.mimeType,
          text: JSON.stringify(workspaceData, null, 2),
        },
      ],
    };
  }

  private groupBy(items: ProblemItem[], key: keyof ProblemItem): Record<string, number> {
    return items.reduce(
      (acc, item) => {
        const value = String(item[key]);
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  // URI helper methods for consistency
  private createFileResourceUri(filePath: string): string {
    return `${RESOURCE_URIS.FILE_PREFIX}${encodeURIComponent(filePath)}`;
  }

  private createWorkspaceResourceUri(workspace: string): string {
    return `${RESOURCE_URIS.WORKSPACE_PREFIX}${encodeURIComponent(workspace)}`;
  }

  private extractFilePathFromUri(uri: string): string {
    return decodeURIComponent(uri.replace(RESOURCE_URIS.FILE_PREFIX, ''));
  }

  private extractWorkspaceFromUri(uri: string): string {
    return decodeURIComponent(uri.replace(RESOURCE_URIS.WORKSPACE_PREFIX, ''));
  }
}
