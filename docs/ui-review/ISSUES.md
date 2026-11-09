# Public UI review

Baseline captured by `scripts/ui-review.mjs` at 360, 768, 1280 and 1920px in `docs/ui-review/before/`.

## Cross-page issues

- The public shell uses several competing spacing systems and relies on a long, dense stylesheet with repeated overrides.
- Image components use raw `<img>` elements, do not reserve a consistent poster/backdrop ratio, and can expose broken-image alt text.
- Inputs and buttons are visually inconsistent: some controls have square corners, some use borders, and focus states are not always contained.
- The public header has no durable mobile navigation state in the baseline review and the search control is too narrow at phone widths.
- Public pages do not share a footer component, so navigation and legal links vary by route.
- Motion is present but not consistently gated by reduced-motion preferences across the public shell.
- API failures currently fall back to fixture catalog content with a preview note. Production should show an explicit error state instead.

## Home (`/`)

- The hero title is oversized at tablet and desktop widths, with a large amount of unstructured negative space on the right.
- The hero background treatment is visually flat when the backdrop fails or is slow to load.
- Hero metadata and actions need a clearer hierarchy and larger tap targets on mobile.
- Rows stretch cards to fill the available grid instead of maintaining a fixed poster width.
- Empty rows do not explain whether content is loading, unavailable, or genuinely empty.
- The preview fallback message is visible in the primary content flow when the API is unavailable.

## Authentication (`/login`, `/register`)

- The split layout is too tall and pushes the brand panel below the fold on smaller laptop heights.
- The form has no password visibility toggle, password strength guidance, or terms/privacy acknowledgement on registration.
- Autofill styling can visibly diverge from the dark input surface.
- Validation is presented as one generic alert rather than field-level guidance while preserving a clear submit error.
- The aside needs a more intentional backdrop/gradient treatment and should remain a stable visual anchor on desktop.

## Browse (`/browse`)

- The toolbar is visually dense and native selects do not match the rest of the interface.
- Filter changes are URL-synchronised but there is no visible active-filter summary or clear-all affordance until the empty state.
- The grid uses fluid columns, causing poster widths and card rhythm to change too much across desktop widths.
- Loading, error and empty states are too similar and do not communicate recovery actions consistently.

## Movie detail (`/movie/:slug`)

- Detail poster and backdrop use raw images without resilient loading/error states.
- The title, synopsis and action group need a more deliberate desktop/mobile composition.
- Premium/free access messaging is repeated but not visually grouped with the primary action.
- The current fallback title path can display fixture content while the API is unavailable.

## Watch (`/watch/:slug`)

- The playback surface is structurally sound but the surrounding title/state layout needs stronger responsive spacing.
- Paywall and playback error states should share the same recovery hierarchy and footer.
- Player poster loading and unavailable states need the same media fallback language as cards and detail pages.

## Plans, account and not-found

- Plans and account are visually separate from the shared public header/footer system.
- Account sections are long and benefit from stronger section navigation and consistent fixed-width cards.
- The not-found route should use the same public shell and provide a clear browse/home recovery path.

## Acceptance checks

- No horizontal scrolling at 360, 768, 1280 or 1920px.
- Poster media maintains 2:3 and backdrop media maintains 16:9 aspect ratios.
- Broken images render a designed fallback and never expose raw alt text.
- Public API failures render an explicit error state rather than demo catalog data in production.
- Login, registration, browse filtering and hero interaction are covered by Playwright smoke checks.
