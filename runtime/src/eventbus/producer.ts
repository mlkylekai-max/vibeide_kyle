import type { RuntimeEventInput } from './event-types.js';
import { publishRuntimeEvent } from './event-bus.js';

export interface RuntimeEventProducer {
  publish(input: Omit<RuntimeEventInput, 'source'>): void;
}

export function createRuntimeEventProducer(source: RuntimeEventInput['source']): RuntimeEventProducer {
  return {
    publish(input) {
      publishRuntimeEvent({ ...input, source });
    },
  };
}
