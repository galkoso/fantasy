import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../app.js';

export async function registerLiveRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.get('/live/events', async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const unsubscribe = context.liveEvents.subscribe((event) => {
      reply.raw.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => reply.raw.write(': heartbeat\n\n'), context.config.SSE_HEARTBEAT_INTERVAL_MS);
    request.raw.on('close', () => { clearInterval(heartbeat); unsubscribe(); });
  });
}
