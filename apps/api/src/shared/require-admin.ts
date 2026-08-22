import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AppConfig } from '@ligat-fantasy/config';
import { requestUserId } from './request-user.js';

export function isAdminUser(request: FastifyRequest, config: AppConfig): boolean {
  return config.ADMIN_USER_IDS.includes(requestUserId(request));
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply, config: AppConfig): Promise<void> {
  if (isAdminUser(request, config)) return;
  await reply.status(403).send({ code: 'FORBIDDEN', message: 'Admin access required' });
}
