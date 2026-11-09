import type { MovieSummary } from '../../../contracts/src/index.js';

export interface ProgressRecord {
  userId: string;
  movieId: string;
  positionSeconds: number;
  durationSeconds?: number;
  completed: boolean;
  updatedAt: string;
}

export interface WatchlistRecord {
  userId: string;
  movieId: string;
  addedAt: string;
}

export interface ProgressRepository {
  upsert(record: ProgressRecord): Promise<ProgressRecord>;
  listByUser(userId: string): Promise<ProgressRecord[]>;
}

export interface WatchlistRepository {
  add(userId: string, movieId: string): Promise<WatchlistRecord>;
  listByUser(userId: string): Promise<WatchlistRecord[]>;
  remove(userId: string, movieId: string): Promise<boolean>;
}

export class InMemoryProgressRepository implements ProgressRepository {
  private readonly records = new Map<string, ProgressRecord>();

  async upsert(record: ProgressRecord): Promise<ProgressRecord> {
    this.records.set(`${record.userId}:${record.movieId}`, record);
    return record;
  }

  async listByUser(userId: string): Promise<ProgressRecord[]> {
    return [...this.records.values()].filter((record) => record.userId === userId);
  }
}

export class InMemoryWatchlistRepository implements WatchlistRepository {
  private readonly records = new Map<string, WatchlistRecord>();

  async add(userId: string, movieId: string): Promise<WatchlistRecord> {
    const key = `${userId}:${movieId}`;
    const existing = this.records.get(key);
    if (existing) return existing;
    const record = { userId, movieId, addedAt: new Date().toISOString() };
    this.records.set(key, record);
    return record;
  }

  async listByUser(userId: string): Promise<WatchlistRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }

  async remove(userId: string, movieId: string): Promise<boolean> {
    return this.records.delete(`${userId}:${movieId}`);
  }
}

export type ViewerMovie = MovieSummary & { progress?: ProgressRecord; addedAt?: string };
