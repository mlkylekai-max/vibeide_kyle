import type { RuntimeEvent, RuntimeEventFilter, RuntimeEventInput } from './event-types.js';
import { appendRuntimeEvent } from './event-store.js';

type RuntimeEventHandler = (event: RuntimeEvent) => void;

const subscribers = new Map<string, { filter: RuntimeEventFilter; handler: RuntimeEventHandler }>();

export function publishRuntimeEvent(input: RuntimeEventInput): RuntimeEvent {
  const event = appendRuntimeEvent(input);
  for (const { filter, handler } of subscribers.values()) {
    if (matchesFilter(event, filter)) handler(event);
  }
  return event;
}

export function subscribeRuntimeEvents(filter: RuntimeEventFilter, handler: RuntimeEventHandler): () => void {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  subscribers.set(id, { filter, handler });
  return () => {
    subscribers.delete(id);
  };
}

function matchesFilter(event: RuntimeEvent, filter: RuntimeEventFilter): boolean {
  if (filter.source && event.source !== filter.source) return false;
  if (filter.kind && event.kind !== filter.kind) return false;
  if (filter.taskId && event.taskId !== filter.taskId) return false;
  if (filter.projectDir && event.projectDir !== filter.projectDir) return false;
  return true;
}
