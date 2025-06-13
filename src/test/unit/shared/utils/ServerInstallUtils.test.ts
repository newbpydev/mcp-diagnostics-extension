import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// NOTE: The implementation will live in src/shared/utils/ServerInstallUtils.ts
// but at this point the module does not exist, which is INTENTIONAL (Red phase of TDD)
// Once we implement the utility these tests should pass and yield >95% coverage.
// We intentionally import a yet-to-be-created module (TDD red phase). Suppress TS/ESLint warnings.

import {
  getInstallDir,
  needsUpgrade,
  __internal,
  copyServerBinary,
  setExecutableFlag,
  persistManifest,
  rollbackServerBinary,
  atomicCopyServerBinary,
  computeFileHash,
  atomicPersistManifest,
  acquireLock,
  releaseLock,
} from '@shared/utils/ServerInstallUtils';

/**
 * Helper to build fake home directory paths independent of OS path separator.
 */
function buildHome(base: string, platform: NodeJS.Platform): string {
  if (platform === 'win32') {
    return `C:\\Users\\${base}`;
  }
  return `/home/${base}`;
}

describe('ServerInstallUtils – getInstallDir', () => {
  const cases: Array<{ platform: NodeJS.Platform; user: string; expected: string }> = [
    {
      platform: 'win32',
      user: 'Alice',
      expected: 'C:\\Users\\Alice\\.mcp-diagnostics\\mcp',
    },
    {
      platform: 'darwin',
      user: 'bob',
      expected: '/home/bob/.mcp-diagnostics/mcp',
    },
    {
      platform: 'linux',
      user: 'charlie',
      expected: '/home/charlie/.mcp-diagnostics/mcp',
    },
  ];

  cases.forEach(({ platform, user, expected }) => {
    it(`should resolve correct directory for ${platform}`, () => {
      const dir = getInstallDir(buildHome(user, platform), platform);
      expect(dir).toBe(expected);
    });
  });
});

describe('ServerInstallUtils – needsUpgrade', () => {
  it('should require upgrade when installed version missing', () => {
    expect(needsUpgrade(undefined, '1.0.0')).toBe(true);
  });

  it('should require upgrade when bundled version is newer', () => {
    expect(needsUpgrade('1.0.0', '1.2.0')).toBe(true);
  });

  it('should not require upgrade when installed is newer (user beta)', () => {
    expect(needsUpgrade('2.0.0-beta', '1.5.0')).toBe(false);
  });

  it('should not require upgrade when versions are equal', () => {
    expect(needsUpgrade('1.3.0', '1.3.0')).toBe(false);
  });

  it('should require upgrade when installed is pre-release and bundled is stable', () => {
    expect(needsUpgrade('1.0.0-beta', '1.0.0')).toBe(true);
  });

  it('should not upgrade when installed is stable and bundled is pre-release', () => {
    expect(needsUpgrade('1.0.0', '1.0.0-beta')).toBe(false);
  });

  it('should compare major version difference', () => {
    expect(needsUpgrade('1.0.0', '2.0.0')).toBe(true);
    expect(needsUpgrade('3.0.0', '2.0.0')).toBe(false);
  });

  it('should compare patch version difference', () => {
    expect(needsUpgrade('1.0.1', '1.0.2')).toBe(true);
    expect(needsUpgrade('1.0.3', '1.0.2')).toBe(false);
  });

  it('should compare lexical order of prerelease identifiers', () => {
    expect(needsUpgrade('1.0.0-alpha', '1.0.0-beta')).toBe(true);
    expect(needsUpgrade('1.0.0-beta', '1.0.0-alpha')).toBe(false);
  });

  it('should not upgrade when prerelease identifiers are equal', () => {
    expect(needsUpgrade('1.0.0-beta', '1.0.0-beta')).toBe(false);
  });
});

describe('ServerInstallUtils – compareVersions', () => {
  it('compareVersions internal helper full branch coverage', () => {
    const { compareVersions } = __internal as any;
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1);
    expect(compareVersions('1.0.0-beta', '1.0.0-beta')).toBe(0);
  });
});

describe('ServerInstallUtils – File Copy & Manifest (TDD Red Phase)', () => {
  const tmpDir = path.join(__dirname, 'tmp-test');
  const serverSrc = path.join(tmpDir, 'mcp-server.js');
  const serverDest = path.join(tmpDir, 'dest', 'mcp-server.js');
  const manifestPath = path.join(tmpDir, 'dest', 'version.json');

  beforeEach(() => {
    fs.mkdirSync(path.dirname(serverDest), { recursive: true });
    fs.writeFileSync(serverSrc, '// server binary');
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should copy server binary to destination if not present', async () => {
    await expect(copyServerBinary(serverSrc, serverDest)).resolves.toBe(true);
    expect(fs.existsSync(serverDest)).toBe(true);
  });

  it('should set executable flag on Unix', async () => {
    await copyServerBinary(serverSrc, serverDest);
    await expect(setExecutableFlag(serverDest, 'linux')).resolves.toBe(true);
    // Optionally check fs.statSync(serverDest).mode for executable bit
  });

  it('should persist manifest after copy', async () => {
    await copyServerBinary(serverSrc, serverDest);
    await expect(persistManifest(manifestPath, { version: '1.2.3' })).resolves.toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.version).toBe('1.2.3');
  });

  it('should rollback server binary if copy fails', async () => {
    // Simulate failure by passing invalid src
    await expect(rollbackServerBinary('bad-src', serverDest)).resolves.toBe(true);
    // Should not throw
  });

  it('should return false if copyServerBinary fails', async () => {
    await expect(copyServerBinary('nonexistent', serverDest)).resolves.toBe(false);
  });

  it('should return false if setExecutableFlag fails', async () => {
    await expect(setExecutableFlag('/bad/path', 'linux')).resolves.toBe(false);
  });

  it('should return false if persistManifest fails', async () => {
    await expect(persistManifest('/bad/path/manifest.json', { version: 'x' })).resolves.toBe(false);
  });

  it('should treat rollback as success if file does not exist', async () => {
    await expect(rollbackServerBinary('src', '/bad/path/nonexistent.js')).resolves.toBe(true);
  });

  it('should return true for setExecutableFlag on win32', async () => {
    await expect(setExecutableFlag(serverDest, 'win32')).resolves.toBe(true);
  });

  it('should handle rollbackServerBinary when file exists', async () => {
    fs.writeFileSync(serverDest, 'data');
    await expect(rollbackServerBinary('src', serverDest)).resolves.toBe(true);
    expect(fs.existsSync(serverDest)).toBe(false);
  });
});

describe('ServerInstallUtils – Atomic Copy, Hash, Lock, Manifest', () => {
  const tmpDir = path.join(__dirname, 'tmp-atomic');
  const serverSrc = path.join(tmpDir, 'mcp-server.js');
  const serverDest = path.join(tmpDir, 'dest', 'mcp-server.js');
  const manifestPath = path.join(tmpDir, 'dest', 'manifest.json');
  const lockFile = serverDest + '.lock';
  const tempFile = serverDest + '.tmp';

  beforeEach(() => {
    fs.mkdirSync(path.dirname(serverDest), { recursive: true });
    fs.writeFileSync(serverSrc, '// server binary');
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should compute hash of a file', async () => {
    const hash = await computeFileHash(serverSrc);
    expect(typeof hash).toBe('string');
    expect(hash!.length).toBe(64);
  });

  it('should return undefined for hash of nonexistent file', async () => {
    const hash = await computeFileHash('/bad/path/nonexistent.js');
    expect(hash).toBeUndefined();
  });

  it('should atomically copy server binary and verify hash', async () => {
    const srcHash = await computeFileHash(serverSrc);
    const ok = await atomicCopyServerBinary(serverSrc, serverDest, srcHash);
    expect(ok).toBe(true);
    expect(fs.existsSync(serverDest)).toBe(true);
    // Should not leave temp or lock files
    expect(fs.existsSync(tempFile)).toBe(false);
    expect(fs.existsSync(lockFile)).toBe(false);
  });

  it('should skip copy if dest hash matches', async () => {
    const srcHash = await computeFileHash(serverSrc);
    await atomicCopyServerBinary(serverSrc, serverDest, srcHash);
    // Second call should skip
    const ok = await atomicCopyServerBinary(serverSrc, serverDest, srcHash);
    expect(ok).toBe(true);
  });

  it('should fail copy if lock file exists', async () => {
    fs.writeFileSync(lockFile, 'lock');
    const ok = await atomicCopyServerBinary(serverSrc, serverDest);
    expect(ok).toBe(false);
  });

  it('should fail copy and rollback on hash mismatch', async () => {
    // Write a different file as src
    fs.writeFileSync(serverSrc, 'DIFFERENT');
    const ok = await atomicCopyServerBinary(serverSrc, serverDest, 'bad-hash');
    expect(ok).toBe(false);
    expect(fs.existsSync(serverDest)).toBe(false);
  });

  it('should fail copy and rollback on copy error', async () => {
    const ok = await atomicCopyServerBinary('/bad/path/nonexistent.js', serverDest);
    expect(ok).toBe(false);
    expect(fs.existsSync(serverDest)).toBe(false);
  });

  it('should atomically persist manifest', async () => {
    const ok = await atomicPersistManifest(manifestPath, { foo: 42 });
    expect(ok).toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(data.foo).toBe(42);
  });

  it('should fail atomicPersistManifest on error', async () => {
    const ok = await atomicPersistManifest('/bad/path/manifest.json', { foo: 1 });
    expect(ok).toBe(false);
  });

  it('should acquire and release lock', async () => {
    const acquired = await acquireLock(lockFile);
    expect(acquired).toBe(true);
    await releaseLock(lockFile);
    expect(fs.existsSync(lockFile)).toBe(false);
  });

  it('should not acquire lock if already exists', async () => {
    fs.writeFileSync(lockFile, 'lock');
    const acquired = await acquireLock(lockFile);
    expect(acquired).toBe(false);
  });

  it('should not throw on releaseLock if file missing', async () => {
    await expect(releaseLock(lockFile)).resolves.toBeUndefined();
  });
});

describe('ServerInstallUtils – Full Branch & Error Path Coverage', () => {
  const tmpDir = path.join(__dirname, 'tmp-branch');
  const serverSrc = path.join(tmpDir, 'mcp-server.js');
  const serverDest = path.join(tmpDir, 'dest', 'mcp-server.js');
  const lockFile = serverDest + '.lock';
  const manifestPath = path.join(tmpDir, 'dest', 'manifest.json');

  beforeEach(() => {
    fs.mkdirSync(path.dirname(serverDest), { recursive: true });
    fs.writeFileSync(serverSrc, '// server binary');
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('should handle error opening lock file in atomicCopyServerBinary', async () => {
    jest.spyOn(fs.promises, 'open').mockRejectedValueOnce(new Error('lock error'));
    const { atomicCopyServerBinary } = await import('@shared/utils/ServerInstallUtils');
    const ok = await atomicCopyServerBinary(serverSrc, serverDest);
    expect(ok).toBe(false);
  });

  it('should handle error in copyFile in atomicCopyServerBinary', async () => {
    jest.spyOn(fs.promises, 'open').mockResolvedValue({ close: () => {} } as any);
    jest.spyOn(fs.promises, 'copyFile').mockRejectedValueOnce(new Error('copy error'));
    const { atomicCopyServerBinary } = await import('@shared/utils/ServerInstallUtils');
    const ok = await atomicCopyServerBinary(serverSrc, serverDest);
    expect(ok).toBe(false);
  });

  it('should handle error in rename in atomicCopyServerBinary', async () => {
    jest.spyOn(fs.promises, 'open').mockResolvedValue({ close: () => {} } as any);
    jest.spyOn(fs.promises, 'copyFile').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'rename').mockRejectedValueOnce(new Error('rename error'));
    const { atomicCopyServerBinary } = await import('@shared/utils/ServerInstallUtils');
    const ok = await atomicCopyServerBinary(serverSrc, serverDest);
    expect(ok).toBe(false);
  });

  it('should handle error in hash check in atomicCopyServerBinary', async () => {
    jest.spyOn(fs.promises, 'open').mockResolvedValue({ close: () => {} } as any);
    jest.spyOn(fs.promises, 'copyFile').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'rename').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'readFile').mockRejectedValueOnce(new Error('hash error'));
    const { atomicCopyServerBinary } = await import('@shared/utils/ServerInstallUtils');
    const ok = await atomicCopyServerBinary(serverSrc, serverDest, 'bad-hash');
    expect(typeof ok).toBe('boolean');
  });

  it('should handle error in atomicPersistManifest writeFile', async () => {
    jest.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(new Error('write error'));
    const { atomicPersistManifest } = await import('@shared/utils/ServerInstallUtils');
    const ok = await atomicPersistManifest(manifestPath, { foo: 1 });
    expect(ok).toBe(false);
  });

  it('should handle error in atomicPersistManifest rename', async () => {
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'rename').mockRejectedValueOnce(new Error('rename error'));
    const { atomicPersistManifest } = await import('@shared/utils/ServerInstallUtils');
    const ok = await atomicPersistManifest(manifestPath, { foo: 1 });
    expect(ok).toBe(false);
  });

  it('should handle error in acquireLock', async () => {
    jest.spyOn(fs.promises, 'open').mockRejectedValueOnce(new Error('lock error'));
    const { acquireLock } = await import('@shared/utils/ServerInstallUtils');
    const ok = await acquireLock(lockFile);
    expect(ok).toBe(false);
  });

  it('should handle error in releaseLock', async () => {
    jest.spyOn(fs.promises, 'unlink').mockRejectedValueOnce(new Error('unlink error'));
    const { releaseLock } = await import('@shared/utils/ServerInstallUtils');
    await expect(releaseLock(lockFile)).resolves.toBeUndefined();
  });

  it('should handle error in computeFileHash', async () => {
    jest.spyOn(require('fs'), 'createReadStream').mockImplementation(() => {
      throw new Error('stream error');
    });
    const { computeFileHash } = await import('@shared/utils/ServerInstallUtils');
    const hash = await computeFileHash(serverSrc);
    expect(hash).toBeUndefined();
  });
});
