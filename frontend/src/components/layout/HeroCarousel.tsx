'use client';

import { useEffect, useRef, useState } from 'react';
import type { HeroItem } from '@nmedia/contracts';
import { Hero } from './Hero';

export function HeroCarousel({ heroes }: { heroes: HeroItem[] }) {
  const slides = heroes.slice(0, 8);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStart = useRef<number | null>(null);
  const pointerStart = useRef<number | null>(null);
  const current = slides[index] ?? slides[0];

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, slides.length]);

  if (!current) return null;
  const go = (next: number) => setIndex((next + slides.length) % slides.length);
  return <div className="hero-carousel" data-testid="hero-carousel" aria-roledescription="carousel" aria-label="Featured stories" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false); }} onPointerDown={(event) => { pointerStart.current = event.clientX; }} onPointerUp={(event) => { const start = pointerStart.current; pointerStart.current = null; if (start === null || Math.abs(event.clientX - start) < 40) return; go(index + (event.clientX < start ? 1 : -1)); }} onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const start = touchStart.current; const end = event.changedTouches[0]?.clientX; touchStart.current = null; if (start === null || end === undefined || Math.abs(end - start) < 40) return; go(index + (end < start ? 1 : -1)); }}>
    <Hero hero={current} priority={index === 0} />
    {slides.length > 1 && <div className="hero-carousel-controls"><button className="hero-control" type="button" aria-label="Previous featured story" onClick={() => go(index - 1)}>←</button><div className="hero-dots" role="tablist" aria-label="Featured story slides">{slides.map((slide, slideIndex) => <button key={slide.id} className={`hero-dot${slideIndex === index ? ' is-active' : ''}`} type="button" role="tab" aria-selected={slideIndex === index} aria-label={`Show ${slide.title}`} onClick={() => go(slideIndex)}><span /></button>)}</div><button className="hero-control" type="button" aria-label="Next featured story" onClick={() => go(index + 1)}>→</button></div>}
  </div>;
}
