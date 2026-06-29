export type RuntimeEventSource = 'runtime' | 'mcp' | 'manual' | 'system' | 'hardboard' | 'process';

export type RuntimeEventKind =
  | 'heartbeat'
  | 'runtime.stale'
  | 'task.created'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.cancelled'
  | 'process.started'
  | 'process.stdout'
  | 'process.stderr'
  | 'process.exited'
  | 'tool.started'
  | 'tool.completed'
  | 'tool.failed'
  | 'hardboard.build.started'
  | 'hardboard.build.progress'
  | 'hardboard.build.file'
  | 'hardboard.build.completed'
  | 'hardboard.flash.started'
  | 'hardboard.flash.progress'
  | 'hardboard.flash.file'
  | 'hardboard.flash.completed'
  | 'hardboard.project.files';

export interface RuntimeEvent {
  seq: number;
  id: string;
  time: number;
  source: RuntimeEventSource;
  kind: RuntimeEventKind | string;
  taskId?: string;
  pid?: number;
  toolName?: string;
  projectDir?: string;
  message?: string;
  payload?: Record<string, unknown>;
}

export type RuntimeEventInput = Omit<RuntimeEvent, 'seq' | 'id' | 'time'> & {
  id?: string;
  time?: number;
};

export interface RuntimeEventFilter {
  source?: RuntimeEventSource;
  kind?: RuntimeEventKind | string;
  taskId?: string;
  projectDir?: string;
}

export interface HardboardRuntimeState {
  generatedAt: number;
  lastSeq: number;
  lastHeartbeatAt: number | null;
  activeTaskId: string | null;
  activeToolName: string | null;
  activeProjectDir: string | null;
  activePid: number | null;
  phase: 'idle' | 'build' | 'flash' | 'serial' | 'tool' | 'stale';
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stale';
  progress: number | null;
  currentFile: string | null;
  currentPort: string | null;
  files: HardboardSourceFile[];
  recent: RuntimeEvent[];
  lastError: string | null;
}

export interface HardboardSourceFile {
  path: string;
  name: string;
  relativePath: string;
  kind: 'source' | 'cmake' | 'config' | 'dir' | 'other';
  size: number | null;
  updatedAt: number | null;
}
