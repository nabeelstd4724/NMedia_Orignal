import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { authenticatedUser } from '../auth/routes.js';
import type { AuthRepository } from '../auth/repository.js';
import type { CatalogRepository } from '../catalog/repository.js';
import type { ProgressRepository, WatchlistRepository } from '../viewer/repository.js';

const movieParamsSchema = { type: 'object', additionalProperties: false, required: ['movieId'], properties: { movieId: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[A-Za-z0-9_-]+$' } } } as const;
const progressBodySchema = { type: 'object', additionalProperties: false, required: ['positionSeconds'], properties: {
  positionSeconds: { type: 'number', minimum: 0 }, durationSeconds: { type: 'number', exclusiveMinimum: 0 }, completed: { type: 'boolean' },
} } as const;
const pageSchema = { type: 'object', additionalProperties: false, properties: { page: { type: 'integer', minimum: 1, default: 1 }, limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 } } } as const;

async function requireUser(request: FastifyRequest, reply: FastifyReply, auth: AuthRepository, config: AppConfig) {
  const user = await authenticatedUser(request, auth, config);
  if (!user) {
    reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } });
    return null;
  }
  return user;
}

export async function viewerRoutes(app: FastifyInstance, catalog: CatalogRepository, auth: AuthRepository, progress: ProgressRepository, watchlist: WatchlistRepository, config: AppConfig): Promise<void> {
  app.put<{ Params: { movieId: string }; Body: { positionSeconds: number; durationSeconds?: number; completed?: boolean } }>('/api/v1/me/progress/:movieId', { schema: { params: movieParamsSchema, body: progressBodySchema } }, async (request, reply) => {
    const user = await requireUser(request, reply, auth, config);
    if (!user) return;
    const movie = await catalog.findPublishedById(request.params.movieId);
    if (!movie) return reply.code(404).send({ error: { code: 'MOVIE_NOT_FOUND', message: 'Movie was not found' } });
    if (request.body.durationSeconds !== undefined && request.body.positionSeconds > request.body.durationSeconds) return reply.code(400).send({ error: { code: 'INVALID_PROGRESS', message: 'Position cannot exceed duration' } });
    const record = await progress.upsert({ userId: user.id, movieId: movie.id, positionSeconds: request.body.positionSeconds, durationSeconds: request.body.durationSeconds, completed: request.body.completed ?? false, updatedAt: new Date().toISOString() });
    const { userId: _userId, ...publicProgress } = record;
    return { data: { progress: publicProgress } };
  });

  app.get<{ Querystring: { page?: number; limit?: number } }>('/api/v1/me/continue-watching', { schema: { querystring: pageSchema } }, async (request, reply) => {
    const user = await requireUser(request, reply, auth, config);
    if (!user) return;
    const records = (await progress.listByUser(user.id)).filter((record) => !record.completed).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const page = request.query.page ?? 1; const limit = request.query.limit ?? 20;
    const movies = (await Promise.all(records.map(async (record) => { const movie = await catalog.findPublishedById(record.movieId); return movie ? { ...movie, progress: { movieId: record.movieId, positionSeconds: record.positionSeconds, ...(record.durationSeconds === undefined ? {} : { durationSeconds: record.durationSeconds }), completed: record.completed, updatedAt: record.updatedAt } } : null; }))).filter((movie): movie is NonNullable<typeof movie> => movie !== null);
    const total = movies.length;
    return { data: { movies: movies.slice((page - 1) * limit, page * limit).map(({ status: _status, ...movie }) => movie) }, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  });

  app.get<{ Querystring: { page?: number; limit?: number } }>('/api/v1/me/watchlist', { schema: { querystring: pageSchema } }, async (request, reply) => {
    const user = await requireUser(request, reply, auth, config);
    if (!user) return;
    const records = await watchlist.listByUser(user.id);
    const movies = (await Promise.all(records.map(async (record) => { const movie = await catalog.findPublishedById(record.movieId); return movie ? { ...movie, addedAt: record.addedAt } : null; }))).filter((movie): movie is NonNullable<typeof movie> => movie !== null);
    const page = request.query.page ?? 1; const limit = request.query.limit ?? 20; const total = movies.length;
    return { data: { movies: movies.slice((page - 1) * limit, page * limit).map(({ status: _status, ...movie }) => movie) }, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  });

  app.post<{ Params: { movieId: string } }>('/api/v1/me/watchlist/:movieId', { schema: { params: movieParamsSchema } }, async (request, reply) => {
    const user = await requireUser(request, reply, auth, config);
    if (!user) return;
    const movie = await catalog.findPublishedById(request.params.movieId);
    if (!movie) return reply.code(404).send({ error: { code: 'MOVIE_NOT_FOUND', message: 'Movie was not found' } });
    const record = await watchlist.add(user.id, movie.id);
    return reply.code(201).send({ data: { movieId: record.movieId, addedAt: record.addedAt } });
  });

  app.delete<{ Params: { movieId: string } }>('/api/v1/me/watchlist/:movieId', { schema: { params: movieParamsSchema } }, async (request, reply) => {
    const user = await requireUser(request, reply, auth, config);
    if (!user) return;
    const movie = await catalog.findPublishedById(request.params.movieId);
    if (!movie) return reply.code(404).send({ error: { code: 'MOVIE_NOT_FOUND', message: 'Movie was not found' } });
    await watchlist.remove(user.id, request.params.movieId);
    return { data: { movieId: request.params.movieId, removed: true } };
  });
}
