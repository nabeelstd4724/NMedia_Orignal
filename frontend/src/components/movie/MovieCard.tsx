import type { MovieSummary } from '@nmedia/contracts';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { MediaImage } from '@/components/ui/MediaImage';

export function MovieCard({ movie }: { movie: MovieSummary }) {
  return <article className="movie-card">
    <Link href={`/movie/${movie.slug}`} className="poster-link" aria-label={`Open ${movie.title}`}>
      <MediaImage src={movie.posterUrl} alt={`${movie.title} poster`} title={movie.title} className="poster-media" fill sizes="(max-width: 760px) 45vw, 214px" />
      <span className="poster-sheen" />
      <span className="poster-hover-label">View title <span aria-hidden="true">↗</span></span>
      {movie.accessLevel === 'premium' && <span className="lock-badge" aria-label="Premium title">✦</span>}
    </Link>
    <div className="movie-card-meta"><h3>{movie.title}</h3><span>{movie.year} · {movie.runtimeMin}m</span></div>
    <div className="movie-card-tags"><Badge>{movie.genres[0]}</Badge><span className="rating">★ {movie.rating}</span></div>
  </article>;
}
