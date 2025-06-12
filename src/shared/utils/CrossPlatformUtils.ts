import * as os from 'os';
import * as path from 'path';

/**
 * Cross-platform utilities for handling platform-specific functionality
 *
 * This class provides platform-specific implementations for:
 * - Spawn options (shell: true for Windows)
 * - IDE configuration paths
 * - Path normalization
 * - Platform detection utilities
 *
 * @example
 * ```typescript
 * // Get spawn options for current platform
 * const options = CrossPlatformUtils.getSpawnOptions('/project/path');
 *
 * // Get IDE config paths
 * const paths = CrossPlatformUtils.getIdeConfigPaths();
 * console.log(paths.vscode); // Platform-specific VS Code config path
 * ```
 */
export class CrossPlatformUtils {
  /**
   * Get spawn options for the current platform
   *
   * @param cwd - Working directory for the spawned process
   * @param platform - Platform to get spawn options for
   * @returns Spawn options object with platform-specific settings
   *
   * @example
   * ```typescript
   * const options = CrossPlatformUtils.getSpawnOptions('/my/project');
   * // On Windows: { cwd: '/my/project', shell: true, env: {...} }
   * // On Unix: { cwd: '/my/project', env: {...} }
   * ```
   */
  public static getSpawnOptions(
    cwd: string,
    platform: NodeJS.Platform = process.platform
  ): {
    cwd: string;
    env: NodeJS.ProcessEnv;
    shell?: boolean;
  } {
    const baseOptions = {
      /* istanbul ignore next */ cwd,
      env: {
        /* istanbul ignore next */ ...process.env,
        /* istanbul ignore next - constant assignment */
        NODE_ENV: 'production',
      },
    };

    // 🚨 CRITICAL: Windows requires shell: true for Node.js spawn
    if (platform === 'win32') {
      return {
        ...baseOptions,
        shell: true,
      };
    }

    return baseOptions;
  }

  /**
   * Get IDE configuration paths for all supported platforms
   *
   * @returns Object containing paths for VS Code, Cursor, and Windsurf
   *
   * @example
   * ```typescript
   * const paths = CrossPlatformUtils.getIdeConfigPaths();
   * // Windows: paths.vscode = "C:\Users\User\AppData\Roaming\Code\User"
   * // macOS: paths.vscode = "/Users/User/Library/Application Support/Code/User"
   * // Linux: paths.vscode = "/home/user/.config/Code/User"
   * ```
   */
  public static getIdeConfigPaths(
    platform: NodeJS.Platform = process.platform,
    homeDir: string = os.homedir()
  ): {
    vscode: string;
    cursor: string;
    windsurf: string;
  } {
    switch (platform) {
      case 'win32':
        return {
          vscode: path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User'),
          cursor: path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'User'),
          windsurf: path.join(homeDir, 'AppData', 'Roaming', 'Windsurf', 'User'),
        };

      case 'darwin': // macOS
        return {
          vscode: path.join(homeDir, 'Library', 'Application Support', 'Code', 'User'),
          cursor: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User'),
          windsurf: path.join(homeDir, 'Library', 'Application Support', 'Windsurf', 'User'),
        };

      default: // Linux and other Unix-like systems
        return {
          vscode: path.join(homeDir, '.config', 'Code', 'User'),
          cursor: path.join(homeDir, '.config', 'Cursor', 'User'),
          windsurf: path.join(homeDir, '.config', 'Windsurf', 'User'),
        };
    }
  }

  /**
   * Get the current extension's root path
   *
   * @returns Normalized path to the extension root directory
   *
   * @example
   * ```typescript
   * const extensionPath = CrossPlatformUtils.getExtensionPath();
   * // Returns: "/path/to/mcp-diagnostics-extension"
   * ```
   */
  public static getExtensionPath(): string {
    // Get path relative to this file: src/shared/utils/CrossPlatformUtils.ts
    // We need to go up 3 levels to reach the project root
    const currentDir = __dirname;
    const projectRoot = path.resolve(currentDir, '..', '..', '..');
    return this.normalizePath(projectRoot);
  }

  /**
   * Get platform-specific command name
   *
   * @param command - Base command name (e.g., 'npm', 'npx')
   * @param platform - Platform to get command for
   * @returns Platform-specific command (e.g., 'npm.cmd' on Windows)
   *
   * @example
   * ```typescript
   * const command = CrossPlatformUtils.getCommandForPlatform('npm');
   * // Windows: 'npm.cmd'
   * // Unix: 'npm'
   * ```
   */
  public static getCommandForPlatform(
    command: string,
    platform: NodeJS.Platform = process.platform
  ): string {
    if (platform === 'win32') {
      return `${command}.cmd`;
    }
    return command;
  }

  /**
   * Normalize a file path for the current platform
   *
   * @param filePath - Path to normalize
   * @returns Normalized path using platform-specific separators
   *
   * @example
   * ```typescript
   * const normalized = CrossPlatformUtils.normalizePath('C:\\Users\\Test\\Project');
   * // Returns platform-appropriate path
   * ```
   */
  public static normalizePath(filePath: string): string {
    return path.normalize(path.resolve(filePath));
  }

  /**
   * Check if the current platform is Windows
   *
   * @returns True if running on Windows
   */
  public static isWindows(): boolean {
    return process.platform === 'win32';
  }

  /**
   * Check if the current platform is macOS
   *
   * @returns True if running on macOS
   */
  public static isMac(): boolean {
    return process.platform === 'darwin';
  }

  /**
   * Check if the current platform is Linux
   *
   * @returns True if running on Linux
   */
  public static isLinux(): boolean {
    return process.platform === 'linux';
  }

  /**
   * Get path for temporary VS Code diagnostic export file (cross-platform).
   */
  public static getDiagnosticExportPath(): string {
    return path.join(os.tmpdir(), 'vscode-diagnostics-export.json');
  }

  /**
   * Check if a given command exists on the current machine (sync shell check).
   * Uses `where` on Windows and `which` on Unix platforms.
   */
  public static async commandExists(command: string): Promise<boolean> {
    const checker = process.platform === 'win32' ? 'where' : 'which';

    return new Promise<boolean>((resolve) => {
      const { spawn } = require('child_process');
      const proc = spawn(checker, [command], {
        stdio: 'ignore',
        shell: process.platform === 'win32',
      });

      proc.on('close', (code: number) => {
        resolve(code === 0);
      });
      proc.on('error', () => resolve(false));
    });
  }
}
