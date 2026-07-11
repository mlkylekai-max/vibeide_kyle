import fs from 'node:fs';
import path from 'node:path';
import { RUNTIME_DIRS } from '../paths.js';
import type { RuntimeTask } from './task-types.js';

const TASKS_DIR = path.join(RUNTIME_DIRS.root, 'tasks');
const ARCHIVE_DIR = path.join(TASKS_DIR, 'archive');

export function saveRuntimeTask(task: RuntimeTask): void {
  fs.mkdirSync(TASKS_DIR, { recursive: true });
  fs.writeFileSync(taskFile(task.taskId), JSON.stringify(task, null, 2), 'utf-8');
}

export function readRuntimeTask(taskId: string): RuntimeTask | null {
  try {
    return JSON.parse(fs.readFileSync(taskFile(taskId), 'utf-8')) as RuntimeTask;
  } catch {
    return null;
  }
}

export function archiveRuntimeTask(task: RuntimeTask): void {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARCHIVE_DIR, `${task.taskId}.json`), JSON.stringify(task, null, 2), 'utf-8');
  fs.rmSync(taskFile(task.taskId), { force: true });
}

function taskFile(taskId: string): string {
  return path.join(TASKS_DIR, `${taskId}.json`);
}
