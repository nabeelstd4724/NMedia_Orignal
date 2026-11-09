import type { FastifyInstance } from 'fastify';
import { renderPrometheus, type Metrics } from './metrics.js';

export async function observabilityRoutes(app: FastifyInstance, metrics: Metrics): Promise<void> {
  app.get('/metrics', async (_request, reply) => reply.type('text/plain; version=0.0.4').send(renderPrometheus(metrics)));
}
