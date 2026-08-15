import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../app.js';

interface StoredEvent { id: string; type: string; occurredAt: Date; payload: unknown }

export async function registerLiveRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.get('/live/events', async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const send = (event: { id: string; type: string; occurredAt: Date | string; payload: unknown }) => {
      reply.raw.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    };
    const unsubscribe = context.liveEvents.subscribe(send);
    let cursor = new Date();
    const poll = setInterval(async () => {
      const events = await context.db.collection<StoredEvent>('live_events')
        .find({ occurredAt: { $gt: cursor } }).sort({ occurredAt: 1 }).limit(100).toArray();
      for (const event of events) { send(event); cursor = event.occurredAt; }
    }, 1_000);
    const heartbeat = setInterval(() => reply.raw.write(': heartbeat\n\n'), context.config.SSE_HEARTBEAT_INTERVAL_MS);
    request.raw.on('close', () => { clearInterval(poll); clearInterval(heartbeat); unsubscribe(); });
  });
}
