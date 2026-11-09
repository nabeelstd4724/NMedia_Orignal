import type { HomeResponse, MovieSummary } from '@nmedia/contracts';

export const featuredHome: HomeResponse = {
  hero: {
    id: 'hero-01', slug: 'afterlight', title: 'Afterlight', synopsis: 'A lunar cartographer finds a signal that should not exist — and follows it home.', year: 2026, runtimeMin: 118, ageRating: '16+', accessLevel: 'premium', posterUrl: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=85', backdropUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1800&q=85', rating: 8.7, genres: ['Sci-fi', 'Mystery'], eyebrow: 'NMEDIA ORIGINAL', accent: 'A quiet signal. A very loud secret.', ctaLabel: 'Explore film'
  },
  heroes: [
    { id: 'hero-01', slug: 'afterlight', title: 'Afterlight', synopsis: 'A lunar cartographer finds a signal that should not exist — and follows it home.', year: 2026, runtimeMin: 118, ageRating: '16+', accessLevel: 'premium', posterUrl: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=85', backdropUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1800&q=85', rating: 8.7, genres: ['Sci-fi', 'Mystery'], eyebrow: 'NMEDIA ORIGINAL', accent: 'A quiet signal. A very loud secret.', ctaLabel: 'Explore film' },
    { id: 'hero-02', slug: 'orbiters', title: 'Orbiters', synopsis: 'The crew that refused to come down.', year: 2026, runtimeMin: 124, ageRating: '13+', accessLevel: 'premium', posterUrl: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?auto=format&fit=crop&w=700&q=85', backdropUrl: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?auto=format&fit=crop&w=1800&q=85', rating: 8.9, genres: ['Sci-fi'], eyebrow: 'NMEDIA PREMIERE', accent: 'Some stories refuse gravity.', ctaLabel: 'Explore film' },
    { id: 'hero-03', slug: 'soft-static', title: 'Soft Static', synopsis: 'A love story told in frequencies.', year: 2024, runtimeMin: 96, ageRating: '13+', accessLevel: 'premium', posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85', backdropUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1800&q=85', rating: 8.4, genres: ['Drama'], eyebrow: 'A NMEDIA ORIGINAL', accent: 'Tune in to what remains.', ctaLabel: 'Explore film' },
  ],
  rows: [
    { id: 'r1', title: 'Curated for your midnight', type: 'manual', items: [
      { id: 'm1', slug: 'the-last-signal', title: 'The Last Signal', synopsis: 'A radio host hears tomorrow.', year: 2025, runtimeMin: 102, ageRating: '13+', accessLevel: 'free_with_ads', posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80', backdropUrl: '', rating: 8.1, genres: ['Thriller'] },
      { id: 'm2', slug: 'soft-static', title: 'Soft Static', synopsis: 'A love story told in frequencies.', year: 2024, runtimeMin: 96, ageRating: '13+', accessLevel: 'premium', posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80', backdropUrl: '', rating: 8.4, genres: ['Drama'] },
      { id: 'm3', slug: 'blue-hour', title: 'Blue Hour', synopsis: 'Three strangers, one borrowed summer.', year: 2025, runtimeMin: 110, ageRating: '16+', accessLevel: 'free_with_ads', posterUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80', backdropUrl: '', rating: 7.9, genres: ['Indie'] },
       { id: 'm4', slug: 'orbiters', title: 'Orbiters', synopsis: 'The crew that refused to come down.', year: 2026, runtimeMin: 124, ageRating: '13+', accessLevel: 'premium', posterUrl: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?auto=format&fit=crop&w=600&q=80', backdropUrl: '', rating: 8.9, genres: ['Sci-fi'] }
       ,{ id: 'm5', slug: 'hollow-signal', title: 'Hollow Signal', synopsis: 'A missing voice returns from the edge of town.', year: 2025, runtimeMin: 101, ageRating: '13+', accessLevel: 'free_with_ads', posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80', backdropUrl: '', rating: 8.2, genres: ['Mystery'] }
       ,{ id: 'm6', slug: 'night-archive', title: 'Night Archive', synopsis: 'Every midnight leaves a record behind.', year: 2024, runtimeMin: 98, ageRating: '16+', accessLevel: 'premium', posterUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80', backdropUrl: '', rating: 8.5, genres: ['Indie'] }
     ]},
    { id: 'r2', title: 'New this week', type: 'auto', items: [] }
  ]
};

export type CatalogMovie = MovieSummary;

/** The local catalog keeps browsing useful while the catalog service is offline. */
export const catalogFixture: MovieSummary[] = [
  ...featuredHome.rows.flatMap((row) => row.items),
  featuredHome.hero,
];

export function findFixtureMovie(slug: string): MovieSummary | undefined {
  return catalogFixture.find((movie) => movie.slug === slug);
}
