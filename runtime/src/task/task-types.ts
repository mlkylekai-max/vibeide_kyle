export type RuntimeTaskSource = 'mcp' | 'manual' | 'system';

export type RuntimeTaskKind =
  | 'mcp.tool'
  | 'hardboard.env'
  | 'hardboard.devices'
  | 'hardboard.build'
  | 'hardboard.flash'
  | 'hardboard.serial'
  | 'hardboard.clean'
  | 'hardboard.erase'
  | 'hardboard.snapshot';

export type RuntimeTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface RuntimeTask {
  taskId: string;
  source: RuntimeTaskSource;
  kind: RuntimeTaskKind;
  status: RuntimeTaskStatus;
  pid?: number;
  projectDir?: string;
  port?: string;
  toolName?: string;
  startedAt: number;
  updatedAt: number;
  endedAt?: number;
  exitCode?: number | null;
  error?: string;
}

export interface RuntimeTaskCreateInput {
  source: RuntimeTaskSource;
  kind: RuntimeTaskKind;
  projectDir?: string;
  port?: string;
  toolName?: string;
}
