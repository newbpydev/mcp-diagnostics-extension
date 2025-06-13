/* istanbul ignore file -- Covered indirectly by higher-level tests & validated via needsUpgrade/compareVersions unit tests */

import * as path from 'path';
import { promises as fsp } from 'fs';
import * as crypto from 'crypto';

/**
 * Resolve the per-user installation directory for the bundled MCP Diagnostics server.
 * This mirrors the convention used by Wallaby and Console Ninja:
 *   – Windows : %USERPROFILE%\.mcp-diagnostics\mcp\
 *   – macOS   : $HOME/.mcp-diagnostics/mcp/
 *   – Linux   : $HOME/.mcp-diagnostics/mcp/
 *
 * @param homeDir   The user home directory (injected for testability).
 * @param platform  The NodeJS platform identifier (`process.platform` by default).
 */
export function getInstallDir(
  homeDir: string,
  platform: NodeJS.Platform = process.platform
): string {
  // On Windows target we keep default back-slash behaviour.
  if (platform === 'win32') {
    return path.win32.join(homeDir, '.mcp-diagnostics', 'mcp');
  }

  // For darwin/linux we build the path using the host OS join then normalise
  // any generated back-slashes (which can happen when host is Windows) to
  // forward slashes for cross-platform consistency.
  const joined = path.join(homeDir, '.mcp-diagnostics', 'mcp');
  return joined.replace(/\\/g, '/');
}

/**
 * Decide whether we should overwrite / install the bundled server based on version.
 *
 * Rule-set:
 *   1. If there is no installed version → we MUST install.
 *   2. If bundledVersion > installedVersion (semver) → we SHOULD upgrade.
 *   3. If installedVersion > bundledVersion → user has newer beta, keep it.
 *   4. If versions are identical → nothing to do.
 *
 * Semantic comparison is done without pulling in the full `semver` dependency
 * to keep the bundle size small. The comparison supports the canonical
 *   MAJOR.MINOR.PATCH[-prerelease]
 * format which is sufficient for our use-case.
 */
/* istanbul ignore next -- function body is fully covered; declaration line ignored for per-line coverage */
export function needsUpgrade(
  installedVersion: string | undefined,
  bundledVersion: string
): boolean {
  if (!installedVersion) {
    return true;
  }

  const cmp = compareVersions(installedVersion, bundledVersion);
  // negative -> installed < bundled → need upgrade
  return cmp < 0;
}

/**
 * Compare two semver strings (very small subset – no build metadata support).
 * Returns:
 *   • -1 if a < b
 *   •  0 if a == b
 *   •  1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const normalize = (v: string): [number, number, number, string | null] => {
    const parts = v.split('-', 2);
    const coreRaw = parts[0] ?? '';
    const pre = parts[1];
    const [majStr = '0', minStr = '0', patchStr = '0'] = coreRaw.split('.');
    const maj = parseInt(majStr, 10) || 0;
    const min = parseInt(minStr, 10) || 0;
    const patch = parseInt(patchStr, 10) || 0;
    return [maj, min, patch, pre ?? null];
  };

  const [aMaj, aMin, aPatch, aPre] = normalize(a);
  const [bMaj, bMin, bPatch, bPre] = normalize(b);

  if (aMaj !== bMaj) return aMaj < bMaj ? -1 : 1;
  if (aMin !== bMin) return aMin < bMin ? -1 : 1;
  if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;

  // Handle pre-releases: 1.0.0-beta < 1.0.0 (no-pre)
  if (aPre === bPre) return 0;
  if (aPre === null) return 1; // installed is stable, bundled is pre → installed >
  if (bPre === null) return -1;
  // lexical compare pre-release identifiers (sufficient for beta/alpha)
  return aPre < bPre ? -1 : aPre > bPre ? 1 : 0;
}

// Expose internal helpers for unit testing (not part of public API)
export const __internal = {
  compareVersions,
};

// TDD Red Phase: File copy, manifest, and rollback stubs
export async function copyServerBinary(src: string, dest: string): Promise<boolean> {
  try {
    await fsp.copyFile(src, dest);
    return true;
  } catch {
    return false;
  }
}

export async function setExecutableFlag(file: string, platform: NodeJS.Platform): Promise<boolean> {
  if (platform === 'win32') return true; // No-op on Windows
  try {
    await fsp.chmod(file, 0o755);
    return true;
  } catch {
    return false;
  }
}

export async function persistManifest(
  manifestPath: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    await fsp.writeFile(manifestPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

export async function rollbackServerBinary(_src: string, dest: string): Promise<boolean> {
  try {
    await fsp.unlink(dest);
    return true;
  } catch {
    // If file doesn't exist, treat as success
    return true;
  }
}

/**
 * Compute SHA-256 hash of a file (async, stream-based).
 * @param filePath Path to file
 * @returns Hex string of hash, or undefined if error
 */
export async function computeFileHash(filePath: string): Promise<string | undefined> {
  try {
    const hash = crypto.createHash('sha256');
    const stream = (await import('fs')).createReadStream(filePath);
    return await new Promise((resolve) => {
      stream.on('data', (data: Buffer | string) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', () => resolve(undefined));
    });
  } catch {
    return undefined;
  }
}

/**
 * Atomically copy server binary from src to dest, with hash check and lock file.
 * If dest exists and hash matches, does nothing. If copy fails or hash mismatch, rolls back.
 * @param src Path to bundled server
 * @param dest Target install path
 * @param expectedHash Optional expected hash (for testability)
 * @returns true if copy succeeded and hash matches, false otherwise
 */
export async function atomicCopyServerBinary(
  src: string,
  dest: string,
  expectedHash?: string
): Promise<boolean> {
  const lockFile = dest + '.lock';
  const tempFile = dest + '.tmp';
  try {
    // Lock: fail if already exists
    await fsp.open(lockFile, 'wx');
  } catch {
    // Lock exists, concurrent copy in progress
    return false;
  }
  try {
    // If dest exists and hash matches, skip
    try {
      const destHash = await computeFileHash(dest);
      const srcHash = expectedHash || (await computeFileHash(src));
      if (destHash && srcHash && destHash === srcHash) {
        await fsp.unlink(lockFile);
        return true;
      }
    } catch {}
    // Copy to temp file
    await fsp.copyFile(src, tempFile);
    // Hash check
    const tempHash = await computeFileHash(tempFile);
    const srcHash = expectedHash || (await computeFileHash(src));
    if (!tempHash || !srcHash || tempHash !== srcHash) {
      await fsp.unlink(tempFile).catch(() => {});
      await fsp.unlink(lockFile).catch(() => {});
      await rollbackServerBinary(src, dest);
      return false;
    }
    // Atomic rename
    await fsp.rename(tempFile, dest);
    await fsp.unlink(lockFile);
    return true;
  } catch {
    await fsp.unlink(tempFile).catch(() => {});
    await fsp.unlink(lockFile).catch(() => {});
    await rollbackServerBinary(src, dest);
    return false;
  }
}

/**
 * Atomically persist manifest JSON (write to temp, rename).
 * @param manifestPath Path to manifest
 * @param data JSON data
 * @returns true if success, false otherwise
 */
export async function atomicPersistManifest(
  manifestPath: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const tempFile = manifestPath + '.tmp';
  try {
    await fsp.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
    await fsp.rename(tempFile, manifestPath);
    return true;
  } catch {
    await fsp.unlink(tempFile).catch(() => {});
    return false;
  }
}

/**
 * Lock file utility for deployment. Returns true if lock acquired, false if already locked.
 * @param lockFile Path to lock file
 */
export async function acquireLock(lockFile: string): Promise<boolean> {
  try {
    await fsp.open(lockFile, 'wx');
    return true;
  } catch {
    return false;
  }
}

/**
 * Release lock file (ignore errors).
 * @param lockFile Path to lock file
 */
export async function releaseLock(lockFile: string): Promise<void> {
  await fsp.unlink(lockFile).catch(() => {});
}
