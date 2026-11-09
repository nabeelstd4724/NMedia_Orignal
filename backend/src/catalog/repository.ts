import type { AccessLevel, MovieStatus, MovieSummary } from '../../../contracts/src/index.js';
import { randomUUID } from 'node:crypto';

export interface CatalogMovie extends MovieSummary {
  status: MovieStatus;
  videoUploadId?: string;
}

export interface MovieListFilters {
  q?: string;
  genre?: string;
  year?: number;
  access?: AccessLevel;
  sort: 'title' | 'year' | 'rating' | 'popular' | 'newest' | 'alphabetical';
}

export interface CreateMovieInput extends Omit<CatalogMovie, 'id' | 'status'> {
  status?: MovieStatus;
}

export interface CatalogRepository {
  listPublished(filters: MovieListFilters): Promise<CatalogMovie[]>;
  listAll(filters?: { status?: MovieStatus; q?: string }): Promise<CatalogMovie[]>;
  create(input: CreateMovieInput): Promise<CatalogMovie>;
  findById(id: string): Promise<CatalogMovie | null>;
  findBySlug(slug: string): Promise<CatalogMovie | null>;
  setStatus(id: string, status: MovieStatus): Promise<CatalogMovie | null>;
  findPublishedBySlug(slug: string): Promise<CatalogMovie | null>;
  findPublishedById(id: string): Promise<CatalogMovie | null>;
  listPublishedGenres(): Promise<string[]>;
}

export const seedMovies: CatalogMovie[] = [
  { id: 'mov_aurora', slug: 'aurora-line', title: 'Aurora Line', synopsis: 'A cartographer follows a vanished signal across a frozen frontier.', year: 2025, runtimeMin: 118, ageRating: 'PG-13', accessLevel: 'premium', posterUrl: '/images/aurora-line-poster.jpg', backdropUrl: '/images/aurora-line-backdrop.jpg', rating: 8.7, genres: ['Drama', 'Adventure'], status: 'published' },
  { id: 'mov_afterglow', slug: 'afterglow-city', title: 'Afterglow City', synopsis: 'Two night-shift strangers discover a hidden life beneath the neon.', year: 2024, runtimeMin: 104, ageRating: 'R', accessLevel: 'free_with_ads', posterUrl: '/images/afterglow-city-poster.jpg', backdropUrl: '/images/afterglow-city-backdrop.jpg', rating: 8.1, genres: ['Drama', 'Thriller'], status: 'published' },
  { id: 'mov_tide', slug: 'the-last-tide', title: 'The Last Tide', synopsis: 'A coastal community races to save its island before the final storm.', year: 2023, runtimeMin: 126, ageRating: 'PG', accessLevel: 'free_with_ads', posterUrl: '/images/the-last-tide-poster.jpg', backdropUrl: '/images/the-last-tide-backdrop.jpg', rating: 7.9, genres: ['Adventure', 'Family'], status: 'published' },
  { id: 'mov_signal', slug: 'signal-in-the-static', title: 'Signal in the Static', synopsis: 'A radio engineer hears a voice that should have gone silent decades ago.', year: 2022, runtimeMin: 111, ageRating: 'PG-13', accessLevel: 'premium', posterUrl: '/images/signal-in-the-static-poster.jpg', backdropUrl: '/images/signal-in-the-static-backdrop.jpg', rating: 8.4, genres: ['Mystery', 'Science Fiction'], status: 'published' },
  { id: 'mov_copper', slug: 'copper-sky', title: 'Copper Sky', synopsis: 'An apprentice pilot and a retired racer chase one impossible record.', year: 2021, runtimeMin: 99, ageRating: 'PG', accessLevel: 'free_with_ads', posterUrl: '/images/copper-sky-poster.jpg', backdropUrl: '/images/copper-sky-backdrop.jpg', rating: 7.6, genres: ['Adventure', 'Action'], status: 'published' },
  { id: 'mov_velvet', slug: 'velvet-morning', title: 'Velvet Morning', synopsis: 'A chef returns home and finds a recipe for starting over.', year: 2020, runtimeMin: 101, ageRating: 'PG', accessLevel: 'premium', posterUrl: '/images/velvet-morning-poster.jpg', backdropUrl: '/images/velvet-morning-backdrop.jpg', rating: 8.0, genres: ['Drama', 'Romance'], status: 'published' },
  { id: 'mov_orbit', slug: 'orbit-fall', title: 'Orbit Fall', synopsis: 'A rescue crew must choose between a stranded station and Earth.', year: 2026, runtimeMin: 132, ageRating: 'PG-13', accessLevel: 'premium', posterUrl: '/images/orbit-fall-poster.jpg', backdropUrl: '/images/orbit-fall-backdrop.jpg', rating: 8.9, genres: ['Science Fiction', 'Thriller'], status: 'scheduled' },
  { id: 'mov_dust', slug: 'dust-and-mercy', title: 'Dust and Mercy', synopsis: 'A small-town medic protects a witness through one long desert night.', year: 2019, runtimeMin: 108, ageRating: 'R', accessLevel: 'free_with_ads', posterUrl: '/images/dust-and-mercy-poster.jpg', backdropUrl: '/images/dust-and-mercy-backdrop.jpg', rating: 7.8, genres: ['Drama', 'Thriller'], status: 'published' },
];

export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly movies: CatalogMovie[] = seedMovies.map((movie) => ({ ...movie, genres: [...movie.genres] }));

  async listPublished(filters: MovieListFilters): Promise<CatalogMovie[]> {
    return this.movies.filter((movie) => movie.status === 'published')
      .filter((movie) => !filters.q || `${movie.slug} ${movie.title} ${movie.synopsis} ${movie.genres.join(' ')}`.toLowerCase().includes(filters.q.toLowerCase()))
      .filter((movie) => !filters.genre || movie.genres.some((genre) => genre.toLowerCase() === filters.genre?.toLowerCase()))
      .filter((movie) => !filters.year || movie.year === filters.year)
      .filter((movie) => !filters.access || movie.accessLevel === filters.access)
      .sort((a, b) => filters.sort === 'title' || filters.sort === 'alphabetical' ? a.title.localeCompare(b.title) : filters.sort === 'year' || filters.sort === 'newest' ? b.year - a.year || b.title.localeCompare(a.title) : b.rating - a.rating || a.title.localeCompare(b.title));
  }

  async listAll(filters: { status?: MovieStatus; q?: string } = {}): Promise<CatalogMovie[]> {
    return this.movies.filter((movie) => !filters.status || movie.status === filters.status)
      .filter((movie) => !filters.q || `${movie.slug} ${movie.title} ${movie.synopsis} ${movie.genres.join(' ')}`.toLowerCase().includes(filters.q.toLowerCase()))
       .map((movie) => ({ ...movie, genres: [...movie.genres], ...(movie.collectionIds ? { collectionIds: [...movie.collectionIds] } : {}) }));
  }

  async create(input: CreateMovieInput): Promise<CatalogMovie> {
    const movie: CatalogMovie = { ...input, id: `mov_${randomUUID()}`, status: input.status ?? 'draft', genres: [...input.genres], ...(input.collectionIds ? { collectionIds: [...input.collectionIds] } : {}) };
    this.movies.push(movie);
    return { ...movie, genres: [...movie.genres], ...(movie.collectionIds ? { collectionIds: [...movie.collectionIds] } : {}) };
  }

  async findById(id: string): Promise<CatalogMovie | null> {
    const movie = this.movies.find((candidate) => candidate.id === id);
    return movie ? { ...movie, genres: [...movie.genres], ...(movie.collectionIds ? { collectionIds: [...movie.collectionIds] } : {}) } : null;
  }

  async findBySlug(slug: string): Promise<CatalogMovie | null> {
    const movie = this.movies.find((candidate) => candidate.slug === slug);
    return movie ? { ...movie, genres: [...movie.genres], ...(movie.collectionIds ? { collectionIds: [...movie.collectionIds] } : {}) } : null;
  }

  async setStatus(id: string, status: MovieStatus): Promise<CatalogMovie | null> {
    const movie = this.movies.find((candidate) => candidate.id === id);
    if (!movie) return null;
    movie.status = status;
    return { ...movie, genres: [...movie.genres] };
  }

  async findPublishedBySlug(slug: string): Promise<CatalogMovie | null> {
    return this.movies.find((movie) => movie.status === 'published' && movie.slug === slug) ?? null;
  }

  async findPublishedById(id: string): Promise<CatalogMovie | null> {
    return this.movies.find((movie) => movie.status === 'published' && movie.id === id) ?? null;
  }

  async listPublishedGenres(): Promise<string[]> {
    return [...new Set(this.movies.filter((movie) => movie.status === 'published').flatMap((movie) => movie.genres))].sort((a, b) => a.localeCompare(b));
  }
}
