import fs from 'node:fs';
import path from 'node:path';
import { RUNTIME_DIRS } from '../paths.js';
import type { RuntimeTask } from '../task/task-types.js';

export interface RuntimePidRecord {
  taskId: string;
  kind: string;
  source: string;
  pid: number;
  status: 'running' | 'exited';
  projectDir?: string;
  port?: string;
  startedAt: number;
  endedAt?: number;
  exitCode?: number | null;
}

export function savePidRecord(task: RuntimeTask, pid: number): RuntimePidRecord {
  const record: RuntimePidRecord = {
    taskId: task.taskId,
    kind: task.kind,
    source: task.source,
    pid,
    status: 'running',
    projectDir: task.projectDir,
    port: task.port,
    startedAt: Date.now(),
  };
  fs.mkdirSync(RUNTIME_DIRS.pids, { recursive: true });
  fs.writeFileSync(pidFile(task.taskId), JSON.stringify(record, null, 2), 'utf-8');
  return record;
}

export function finishPidRecord(taskId: string, exitCode: number | null): void {
  const file = pidFile(taskId);
  try {
    const record = JSON.parse(fs.readFileSync(file, 'utf-8')) as RuntimePidRecord;
    const next: RuntimePidRecord = {
      ...record,
      status: 'exited',
      endedAt: Date.now(),
      exitCode,
    };
    fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf-8');
    fs.rmSync(file, { force: true });
  } catch {
    fs.rmSync(file, { force: true });
  }
}

function pidFile(taskId: string): string {
  return path.join(RUNTIME_DIRS.pids, `${taskId}.json`);
}
