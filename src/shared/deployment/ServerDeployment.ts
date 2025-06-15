import * as path from 'path';
import { promises as fsp } from 'fs';
import {
  atomicCopyServerBinary,
  atomicPersistManifest,
  acquireLock,
  needsUpgrade,
  releaseLock,
  setExecutableFlag,
} from '../utils/ServerInstallUtils';
import * as os from 'os';
import { getInstallDir } from '../utils/ServerInstallUtils';

export interface DeployOptions {
  /** Absolute path to bundled server binary inside extension */
  bundledPath: string;
  /** Bundled server version (from manifest) */
  version: string;
  /** Optional logger function, defaults to console.log */
  logger?: (...args: unknown[]) => void;
  /** Home directory override (for tests) */
  homeDir?: string;
  /** Platform override (for tests) */
  platform?: NodeJS.Platform;
}

export interface DeployResult {
  installedPath: string;
  upgraded: boolean;
}

/**
 * Deploy bundled MCP server binary to user install directory if required.
 *
 * Behaviour:
 * 1. Acquire deployment lock to avoid concurrent installations.
 * 2. Compare installed manifest version with bundled version.
 * 3. If upgrade required → copy binary atomically, set executable flag, persist new manifest.
 * 4. Release lock and return deployment result.
 *
 * This mirrors behaviour of Wallaby & Console Ninja as captured in research findings.
 */
export async function deployBundledServer(opts: DeployOptions): Promise<DeployResult> {
  const logger = opts.logger ?? console.log;
  const platform = opts.platform ?? process.platform;
  const home = opts.homeDir ?? os.homedir();

  const installDir = getInstallDir(home, platform);
  await fsp.mkdir(installDir, { recursive: true });

  const destPath = path.join(installDir, 'mcp-server.js');
  const manifestPath = path.join(installDir, 'version.json');
  const lockFile = destPath + '.lock';

  // Prevent duplicates across parallel VS Code windows
  const lockAcquired = await acquireLock(lockFile);
  if (!lockAcquired) {
    logger('[MCP Diagnostics][deploy] Another deployment process holds lock, skipping');
    return { installedPath: destPath, upgraded: false };
  }

  try {
    // Determine installed version (may not exist)
    let installedVersion: string | undefined;
    try {
      const raw = await fsp.readFile(manifestPath, 'utf8');
      installedVersion = JSON.parse(raw).version as string;
    } catch {
      // ignore – manifest missing or invalid
    }

    const shouldUpgrade = needsUpgrade(installedVersion, opts.version);
    if (!shouldUpgrade) {
      logger('[MCP Diagnostics][deploy] Server up-to-date – no action required');
      return { installedPath: destPath, upgraded: false };
    }

    // Copy binary with integrity check
    const copyOk = await atomicCopyServerBinary(opts.bundledPath, destPath);
    if (!copyOk) {
      throw new Error('copy_failed');
    }

    // Ensure executable on Unix
    const chmodOk = await setExecutableFlag(destPath, platform);
    if (!chmodOk) {
      logger('[MCP Diagnostics][deploy] Warning: Failed to set executable flag');
    }

    // Persist manifest
    await atomicPersistManifest(manifestPath, { version: opts.version });

    logger(`[MCP Diagnostics][server-deployed] path="${destPath}" version="${opts.version}"`);

    return { installedPath: destPath, upgraded: true };
  } finally {
    // Always release lock
    await releaseLock(lockFile);
  }
}
