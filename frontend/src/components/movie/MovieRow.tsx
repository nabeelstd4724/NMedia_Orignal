import type { MovieSummary } from '@nmedia/contracts';
import Link from 'next/link';
import { MovieCard } from './MovieCard';

export function MovieRow({ title, items }: { title: string; items: MovieSummary[] }) {
  if (!items.length) return <section className="row-section"><div className="section-heading"><h2>{title}</h2></div><div className="empty-state">More stories are being lined up.</div></section>;
  return <section className="row-section"><div className="section-heading"><h2>{title}</h2><Link href="/browse">See all <span aria-hidden="true">↗</span></Link></div><div className="movie-row">{items.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div></section>;
}
