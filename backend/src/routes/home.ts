import type { FastifyInstance } from 'fastify';
import type { HomepageRepository } from '../homepage/repository.js';
import type { CatalogRepository } from '../catalog/repository.js';
import { HomepageViewService } from '../homepage/service.js';

export async function homeRoutes(app: FastifyInstance, homepage: HomepageRepository, catalog: CatalogRepository, view = new HomepageViewService(homepage, catalog)): Promise<void> {
  app.get('/api/v1/home', async () => ({ data: await view.getPublished() }));
}
