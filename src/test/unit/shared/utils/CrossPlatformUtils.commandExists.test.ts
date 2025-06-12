jest.mock('child_process', () => {
  return {
    spawn: jest.fn(),
  };
});

import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { CrossPlatformUtils } from '@shared/utils/CrossPlatformUtils';

const typedSpawn = spawn as unknown as jest.Mock;

describe('CrossPlatformUtils – commandExists & diagnostic export helpers', () => {
  beforeEach(() => {
    typedSpawn.mockReset();
  });

  describe('commandExists', () => {
    it('resolves true when the spawned process exits with code 0', async () => {
      const emitter = new EventEmitter();
      typedSpawn.mockReturnValue(emitter);

      const promise = CrossPlatformUtils.commandExists('node');
      // Simulate successful exit
      emitter.emit('close', 0);

      await expect(promise).resolves.toBe(true);
    });

    it('resolves false when the spawned process exits with non-zero code', async () => {
      const emitter = new EventEmitter();
      typedSpawn.mockReturnValue(emitter);

      const promise = CrossPlatformUtils.commandExists('nonexistent');
      // Simulate failure exit
      emitter.emit('close', 1);

      await expect(promise).resolves.toBe(false);
    });

    it('resolves false when the spawned process emits an error event', async () => {
      const emitter = new EventEmitter();
      typedSpawn.mockReturnValue(emitter);

      const promise = CrossPlatformUtils.commandExists('badcmd');
      // Simulate error event
      emitter.emit('error', new Error('spawn error'));

      await expect(promise).resolves.toBe(false);
    });

    it('invokes the correct platform checker (which/where) based on runtime platform', async () => {
      const emitter = new EventEmitter();
      typedSpawn.mockReturnValue(emitter);

      const promise = CrossPlatformUtils.commandExists('npm');

      const expectedChecker = process.platform === 'win32' ? 'where' : 'which';
      expect(typedSpawn).toHaveBeenCalledWith(
        expectedChecker,
        ['npm'],
        expect.objectContaining({ shell: process.platform === 'win32' })
      );

      // Resolve promise to avoid unhandled promise rejection warnings
      emitter.emit('close', 0);
      await promise;
    });
  });

  describe('getDiagnosticExportPath', () => {
    it('returns a path in the system temporary directory', () => {
      const exportPath = CrossPlatformUtils.getDiagnosticExportPath();
      expect(exportPath).toBe(path.join(os.tmpdir(), 'vscode-diagnostics-export.json'));
      // Ensure the path is absolute for safety
      expect(path.isAbsolute(exportPath)).toBe(true);
    });
  });
});
