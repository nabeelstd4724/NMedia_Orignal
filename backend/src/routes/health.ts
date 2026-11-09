import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ data: { status: 'ok' } }));
  app.get('/ready', async () => ({ data: { status: 'ready' } }));
}
