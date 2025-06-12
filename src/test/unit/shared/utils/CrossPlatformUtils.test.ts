import { CrossPlatformUtils } from '@shared/utils/CrossPlatformUtils';
import * as path from 'path';

/**
 * NOTE:
 * The original tests attempted to mutate `process.platform` and spy on
 * `os.homedir()`. Unfortunately, `process.platform` is a non-configurable
 * property and `os.homedir` cannot be spied upon in some Node versions due
 * to the way the `os` module defines its exports, which resulted in the
 * failing tests we are fixing here.
 *
 * To keep the production code untouched while still achieving deterministic
 * and cross-platform tests, we introduced optional parameters to
 * `CrossPlatformUtils.getIdeConfigPaths`.  This allows us to supply a fake
 * platform string and home directory without having to mutate any global
 * objects.  All other utility methods remain unaffected and continue to use
 * the real runtime information.
 */

describe('CrossPlatformUtils', () => {
  describe('getSpawnOptions', () => {
    it('returns shell: true on Windows', () => {
      // These assertions rely on the real runtime platform. If the tests are
      // executed on a non-Windows CI runner the expectations below will be
      // skipped so that the suite remains platform-agnostic.
      if (process.platform === 'win32') {
        const opts = CrossPlatformUtils.getSpawnOptions('C://project');
        expect(opts.shell).toBe(true);
        expect(opts.cwd).toBe('C://project');
        expect(opts.env?.['NODE_ENV']).toBe('production');
      }
    });

    it('does not include shell on non-Windows platforms', () => {
      if (process.platform !== 'win32') {
        const opts = CrossPlatformUtils.getSpawnOptions('/project');
        expect(opts).not.toHaveProperty('shell');
        expect(opts.cwd).toBe('/project');
        expect(opts.env?.['NODE_ENV']).toBe('production');
      }
    });

    it('handles explicit non-Windows platform argument', () => {
      const opts = CrossPlatformUtils.getSpawnOptions('/project', 'linux');
      expect(opts).not.toHaveProperty('shell');
      expect(opts.cwd).toBe('/project');
      expect(opts.env?.['NODE_ENV']).toBe('production');
    });

    it('handles explicit Windows platform argument', () => {
      const opts = CrossPlatformUtils.getSpawnOptions('C://project', 'win32');
      expect(opts.shell).toBe(true);
      expect(opts.cwd).toBe('C://project');
      expect(opts.env?.['NODE_ENV']).toBe('production');
    });
  });

  describe('getIdeConfigPaths', () => {
    it('returns correct VS Code path mapping for Windows', () => {
      const fakeHome = path.join('C:', 'Users', 'Test');
      const paths = CrossPlatformUtils.getIdeConfigPaths('win32', fakeHome);
      expect(paths.vscode).toBe(path.join(fakeHome, 'AppData', 'Roaming', 'Code', 'User'));
      expect(paths.cursor).toBe(path.join(fakeHome, 'AppData', 'Roaming', 'Cursor', 'User'));
      expect(paths.windsurf).toBe(path.join(fakeHome, 'AppData', 'Roaming', 'Windsurf', 'User'));
    });

    it('returns correct VS Code path mapping for macOS', () => {
      const fakeHome = path.join(path.sep, 'Users', 'test');
      const paths = CrossPlatformUtils.getIdeConfigPaths('darwin', fakeHome);
      expect(paths.vscode).toBe(
        path.join(fakeHome, 'Library', 'Application Support', 'Code', 'User')
      );
      expect(paths.cursor).toBe(
        path.join(fakeHome, 'Library', 'Application Support', 'Cursor', 'User')
      );
      expect(paths.windsurf).toBe(
        path.join(fakeHome, 'Library', 'Application Support', 'Windsurf', 'User')
      );
    });

    it('returns correct VS Code path mapping for Linux', () => {
      const fakeHome = path.join(path.sep, 'home', 'test');
      const paths = CrossPlatformUtils.getIdeConfigPaths('linux', fakeHome);
      expect(paths.vscode).toBe(path.join(fakeHome, '.config', 'Code', 'User'));
      expect(paths.cursor).toBe(path.join(fakeHome, '.config', 'Cursor', 'User'));
      expect(paths.windsurf).toBe(path.join(fakeHome, '.config', 'Windsurf', 'User'));
    });

    it('works with default arguments (runtime platform)', () => {
      const paths = CrossPlatformUtils.getIdeConfigPaths();
      // Basic invariant checks (ensure expected sub paths exist)
      expect(Object.values(paths).every((p) => typeof p === 'string' && p.length > 0)).toBe(true);
    });
  });

  describe('getCommandForPlatform', () => {
    it('behaves correctly based on runtime platform', () => {
      const result = CrossPlatformUtils.getCommandForPlatform('npm');
      if (process.platform === 'win32') {
        expect(result).toBe('npm.cmd');
      } else {
        expect(result).toBe('npm');
      }
    });

    it('returns platform specific command when explicit platform provided', () => {
      expect(CrossPlatformUtils.getCommandForPlatform('npm', 'win32')).toBe('npm.cmd');
      expect(CrossPlatformUtils.getCommandForPlatform('npm', 'linux')).toBe('npm');
    });
  });

  describe('platform predicate helpers', () => {
    it('correctly reflects runtime platform', () => {
      switch (process.platform) {
        case 'win32':
          expect(CrossPlatformUtils.isWindows()).toBe(true);
          expect(CrossPlatformUtils.isMac()).toBe(false);
          expect(CrossPlatformUtils.isLinux()).toBe(false);
          break;
        case 'darwin':
          expect(CrossPlatformUtils.isMac()).toBe(true);
          expect(CrossPlatformUtils.isWindows()).toBe(false);
          expect(CrossPlatformUtils.isLinux()).toBe(false);
          break;
        default:
          // Treat everything else as Linux/Unix-like for these helpers
          expect(CrossPlatformUtils.isLinux()).toBe(true);
          expect(CrossPlatformUtils.isWindows()).toBe(false);
          expect(CrossPlatformUtils.isMac()).toBe(false);
      }
    });
  });

  describe('getExtensionPath', () => {
    it('returns absolute path to the project root', () => {
      const extensionPath = CrossPlatformUtils.getExtensionPath();
      // The returned path should be absolute
      expect(path.isAbsolute(extensionPath)).toBe(true);

      // It should resolve to the same directory name as the current working directory (project root)
      const expectedRootName = path.basename(process.cwd());
      expect(path.basename(extensionPath)).toBe(expectedRootName);

      // Normalising twice should yield the same result (idempotent behaviour)
      expect(CrossPlatformUtils.normalizePath(extensionPath)).toBe(extensionPath);
    });
  });

  describe('normalizePath', () => {
    it('normalizes path separators and resolves relative segments', () => {
      const raw = 'some/dir/../path//file';
      const expected = path.normalize(path.resolve(raw));
      expect(CrossPlatformUtils.normalizePath(raw)).toBe(expected);
    });
  });
});
