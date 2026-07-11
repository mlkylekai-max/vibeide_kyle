export interface HardboardDevice {
  port: string;
  label: string;
  source: string;
}

export interface HardboardCommandResult {
  command: string;
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  logPath?: string;
  stdoutLogPath?: string;
  stderrLogPath?: string;
  taskId?: string;
  pid?: number | null;
}

export interface HardboardSnapshotResult {
  projectDir: string;
  snapshotDir: string;
  filesCopied: number;
}

export interface HardboardEnvStatus {
  runtimeRoot: string;
  hardboardRoot: string;
  idfVersion: string;
  idfPath: string | null;
  idfPy: string | null;
  python: string | null;
  idfToolsPath: string;
  idfPythonEnvPath: string | null;
  examplesDir: string;
  projectsDir: string;
  docsDir: string;
  snapshotsDir: string;
  firmwareDir: string;
  logsDir: string;
  eventsDir: string;
}
