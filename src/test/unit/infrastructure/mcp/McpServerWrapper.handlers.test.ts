/*
 * Focus: Execute the handler functions registered via `setRequestHandler` in
 * McpServerWrapper.setupRequestHandlers to cover the business logic branches
 * for tools and resources.  These tests complement the large existing suite
 * by actually INVOKING the registered handlers (systematic-test-coverage-improvement.mdc).
 */

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    // Minimal mock with jest.fn() handlers store
    Server: jest.fn().mockImplementation(() => ({
      setRequestHandler: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
    })),
  };
});

import { McpServerWrapper } from '@infrastructure/mcp/McpServerWrapper';
import { DiagnosticsWatcher } from '@core/diagnostics/DiagnosticsWatcher';

// Helper to extract handler by call index (order is deterministic in implementation)
function extractHandler<T extends (...args: any[]) => any>(
  serverInstance: McpServerWrapper,
  index: number
): T {
  const mockServer = serverInstance.getServer() as any;
  const call = (mockServer.setRequestHandler as jest.Mock).mock.calls[index];
  if (!call) {
    throw new Error(`No setRequestHandler call at index ${index}`);
  }
  return call[1] as T;
}

describe('McpServerWrapper – handler execution coverage', () => {
  let server: McpServerWrapper;
  let watcher: jest.Mocked<DiagnosticsWatcher>;

  beforeEach(() => {
    jest.useFakeTimers();

    watcher = {
      on: jest.fn(),
      getFilteredProblems: jest.fn().mockReturnValue([{ id: 'stub' } as any]),
      getProblemsForFile: jest.fn().mockReturnValue([{ id: 'file-stub' } as any]),
      getWorkspaceSummary: jest.fn().mockReturnValue({ summary: true }),
      getFilesWithProblems: jest.fn().mockReturnValue(['file1', 'file2']),
      exportProblemsToFile: jest.fn().mockResolvedValue(undefined),
      // EventEmitter API stubs (unused in this test file)
      addListener: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      listenerCount: jest.fn(),
      removeAllListeners: jest.fn(),
      emit: jest.fn(),
      // Generic stubs to satisfy typing (not used)
    } as unknown as jest.Mocked<DiagnosticsWatcher>;

    server = new McpServerWrapper(watcher);
  });

  afterEach(async () => {
    await server.disposeAsync?.();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('executes ListTools handler and returns metadata array', async () => {
    await server.start();

    const listToolsHandler = extractHandler<any>(server, 0); // first registration
    const response = await listToolsHandler();

    expect(Array.isArray(response.tools)).toBe(true);
    expect(response.tools.some((t: any) => t.name === 'getProblems')).toBe(true);
  });

  describe('CallTool handler branches', () => {
    let callToolHandler: any;

    beforeEach(async () => {
      await server.start();
      callToolHandler = extractHandler<any>(server, 1); // second registration
    });

    it('handles getProblems tool', async () => {
      const res = await callToolHandler({ params: { name: 'getProblems', arguments: {} } });
      const parsed = JSON.parse(res.content[0].text);
      expect(parsed.count).toBe(1);
      expect(watcher.getFilteredProblems).toHaveBeenCalledWith({});
    });

    it('handles getProblemsForFile tool', async () => {
      const res = await callToolHandler({
        params: { name: 'getProblemsForFile', arguments: { filePath: '/tmp/x.ts' } },
      });
      const parsed = JSON.parse(res.content[0].text);
      expect(parsed.filePath).toBe('/tmp/x.ts');
      expect(parsed.count).toBe(1);
      expect(watcher.getProblemsForFile).toHaveBeenCalledWith('/tmp/x.ts');
    });

    it('returns error when getProblemsForFile called without filePath', async () => {
      const res = await callToolHandler({ params: { name: 'getProblemsForFile', arguments: {} } });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('filePath is required');
    });

    it('handles getWorkspaceSummary tool', async () => {
      const res = await callToolHandler({
        params: { name: 'getWorkspaceSummary', arguments: { groupBy: 'severity' } },
      });
      const parsed = JSON.parse(res.content[0].text);
      expect(parsed.summary).toEqual({ summary: true });
      expect(watcher.getWorkspaceSummary).toHaveBeenCalledWith('severity');
    });

    it('returns error for unknown tool', async () => {
      const res = await callToolHandler({ params: { name: 'doesNotExist', arguments: {} } });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Unknown tool');
    });
  });

  describe('ReadResource handler branches', () => {
    let readResourceHandler: any;

    beforeEach(async () => {
      await server.start();
      readResourceHandler = extractHandler<any>(server, 3); // fourth registration
    });

    it('returns workspace summary JSON', async () => {
      const res = await readResourceHandler({ params: { uri: 'diagnostics://workspace/summary' } });
      const content = res.contents[0];
      expect(content.mimeType).toBe('application/json');
      expect(JSON.parse(content.text)).toEqual({ summary: true });
    });

    it('returns files with problems JSON', async () => {
      const res = await readResourceHandler({ params: { uri: 'diagnostics://workspace/files' } });
      const content = res.contents[0];
      expect(JSON.parse(content.text)).toEqual(['file1', 'file2']);
    });

    it('returns text/plain error for unknown resource', async () => {
      const res = await readResourceHandler({ params: { uri: 'diagnostics://unknown' } });
      expect(res.contents[0].mimeType).toBe('text/plain');
      expect(res.contents[0].text).toContain('Unknown resource');
    });
  });

  it('triggers continuous export interval and swallows export errors', async () => {
    watcher.exportProblemsToFile.mockRejectedValueOnce(new Error('ExportFail'));

    await server.start();

    // Advance fake timers to trigger the interval once
    jest.advanceTimersByTime(2000);

    expect(watcher.exportProblemsToFile).toHaveBeenCalled();
  });

  describe('lifecycle edge cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(async () => {
      jest.useRealTimers();
    });

    it('throws when start() is called twice', async () => {
      await server.start();
      await expect(server.start()).rejects.toThrow('already started');
    });

    it('properly stops service and clears flags/interval', async () => {
      await server.start();
      await server.stop();

      expect(server.getIsRunning()).toBe(false);
      // Restarting fake timers to ensure interval really cleared (would throw if still active)
      jest.advanceTimersByTime(4000);
      expect(watcher.exportProblemsToFile).toHaveBeenCalledTimes(0);
    });

    it('restarts when running and when stopped', async () => {
      await server.start();
      const initialCallCount = watcher.exportProblemsToFile.mock.calls.length;

      await server.restart(); // should stop + start internally

      // Export should continue after restart (advance timers to trigger again)
      jest.advanceTimersByTime(2000);
      expect(watcher.exportProblemsToFile.mock.calls.length).toBeGreaterThan(initialCallCount);
      expect(server.getIsRunning()).toBe(true);

      // Now stop to prep second restart scenario
      await server.stop();
      expect(server.getIsRunning()).toBe(false);

      // Restart while not running – should simply start
      await server.restart();
      expect(server.getIsRunning()).toBe(true);
    });

    it('restart propagates errors from start()', async () => {
      // Create a fresh instance whose start will fail
      const failingServer = new McpServerWrapper(watcher);
      const startSpy = jest
        .spyOn(failingServer as any, 'start')
        .mockImplementation(() => Promise.reject(new Error('Boom')));

      await expect(failingServer.restart()).rejects.toThrow('Boom');
      expect(failingServer.getIsRunning()).toBe(false);
      startSpy.mockRestore();
    });
  });

  describe('handleProblemsChanged branch coverage', () => {
    it('invokes notification when server is running vs stopped', async () => {
      const spy = jest.spyOn(server.notifications, 'sendProblemsChangedNotification');

      // Case 1: not running
      (server as any).handleProblemsChanged({ uri: 'x', problems: [] });
      expect(spy).toHaveBeenCalledTimes(1);

      // Case 2: running
      await server.start();
      (server as any).handleProblemsChanged({ uri: 'y', problems: [{ id: 1 }] });
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('additional branch coverage', () => {
    it('handles stop() when never started', async () => {
      // Should not throw and state remains false
      await expect(server.stop()).resolves.not.toThrow();
      expect(server.getIsRunning()).toBe(false);
    });

    it('supports dispose() in both running and not running states', async () => {
      // Dispose when not running
      expect(() => server.dispose()).not.toThrow();

      // Dispose when running
      await server.start();
      expect(server.getIsRunning()).toBe(true);
      expect(() => server.dispose()).not.toThrow();
      // Wait microtask for async stop inside dispose
      await Promise.resolve();
      expect(server.getIsRunning()).toBe(false);
    });

    it('returns correct server info before and after start', async () => {
      const infoBefore = server.getServerInfo();
      expect(infoBefore.isRunning).toBe(false);

      await server.start();
      const infoAfter = server.getServerInfo();
      expect(infoAfter.isRunning).toBe(true);
      // Alias method same value
      expect(server.isServerStarted()).toBe(true);
    });

    it('covers debug logging code paths', async () => {
      const debugServer = new McpServerWrapper(watcher, { enableDebugLogging: true });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await debugServer.start();
      (debugServer as any).handleProblemsChanged({ uri: 'dbg', problems: [] });
      await debugServer.stop();

      // Ensure some debug logs were emitted
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
