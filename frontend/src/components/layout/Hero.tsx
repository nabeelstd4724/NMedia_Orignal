import type { HeroItem } from '@nmedia/contracts';
import { Badge } from '@/components/ui/Badge';
import { MediaImage } from '@/components/ui/MediaImage';

export function Hero({ hero, priority = false }: { hero: HeroItem; priority?: boolean }) {
  return <section className="hero" aria-labelledby="featured-title">
    <div className="hero-media" aria-hidden="true"><MediaImage src={hero.backdropUrl} alt="" title={hero.title} fill priority={priority} sizes="100vw" /></div>
    <div className="hero-copy"><p className="kicker">{hero.eyebrow} <span className="kicker-line" /></p><h1 id="featured-title">{hero.title}<em>after</em></h1><p className="hero-accent">{hero.accent}</p><p className="hero-synopsis">{hero.synopsis}</p><div className="hero-details"><Badge tone="gold">Premium</Badge><span>{hero.year}</span><span>{hero.runtimeMin} min</span><span>★ {hero.rating}</span></div><div className="hero-actions"><a className="button button-primary" href={`/movie/${hero.slug}`}>View details <span>↗</span></a><button className="circle-button" aria-label="Add Afterlight to watchlist">＋</button></div></div>
  </section>;
}
