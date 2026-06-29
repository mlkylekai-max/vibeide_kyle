import { getRecentRuntimeEvents, getRuntimeEventState } from './event-store.js';

export function readRuntimeEventsSince(seq = 0) {
  return {
    state: getRuntimeEventState(),
    events: getRecentRuntimeEvents(seq),
  };
}
