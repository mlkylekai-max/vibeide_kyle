import { BrowserWindow } from 'electron';
import { Orchestrator, PushUIFn } from './orchestrator';

let orchestrator: Orchestrator | null = null;

export function getOrchestrator(
  mainWindow: BrowserWindow,
  pushUI: PushUIFn
): Orchestrator {
  if (!orchestrator) {
    orchestrator = new Orchestrator(mainWindow, pushUI);
  }
  return orchestrator;
}

export function handleTask(
  task: string,
  mainWindow: BrowserWindow,
  pushUI: PushUIFn
): void {
  getOrchestrator(mainWindow, pushUI).handleTask(task);
}

export { Orchestrator } from './orchestrator';
export { TaskStateMachine } from './task-state';
export { buildContext } from './context';
export { ChatBuffer } from './chat-buffer';
