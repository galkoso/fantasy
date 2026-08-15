import type { FastifyRequest } from 'fastify';

export function requestUserId(request: FastifyRequest): string {
  const value = request.headers['x-user-id'];
  return typeof value === 'string' && value.length > 0 ? value : 'local-demo-user';
}
