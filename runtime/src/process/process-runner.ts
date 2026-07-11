import { spawn } from 'node:child_process';
import type { RuntimeTask } from '../task/task-types.js';
import { publishRuntimeEvent } from '../eventbus/index.js';
import { finishPidRecord, savePidRecord } from './pid-registry.js';

export interface ProcessRunOptions {
  task: RuntimeTask;
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  windowsHide?: boolean;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

export interface ProcessRunResult {
  pid: number | null;
  exitCode: number;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  commandLine: string;
}

export function runManagedProcess(options: ProcessRunOptions): Promise<ProcessRunResult> {
  const child = spawn(options.command, options.args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide: options.windowsHide ?? true,
  });
  const pid = child.pid ?? null;
  if (pid != null) savePidRecord(options.task, pid);

  const commandLine = `${options.command} ${options.args.join(' ')}`;
  publishRuntimeEvent({
    source: 'process',
    kind: 'process.started',
    taskId: options.task.taskId,
    pid: pid ?? undefined,
    projectDir: options.task.projectDir,
    payload: {
      command: options.command,
      args: options.args,
      cwd: options.cwd,
    },
  });

  let stdout = '';
  let stderr = '';
  const heartbeat = setInterval(() => {
    publishRuntimeEvent({
      source: 'runtime',
      kind: 'heartbeat',
      taskId: options.task.taskId,
      pid: pid ?? undefined,
      projectDir: options.task.projectDir,
      payload: { cwd: options.cwd },
    });
  }, 5000);

  child.stdout.on('data', (data: Buffer) => {
    const text = data.toString('utf-8');
    stdout += text;
    publishRuntimeEvent({
      source: 'process',
      kind: 'process.stdout',
      taskId: options.task.taskId,
      pid: pid ?? undefined,
      projectDir: options.task.projectDir,
      message: text,
    });
    options.onStdout?.(text);
  });

  child.stderr.on('data', (data: Buffer) => {
    const text = data.toString('utf-8');
    stderr += text;
    publishRuntimeEvent({
      source: 'process',
      kind: 'process.stderr',
      taskId: options.task.taskId,
      pid: pid ?? undefined,
      projectDir: options.task.projectDir,
      message: text,
    });
    options.onStderr?.(text);
  });

  return new Promise((resolve) => {
    child.on('error', (error) => {
      stderr += error.message;
    });

    child.on('exit', (code, signal) => {
      clearInterval(heartbeat);
      const exitCode = typeof code === 'number' ? code : signal ? 1 : 0;
      finishPidRecord(options.task.taskId, exitCode);
      publishRuntimeEvent({
        source: 'process',
        kind: 'process.exited',
        taskId: options.task.taskId,
        pid: pid ?? undefined,
        projectDir: options.task.projectDir,
        payload: { exitCode, signal },
      });
      resolve({
        pid,
        exitCode,
        signal,
        stdout,
        stderr,
        commandLine,
      });
    });
  });
}
