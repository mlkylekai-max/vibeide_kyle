export type TaskPhase =
  | 'idle'
  | 'context'
  | 'running'
  | 'navigating'
  | 'extracting'
  | 'cleaning'
  | 'done'
  | 'failed';

export interface TaskStep {
  id: string;
  label: string;
  done: boolean;
}

const PHASE_ORDER: TaskPhase[] = [
  'idle',
  'context',
  'running',
  'navigating',
  'extracting',
  'cleaning',
  'done',
  'failed',
];

function phaseIndex(phase: TaskPhase): number {
  return PHASE_ORDER.indexOf(phase);
}

export class TaskStateMachine {
  phase: TaskPhase = 'idle';
  steps: TaskStep[] = [];
  private onProgress: ((steps: TaskStep[]) => void) | null = null;

  setProgressCallback(cb: (steps: TaskStep[]) => void): void {
    this.onProgress = cb;
  }

  start(_task: string): void {
    this.phase = 'context';
    this.steps = [
      { id: '1', label: '构建上下文', done: false },
      { id: '2', label: 'Agent 推理执行', done: false },
      { id: '3', label: '页面导航操作', done: false },
      { id: '4', label: '数据提取', done: false },
      { id: '5', label: '数据清洗与保存', done: false },
    ];
    this.emit();
  }

  advanceTo(phase: TaskPhase): void {
    if (phaseIndex(phase) <= phaseIndex(this.phase)) return;
    this.phase = phase;
    // Mark steps whose natural position is before the current phase
    const stepPhases: TaskPhase[] = ['context', 'running', 'navigating', 'extracting', 'cleaning'];
    for (let i = 0; i < this.steps.length; i++) {
      const stepPhase = stepPhases[i] || 'running';
      if (phaseIndex(stepPhase) < phaseIndex(phase)) {
        this.steps[i].done = true;
      }
    }
    this.emit();
  }

  complete(): void {
    this.phase = 'done';
    this.steps.forEach((s) => (s.done = true));
    this.emit();
  }

  fail(): void {
    this.phase = 'failed';
    this.emit();
  }

  reset(): void {
    this.phase = 'idle';
    this.steps = [];
    this.emit();
  }

  private emit(): void {
    this.onProgress?.(this.steps);
  }
}
