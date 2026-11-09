import type { HeroItem, HeroSlide, HomeResponse } from '../../../contracts/src/index.js';
import type { CatalogMovie } from '../catalog/repository.js';

function inSchedule(slide: HeroSlide, now: Date): boolean {
  const timestamp = now.getTime();
  if (slide.startAt && timestamp < Date.parse(slide.startAt)) return false;
  if (slide.endAt && timestamp > Date.parse(slide.endAt)) return false;
  return true;
}

function fromMovie(movie: CatalogMovie, copy?: Pick<HeroSlide, 'eyebrow' | 'accent' | 'ctaLabel'>): HeroItem {
  return {
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    synopsis: movie.synopsis,
    year: movie.year,
    runtimeMin: movie.runtimeMin,
    ageRating: movie.ageRating,
    accessLevel: movie.accessLevel,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    rating: movie.rating,
    genres: [...movie.genres],
    eyebrow: copy?.eyebrow ?? 'NMEDIA FEATURED',
    accent: copy?.accent ?? 'A story worth staying up for.',
    ctaLabel: copy?.ctaLabel ?? 'Explore film',
  };
}

export function buildHeroes(home: HomeResponse, movies: CatalogMovie[], now = new Date()): HeroItem[] {
  const byId = new Map(movies.map((movie) => [movie.id, movie]));
  const slides = (home.heroSlides ?? []).filter((slide) => slide.active && inSchedule(slide, now)).sort((a, b) => a.order - b.order).slice(0, 8);
  const fromSlides = slides.flatMap((slide) => { const movie = byId.get(slide.movieId); return movie ? [fromMovie(movie, slide)] : []; });
  if (fromSlides.length) return fromSlides;
  const featured = [...movies].sort((a, b) => b.rating - a.rating || b.year - a.year).slice(0, 8).map((movie) => fromMovie(movie));
  return featured.length ? featured : [home.hero];
}

export function buildPublishedHome(home: HomeResponse, movies: CatalogMovie[], now = new Date()): HomeResponse {
  const heroes = buildHeroes(home, movies, now);
  return { ...home, hero: heroes[0] ?? home.hero, heroes };
}
