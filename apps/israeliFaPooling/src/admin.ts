import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AppConfig } from '@ligat-fantasy/config';

export function requestUserId(request: FastifyRequest): string {
  const value = request.headers['x-user-id'];
  return typeof value === 'string' && value.length > 0 ? value : 'local-demo-user';
}

export function isAdminUser(request: FastifyRequest, config: AppConfig): boolean {
  return config.ADMIN_USER_IDS.includes(requestUserId(request));
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply, config: AppConfig): Promise<void> {
  if (isAdminUser(request, config)) return;
  await reply.status(403).send({ code: 'FORBIDDEN', message: 'Admin access required' });
}
