import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import type { TaskProcessEndItem } from '@shared/types';

export class TaskWatcher extends EventEmitter {
  constructor(api: typeof vscode) {
    super();
    api.tasks.onDidEndTaskProcess(this.handleEvent.bind(this));
  }

  private handleEvent(e: vscode.TaskProcessEndEvent): void {
    try {
      const taskName = e.execution?.task?.name ?? 'unknown';
      const base: Omit<TaskProcessEndItem, 'exitCode'> = {
        taskName,
        timestamp: Date.now(),
      };
      const item = (
        e.exitCode !== undefined ? { ...base, exitCode: e.exitCode } : base
      ) as TaskProcessEndItem;
      this.emit('onData', item);
    } catch {
      /* istanbul ignore next */
    }
  }

  /* istanbul ignore next -- runtime cleanup */
  public dispose(): void {
    this.removeAllListeners();
  }
}
