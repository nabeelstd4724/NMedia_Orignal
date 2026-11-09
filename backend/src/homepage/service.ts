import type { CatalogMovie, CatalogRepository } from '../catalog/repository.js';
import type { HomepageRepository } from './repository.js';
import type { HomeResponse, HomeRow } from '../../../contracts/src/index.js';
import { buildPublishedHome } from './hero-service.js';

export class HomepageViewService {
  private cached: { value: HomeResponse; expiresAt: number } | null = null;
  constructor(private readonly homepage: HomepageRepository, private readonly catalog: CatalogRepository) {}

  async getPublished(now = new Date()): Promise<HomeResponse> {
    if (this.cached && this.cached.expiresAt > now.getTime()) return this.cached.value;
    const [home, movies] = await Promise.all([this.homepage.getPublished(), this.catalog.listPublished({ sort: 'rating' })]);
    const value = buildPublishedHome(this.mergeCollectionTitles(home, movies), movies, now);
    this.cached = { value, expiresAt: now.getTime() + 30_000 };
    return value;
  }

  invalidate(): void { this.cached = null; }

  private mergeCollectionTitles(home: HomeResponse, movies: CatalogMovie[]): HomeResponse {
    const rows: HomeRow[] = home.rows.map((row) => {
      const collectionId = `col_${row.id.replace(/^row-/u, '')}`;
      const existing = new Set(row.items.map((item) => item.id));
      const additions = movies.filter((movie) => movie.collectionIds?.includes(collectionId) && !existing.has(movie.id)).map(({ status: _status, videoUploadId: _videoUploadId, ...movie }) => movie);
      return additions.length ? { ...row, items: [...row.items, ...additions] } : row;
    });
    return { ...home, rows };
  }
}
