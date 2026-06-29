import { publishRuntimeEvent } from '../eventbus/index.js';
import { archiveRuntimeTask, saveRuntimeTask } from './task-registry.js';
import type { RuntimeTask, RuntimeTaskCreateInput } from './task-types.js';

export function createRuntimeTask(input: RuntimeTaskCreateInput): RuntimeTask {
  const now = Date.now();
  const task: RuntimeTask = {
    taskId: createTaskId(input.kind),
    source: input.source,
    kind: input.kind,
    status: 'pending',
    projectDir: input.projectDir,
    port: input.port,
    toolName: input.toolName,
    startedAt: now,
    updatedAt: now,
  };
  saveRuntimeTask(task);
  publishRuntimeEvent({
    source: input.source === 'manual' ? 'manual' : input.source === 'mcp' ? 'mcp' : 'runtime',
    kind: 'task.created',
    taskId: task.taskId,
    toolName: task.toolName,
    projectDir: task.projectDir,
    payload: { task },
  });
  return task;
}

export function startRuntimeTask(task: RuntimeTask, pid?: number): RuntimeTask {
  const next: RuntimeTask = {
    ...task,
    pid,
    status: 'running',
    updatedAt: Date.now(),
  };
  saveRuntimeTask(next);
  publishRuntimeEvent({
    source: task.source === 'manual' ? 'manual' : task.source === 'mcp' ? 'mcp' : 'runtime',
    kind: 'task.started',
    taskId: task.taskId,
    pid,
    toolName: task.toolName,
    projectDir: task.projectDir,
    payload: { task: next },
  });
  return next;
}

export function completeRuntimeTask(task: RuntimeTask, exitCode: number | null): RuntimeTask {
  const next: RuntimeTask = {
    ...task,
    exitCode,
    status: exitCode === 0 ? 'completed' : 'failed',
    endedAt: Date.now(),
    updatedAt: Date.now(),
  };
  archiveRuntimeTask(next);
  publishRuntimeEvent({
    source: task.source === 'manual' ? 'manual' : task.source === 'mcp' ? 'mcp' : 'runtime',
    kind: exitCode === 0 ? 'task.completed' : 'task.failed',
    taskId: task.taskId,
    pid: task.pid,
    toolName: task.toolName,
    projectDir: task.projectDir,
    payload: { task: next, exitCode },
  });
  return next;
}

export function failRuntimeTask(task: RuntimeTask, error: string): RuntimeTask {
  const next: RuntimeTask = {
    ...task,
    status: 'failed',
    error,
    endedAt: Date.now(),
    updatedAt: Date.now(),
  };
  archiveRuntimeTask(next);
  publishRuntimeEvent({
    source: task.source === 'manual' ? 'manual' : task.source === 'mcp' ? 'mcp' : 'runtime',
    kind: 'task.failed',
    taskId: task.taskId,
    pid: task.pid,
    toolName: task.toolName,
    projectDir: task.projectDir,
    message: error,
    payload: { task: next },
  });
  return next;
}

function createTaskId(kind: string): string {
  const safeKind = kind.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${safeKind}-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
}
