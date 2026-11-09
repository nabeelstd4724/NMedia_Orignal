import type { HeroItem, HomeResponse } from '../../../contracts/src/index.js';

const nightSignal = {
  id: 'movie-night-signal',
  slug: 'night-signal',
  title: 'Night Signal',
  synopsis: 'A radio astronomer follows a signal that should not exist.',
  year: 2025,
  runtimeMin: 118,
  ageRating: 'PG-13',
  accessLevel: 'free_with_ads' as const,
  posterUrl: '/images/night-signal-poster.jpg',
  backdropUrl: '/images/night-signal-backdrop.jpg',
  rating: 8.1,
  genres: ['Sci-Fi', 'Thriller'],
};

const heroItems: HeroItem[] = [
  { ...nightSignal, eyebrow: 'Featured premiere', accent: 'The signal is only the beginning.', ctaLabel: 'Watch trailer' },
  { ...nightSignal, id: 'movie-aurora-line', slug: 'aurora-line', title: 'Aurora Line', synopsis: 'A cartographer follows a vanished signal across a frozen frontier.', year: 2025, runtimeMin: 118, ageRating: 'PG-13', accessLevel: 'premium', posterUrl: '/images/aurora-line-poster.jpg', backdropUrl: '/images/aurora-line-backdrop.jpg', rating: 8.7, genres: ['Drama', 'Adventure'], eyebrow: 'NMEDIA PREMIERE', accent: 'Some maps are meant to be followed.', ctaLabel: 'Explore film' },
  { ...nightSignal, id: 'movie-signal-static', slug: 'signal-in-the-static', title: 'Signal in the Static', synopsis: 'A radio engineer hears a voice that should have gone silent decades ago.', year: 2022, runtimeMin: 111, ageRating: 'PG-13', accessLevel: 'premium', posterUrl: '/images/signal-in-the-static-poster.jpg', backdropUrl: '/images/signal-in-the-static-backdrop.jpg', rating: 8.4, genres: ['Mystery', 'Science Fiction'], eyebrow: 'A QUIET THRILLER', accent: 'Listen closely. It remembers you.', ctaLabel: 'Explore film' },
];

export const homeFixture: HomeResponse = {
  hero: heroItems[0],
  heroes: heroItems,
  heroSlides: [
    { id: 'slide-night-signal', movieId: nightSignal.id, eyebrow: 'Featured premiere', accent: 'The signal is only the beginning.', ctaLabel: 'Watch trailer', active: true, order: 1 },
  ],
  rows: [
    { id: 'row-featured', title: 'Featured this week', type: 'manual', items: [nightSignal] },
    { id: 'row-sci-fi', title: 'More science fiction', type: 'auto', items: [nightSignal] },
  ],
};
