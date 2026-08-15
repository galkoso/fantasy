import { EventEmitter } from 'node:events';
import type { LiveEvent } from '@ligat-fantasy/contracts';

export class LiveEventBus {
  private readonly emitter = new EventEmitter();

  publish(event: LiveEvent): void { this.emitter.emit('event', event); }
  subscribe(listener: (event: LiveEvent) => void): () => void {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }
}
