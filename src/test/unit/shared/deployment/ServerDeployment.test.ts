import { deployBundledServer } from '@shared/deployment/ServerDeployment';
// Mock Node core modules before importing implementation helpers
import * as fs from 'fs';

// Cast to typed promises object for convenience
const fsPromises = fs.promises as unknown as {
  mkdir: jest.Mock;
  readFile: jest.Mock;
};

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

// Helper mocks for ServerInstallUtils
const acquireLock = jest.fn();
const releaseLock = jest.fn();
const needsUpgrade = jest.fn();
const atomicCopyServerBinary = jest.fn();
const setExecutableFlag = jest.fn();
const atomicPersistManifest = jest.fn();
const getInstallDir = jest.fn();

jest.mock('@shared/utils/ServerInstallUtils', () => ({
  acquireLock: (lock: string) => acquireLock(lock),
  releaseLock: (lock: string) => releaseLock(lock),
  needsUpgrade: (installed: string | undefined, bundled: string) =>
    needsUpgrade(installed, bundled),
  atomicCopyServerBinary: (src: string, dest: string) => atomicCopyServerBinary(src, dest),
  setExecutableFlag: (dest: string, platform: NodeJS.Platform) => setExecutableFlag(dest, platform),
  atomicPersistManifest: (path: string, data: object) => atomicPersistManifest(path, data),
  getInstallDir: (home: string, platform: NodeJS.Platform) => getInstallDir(home, platform),
}));

describe('ServerDeployment.deployBundledServer', () => {
  const optsBase = {
    bundledPath: '/bundle/server.js',
    version: '2.0.0',
    homeDir: '/home/user',
    platform: 'linux' as NodeJS.Platform,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getInstallDir.mockReturnValue('/install');
    fsPromises.mkdir.mockResolvedValue(undefined);
    acquireLock.mockResolvedValue(true);
    releaseLock.mockResolvedValue(undefined);
  });

  it('returns early when lock not acquired', async () => {
    acquireLock.mockResolvedValueOnce(false);
    const res = await deployBundledServer({ ...optsBase });
    expect(res.upgraded).toBe(false);
    expect(releaseLock).not.toHaveBeenCalled();
  });

  it('skips upgrade when server up-to-date', async () => {
    // Simulate manifest version equal
    fsPromises.readFile.mockResolvedValue('{"version":"2.0.0"}');
    needsUpgrade.mockReturnValue(false);

    const logs: string[] = [];
    const res = await deployBundledServer({
      ...optsBase,
      logger: (...args: unknown[]) => {
        logs.push(args.join(' ') as string);
      },
    });

    expect(res.upgraded).toBe(false);
    expect(needsUpgrade).toHaveBeenCalledWith('2.0.0', '2.0.0');
    expect(logs.some((m) => m.includes('up-to-date'))).toBe(true);
    expect(releaseLock).toHaveBeenCalled();
  });

  it('performs successful upgrade path', async () => {
    fsPromises.readFile.mockRejectedValue(new Error('not found')); // manifest missing
    needsUpgrade.mockReturnValue(true);
    atomicCopyServerBinary.mockResolvedValue(true);
    setExecutableFlag.mockResolvedValue(true);
    atomicPersistManifest.mockResolvedValue(undefined);

    const res = await deployBundledServer({ ...optsBase });
    expect(res.upgraded).toBe(true);
    expect(atomicCopyServerBinary).toHaveBeenCalledWith(
      '/bundle/server.js',
      expect.stringContaining('mcp-server.js')
    );
    expect(setExecutableFlag).toHaveBeenCalled();
    expect(atomicPersistManifest).toHaveBeenCalled();
    expect(releaseLock).toHaveBeenCalled();
  });

  it('throws when copy fails and still releases lock', async () => {
    fsPromises.readFile.mockResolvedValue('{"version":"1.0.0"}');
    needsUpgrade.mockReturnValue(true);
    atomicCopyServerBinary.mockResolvedValue(false);

    await expect(deployBundledServer({ ...optsBase })).rejects.toThrow('copy_failed');
    expect(releaseLock).toHaveBeenCalled();
  });

  it('logs warning when chmod fails but continues', async () => {
    fsPromises.readFile.mockResolvedValue('{"version":"1.0.0"}');
    needsUpgrade.mockReturnValue(true);
    atomicCopyServerBinary.mockResolvedValue(true);
    setExecutableFlag.mockResolvedValue(false); // fail chmod
    atomicPersistManifest.mockResolvedValue(undefined);

    const warnLogs: string[] = [];

    await deployBundledServer({
      ...optsBase,
      logger: (...args: unknown[]) => {
        warnLogs.push(args.join(' ') as string);
      },
    });

    expect(warnLogs.some((m) => m.includes('Warning: Failed to set executable flag'))).toBe(true);
  });
});
