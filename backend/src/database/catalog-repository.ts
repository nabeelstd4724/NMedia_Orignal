import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AccessLevel, MovieStatus } from '../../../contracts/src/index.js';
import { seedMovies, type CatalogMovie, type CatalogRepository, type CreateMovieInput, type MovieListFilters } from '../catalog/repository.js';

type MovieRow = {
  id: string; slug: string; title: string; synopsis: string; year: number; runtimeMin: number;
  ageRating: string; accessLevel: AccessLevel; posterUrl: string; backdropUrl: string;
  rating: number; genresJson: string; collectionIdsJson?: string | null; status: MovieStatus; videoUploadId?: string | null;
};

/** Additive SQLite catalog store. Existing auth/audit tables and user data are preserved. */
export class SQLiteCatalogRepository implements CatalogRepository {
  private readonly db: Database.Database;
  private readonly movieColumns = 'id,slug,title,synopsis,year,runtime_min runtimeMin,age_rating ageRating,access_level accessLevel,poster_url posterUrl,backdrop_url backdropUrl,rating,genres_json genresJson,collection_ids_json collectionIdsJson,status,video_upload_id videoUploadId';

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      synopsis TEXT NOT NULL,
      year INTEGER NOT NULL,
      runtime_min INTEGER NOT NULL,
      age_rating TEXT NOT NULL,
      access_level TEXT NOT NULL,
      poster_url TEXT NOT NULL,
      backdrop_url TEXT NOT NULL,
      rating REAL NOT NULL,
       genres_json TEXT NOT NULL,
       collection_ids_json TEXT,
      status TEXT NOT NULL,
      video_upload_id TEXT,
      created_at TEXT NOT NULL
     ); CREATE INDEX IF NOT EXISTS movies_status_idx ON movies(status); CREATE INDEX IF NOT EXISTS movies_slug_idx ON movies(slug);`);
     try { this.db.exec('ALTER TABLE movies ADD COLUMN collection_ids_json TEXT'); } catch { /* already present */ }
     this.db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS movies_search USING fts5(id UNINDEXED, slug, title, synopsis, genres)');
    const count = (this.db.prepare('SELECT COUNT(*) count FROM movies').get() as { count: number }).count;
    if (count === 0) {
      const insert = this.db.prepare('INSERT INTO movies(id,slug,title,synopsis,year,runtime_min,age_rating,access_level,poster_url,backdrop_url,rating,genres_json,collection_ids_json,status,video_upload_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
      const seed = this.db.transaction(() => { for (const movie of seedMovies) insert.run(movie.id, movie.slug, movie.title, movie.synopsis, movie.year, movie.runtimeMin, movie.ageRating, movie.accessLevel, movie.posterUrl, movie.backdropUrl, movie.rating, JSON.stringify(movie.genres), movie.collectionIds ? JSON.stringify(movie.collectionIds) : null, movie.status, movie.videoUploadId ?? null, new Date().toISOString()); });
      seed();
    }
    this.rebuildSearchIndex();
  }

  private rebuildSearchIndex(): void {
    this.db.exec('DELETE FROM movies_search');
    this.db.exec("INSERT INTO movies_search(id,slug,title,synopsis,genres) SELECT id,slug,title,synopsis,replace(genres_json, ',', ' ') FROM movies");
  }

  private searchIds(query: string): string[] {
    const tokens = query.toLowerCase().replace(/[^a-z0-9\s]/giu, ' ').split(/\s+/u).filter(Boolean).map((token) => `\"${token}\"*`);
    if (!tokens.length) return [];
    return (this.db.prepare('SELECT id FROM movies_search WHERE movies_search MATCH ?').all(tokens.join(' AND ')) as Array<{ id: string }>).map((row) => row.id);
  }

  private map(row: MovieRow | undefined): CatalogMovie | null {
    if (!row) return null;
    return { id: row.id, slug: row.slug, title: row.title, synopsis: row.synopsis, year: row.year, runtimeMin: row.runtimeMin, ageRating: row.ageRating, accessLevel: row.accessLevel, posterUrl: row.posterUrl, backdropUrl: row.backdropUrl, rating: row.rating, genres: JSON.parse(row.genresJson) as string[], ...(row.collectionIdsJson ? { collectionIds: JSON.parse(row.collectionIdsJson) as string[] } : {}), status: row.status, ...(row.videoUploadId ? { videoUploadId: row.videoUploadId } : {}) };
  }

  private rows(sql: string, params: unknown[] = []): CatalogMovie[] {
    return (this.db.prepare(sql).all(...params) as MovieRow[]).map((row) => this.map(row)!).filter(Boolean);
  }

  async listPublished(filters: MovieListFilters): Promise<CatalogMovie[]> {
    const where = ['status=?']; const params: unknown[] = ['published'];
    if (filters.q) { const ids = this.searchIds(filters.q); if (!ids.length) return []; where.push(`id IN (${ids.map(() => '?').join(',')})`); params.push(...ids); }
    const movies = this.rows(`SELECT ${this.movieColumns} FROM movies WHERE ${where.join(' AND ')} ORDER BY created_at DESC`, params);
    return movies.filter((movie) => !filters.genre || movie.genres.some((genre) => genre.toLowerCase() === filters.genre?.toLowerCase())).filter((movie) => !filters.year || movie.year === filters.year).filter((movie) => !filters.access || movie.accessLevel === filters.access).sort((a, b) => filters.sort === 'title' || filters.sort === 'alphabetical' ? a.title.localeCompare(b.title) : filters.sort === 'year' || filters.sort === 'newest' ? b.year - a.year || b.title.localeCompare(a.title) : b.rating - a.rating || a.title.localeCompare(b.title));
  }

  async listAll(filters: { status?: MovieStatus; q?: string } = {}): Promise<CatalogMovie[]> {
    const where: string[] = []; const params: unknown[] = [];
    if (filters.status) { where.push('status=?'); params.push(filters.status); }
    if (filters.q) { const ids = this.searchIds(filters.q); if (!ids.length) return []; where.push(`id IN (${ids.map(() => '?').join(',')})`); params.push(...ids); }
    return this.rows(`SELECT ${this.movieColumns} FROM movies${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`, params);
  }

  async create(input: CreateMovieInput): Promise<CatalogMovie> {
    const movie: CatalogMovie = { ...input, id: `mov_${randomUUID()}`, status: input.status ?? 'draft', genres: [...input.genres], ...(input.collectionIds ? { collectionIds: [...input.collectionIds] } : {}) };
     this.db.prepare('INSERT INTO movies(id,slug,title,synopsis,year,runtime_min,age_rating,access_level,poster_url,backdrop_url,rating,genres_json,collection_ids_json,status,video_upload_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(movie.id, movie.slug, movie.title, movie.synopsis, movie.year, movie.runtimeMin, movie.ageRating, movie.accessLevel, movie.posterUrl, movie.backdropUrl, movie.rating, JSON.stringify(movie.genres), movie.collectionIds ? JSON.stringify(movie.collectionIds) : null, movie.status, movie.videoUploadId ?? null, new Date().toISOString());
     this.db.prepare('INSERT INTO movies_search(id,slug,title,synopsis,genres) VALUES (?,?,?,?,?)').run(movie.id, movie.slug, movie.title, movie.synopsis, movie.genres.join(' '));
    return { ...movie, genres: [...movie.genres] };
  }

  async findById(id: string): Promise<CatalogMovie | null> { return this.map(this.db.prepare('SELECT id,slug,title,synopsis,year,runtime_min runtimeMin,age_rating ageRating,access_level accessLevel,poster_url posterUrl,backdrop_url backdropUrl,rating,genres_json genresJson,collection_ids_json collectionIdsJson,status,video_upload_id videoUploadId FROM movies WHERE id=?').get(id) as MovieRow | undefined); }
  async findBySlug(slug: string): Promise<CatalogMovie | null> { return this.map(this.db.prepare('SELECT id,slug,title,synopsis,year,runtime_min runtimeMin,age_rating ageRating,access_level accessLevel,poster_url posterUrl,backdrop_url backdropUrl,rating,genres_json genresJson,collection_ids_json collectionIdsJson,status,video_upload_id videoUploadId FROM movies WHERE slug=?').get(slug) as MovieRow | undefined); }
  async setStatus(id: string, status: MovieStatus): Promise<CatalogMovie | null> { const result = this.db.prepare('UPDATE movies SET status=? WHERE id=?').run(status, id); return result.changes ? this.findById(id) : null; }
  async findPublishedBySlug(slug: string): Promise<CatalogMovie | null> { return this.map(this.db.prepare('SELECT id,slug,title,synopsis,year,runtime_min runtimeMin,age_rating ageRating,access_level accessLevel,poster_url posterUrl,backdrop_url backdropUrl,rating,genres_json genresJson,collection_ids_json collectionIdsJson,status,video_upload_id videoUploadId FROM movies WHERE slug=? AND status=?').get(slug, 'published') as MovieRow | undefined); }
  async findPublishedById(id: string): Promise<CatalogMovie | null> { return this.map(this.db.prepare('SELECT id,slug,title,synopsis,year,runtime_min runtimeMin,age_rating ageRating,access_level accessLevel,poster_url posterUrl,backdrop_url backdropUrl,rating,genres_json genresJson,collection_ids_json collectionIdsJson,status,video_upload_id videoUploadId FROM movies WHERE id=? AND status=?').get(id, 'published') as MovieRow | undefined); }
  async listPublishedGenres(): Promise<string[]> { return [...new Set((await this.listPublished({ sort: 'rating' })).flatMap((movie) => movie.genres))].sort((a, b) => a.localeCompare(b)); }
  close(): void { this.db.close(); }
}
