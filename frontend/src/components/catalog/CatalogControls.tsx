'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { CatalogFilters } from '@/features/catalog/useCatalog';

const genres = ['All genres', 'Sci-fi', 'Mystery', 'Thriller', 'Drama', 'Indie'];
type Option = { value: string; label: string };

const options: Record<'genre' | 'access' | 'sort', Option[]> = {
  genre: genres.map((label) => ({ value: label === 'All genres' ? '' : label, label })),
  access: [{ value: '', label: 'Everything' }, { value: 'free_with_ads', label: 'Free with ads' }, { value: 'premium', label: 'Premium' }],
  sort: [{ value: 'popular', label: 'Most loved' }, { value: 'newest', label: 'Newest first' }, { value: 'alphabetical', label: 'A–Z' }],
};

export function CatalogControls({ filters, onChange }: { filters: CatalogFilters; onChange: (next: Partial<CatalogFilters>) => void }) {
  const [query, setQuery] = useState(filters.query);
  useEffect(() => setQuery(filters.query), [filters.query]);
  useEffect(() => {
    if (query === filters.query) return;
    const timer = window.setTimeout(() => onChange({ query }), 180);
    return () => window.clearTimeout(timer);
  }, [filters.query, onChange, query]);
  return <div className="catalog-controls" aria-label="Catalog filters">
    <label className="catalog-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the library" aria-label="Search the library" /></label>
    <FilterSelect label="Genre" value={filters.genre} options={options.genre} onChange={(value) => onChange({ genre: value })} />
    <FilterSelect label="Access" value={filters.access} options={options.access} onChange={(value) => onChange({ access: value })} />
    <FilterSelect label="Sort" value={filters.sort} options={options.sort} onChange={(value) => onChange({ sort: value as CatalogFilters['sort'] })} />
  </div>;
}

function FilterSelect({ label, value, options: choices, onChange }: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = Math.max(0, choices.findIndex((option) => option.value === value));
  const selectedOption = choices[selected];

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function move(delta: number) {
    const next = (selected + delta + choices.length) % choices.length;
    onChange(choices[next].value);
  }

  return <div className="filter-select" ref={rootRef}>
    <button id={id} className="filter-select-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); setOpen(true); move(1); }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); setOpen(true); move(-1); }
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    }}><span className="filter-select-copy"><span className="filter-select-label">{label}</span><span className="filter-select-value">{selectedOption.label}</span></span><span className="chevron-icon" aria-hidden="true" /></button>
    {open && <div className="filter-select-menu" role="listbox" aria-labelledby={id}>{choices.map((option, index) => <button key={option.value || 'all'} className="filter-select-option" type="button" role="option" aria-selected={index === selected} onClick={() => { onChange(option.value); setOpen(false); }}>{option.label}</button>)}</div>}
  </div>;
}
