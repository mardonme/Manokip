// Plan 03-01 Task 1.3 — RED stub for SEO-01 + SEO-02 (metadata helpers).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by Plan 03 — generateMetadata() helper that emits
// alternates.canonical (current locale) + alternates.languages map for
// uz/ru/en + x-default. Validated against per-locale slug differences
// (translations.uz.slug vs translations.ru.slug).

import { describe, it } from 'vitest';

describe.skip('metadata helpers — hreflang + canonical (SEO-01, SEO-02; closed by plan 03)', () => {
  it('SEO-01: emits hreflang map for uz/ru/en + x-default', () => {
    // TODO Plan 03: import buildAlternates(...) from src/lib/metadata.ts
    // (or generateMetadata directly), assert returned `alternates.languages`
    // has keys 'uz', 'ru', 'en', 'x-default' — each pointing to the
    // current entity's slug under that locale's prefix.
  });
  it('SEO-02: canonical matches the current locale URL', () => {
    // TODO Plan 03: assert alternates.canonical equals
    // `${host}/${locale}/categories/${slug}` for the current request locale.
  });
  it('SEO-01 fallback: x-default points to uz canonical', () => {
    // TODO Plan 03: x-default per Phase 3 D-05 cascade — uz is the root.
  });
});
