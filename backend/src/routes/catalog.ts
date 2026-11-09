import type { FastifyInstance } from 'fastify';
import type { AccessLevel } from '../../../contracts/src/index.js';
import type { CatalogRepository } from '../catalog/repository.js';

const querySchema = { type: 'object', additionalProperties: false, properties: {
  q: { type: 'string', minLength: 1, maxLength: 120 }, genre: { type: 'string', minLength: 1, maxLength: 40 },
  year: { type: 'integer', minimum: 1888, maximum: 2100 }, access: { type: 'string', enum: ['free_with_ads', 'premium'] },
  sort: { type: 'string', enum: ['title', 'year', 'rating', 'popular', 'newest', 'alphabetical'] }, page: { type: 'integer', minimum: 1, default: 1 }, limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
} } as const;
const paramsSchema = { type: 'object', additionalProperties: false, required: ['slug'], properties: { slug: { type: 'string', minLength: 1, maxLength: 160, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } } } as const;

export async function catalogRoutes(app: FastifyInstance, repo: CatalogRepository): Promise<void> {
  app.get<{ Querystring: { q?: string; genre?: string; year?: number; access?: AccessLevel; sort?: 'title' | 'year' | 'rating' | 'popular' | 'newest' | 'alphabetical'; page?: number; limit?: number } }>('/api/v1/movies', { schema: { querystring: querySchema } }, async (request) => {
    const page = request.query.page ?? 1;
    const limit = request.query.limit ?? 20;
    const movies = await repo.listPublished({ ...request.query, sort: request.query.sort ?? 'rating' });
    const total = movies.length;
    return { data: { movies: movies.slice((page - 1) * limit, page * limit).map(({ status: _status, ...movie }) => movie) }, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  });

  app.get<{ Params: { slug: string } }>('/api/v1/movies/:slug', { schema: { params: paramsSchema } }, async (request, reply) => {
    const movie = await repo.findPublishedBySlug(request.params.slug);
    if (!movie) return reply.code(404).send({ error: { code: 'MOVIE_NOT_FOUND', message: 'Movie was not found' } });
    const { status: _status, ...publicMovie } = movie;
    return { data: publicMovie };
  });

  app.get('/api/v1/genres', async () => {
    const genres = await repo.listPublishedGenres();
    return { data: { genres }, meta: { total: genres.length } };
  });
}
