'use client';

import Link from 'next/link';
import { use } from 'react';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { useMovie } from '@/features/catalog/useMovie';
import { WatchlistButton } from '@/components/movie/WatchlistButton';
import { MediaImage } from '@/components/ui/MediaImage';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function MoviePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { movie, isLoading, error } = useMovie(slug);
  if (isLoading && !movie) return <><Header /><main className="detail-loading"><div className="loading-strip" aria-label="Loading title" /><p>Finding the right reel…</p></main></>;
  if (!movie) return <><Header /><main className="detail-missing"><p className="kicker">404 / TITLE NOT FOUND</p><h1>That story slipped<br /><em>off the reel.</em></h1><p className="detail-missing-copy">{error ?? 'We could not find that title in the live library.'}</p><Link href="/browse" className="button button-primary">Back to browse <span>↗</span></Link></main><SiteFooter /></>;
 return <><Header /><main className="movie-detail" style={{ '--backdrop': `url(${movie.backdropUrl || movie.posterUrl})` } as React.CSSProperties}><div className="detail-backdrop" /><section className="detail-content"><Link href="/browse" className="back-link">← Back to library</Link><div className="detail-copy">{error && <p className="preview-note">● {error}</p>}<p className="kicker"><span className="kicker-line" /> {movie.accessLevel === 'premium' ? 'NMEDIA PREMIERE' : 'AVAILABLE NOW'}</p><h1>{movie.title}</h1><div className="detail-meta"><span>{movie.year}</span><span>{movie.runtimeMin} MIN</span><span>{movie.ageRating}</span><span className="detail-rating">★ {movie.rating}</span></div><p className="detail-synopsis">{movie.synopsis}</p><div className="genre-list"><Badge tone={movie.accessLevel === 'premium' ? 'gold' : 'light'}>{movie.accessLevel === 'premium' ? 'Premium' : 'Free with ads'}</Badge>{movie.genres.map((genre) => <Badge key={genre}>{genre}</Badge>)}</div><div className="detail-actions"><Link href={`/watch/${encodeURIComponent(movie.slug)}`} className="button button-primary">{movie.accessLevel === 'premium' ? 'Upgrade to watch' : 'Play now'} <span>↗</span></Link><WatchlistButton movieId={movie.id} movieSlug={movie.slug} />{movie.accessLevel === 'premium' && <span className="detail-note"><span className="premium-dot">✦</span> Premium title</span>}</div></div></section><div className="detail-poster"><MediaImage src={movie.posterUrl} alt={`Poster for ${movie.title}`} title={movie.title} fill sizes="(max-width: 760px) 58vw, 280px" /></div></main><SiteFooter /></>;
}
