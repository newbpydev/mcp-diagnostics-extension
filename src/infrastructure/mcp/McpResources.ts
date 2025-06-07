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

interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

interface ResourceResponse {
  contents: ResourceContent[];
}

interface ResourceListItem {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

interface ResourceListResponse {
  resources: ResourceListItem[];
}

interface McpServer {
  setRequestHandler: (method: string, handler: (request?: unknown) => Promise<unknown>) => void;
}

interface ResourceReadRequest {
  params: {
    uri: string;
  };
}

export class McpResources {
  constructor(private diagnosticsWatcher: DiagnosticsWatcher) {}

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
