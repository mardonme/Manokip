'use client';

// Plan 04-09 Task 9.1 — Locale fallback cascade banner (Phase 4 D-07).
//
// Rendered above the recipe / industry detail page when the resolver returned
// a translation in a different locale than requested (Phase 3 D-05 cascade
// fired). 'use client' is required because the banner carries a dismiss button
// (per Phase 3 D-05 spec); without the dismiss interaction this could be a
// pure RSC.
//
// Copy is composed by the parent RSC via next-intl ICU-formatted message and
// passed in as `message`. The component itself is locale-agnostic; the parent
// resolves the right namespace key (e.g. `public.localeFallback.recipe.uz`)
// based on the resolved fallback locale and entity type.
//
// Props shape mirrors Phase 3 SearchFallbackBanner verbatim plus an optional
// `entityType` discriminator for future styling differentiation.

import { useState } from 'react';

export interface LocaleFallbackBannerProps {
  /** Fully composed message string (parent looks up via next-intl). */
  message: string;
  /** The locale that DID match (uz | ru | en) — for `data-fallback-locale`. */
  fallbackLocale: 'uz' | 'ru' | 'en';
  /** Originally requested locale — for `data-requested-locale`. */
  requestedLocale: 'uz' | 'ru' | 'en';
  /** Entity discriminator (future-proofing for styling variants). */
  entityType: 'recipe' | 'industry';
}

export function LocaleFallbackBanner({
  message,
  fallbackLocale,
  requestedLocale,
  entityType,
}: LocaleFallbackBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="status"
      data-testid="locale-fallback-banner"
      data-fallback-locale={fallbackLocale}
      data-requested-locale={requestedLocale}
      data-entity-type={entityType}
      className="flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 text-amber-700 transition hover:bg-amber-100 hover:text-amber-900"
      >
        ×
      </button>
    </div>
  );
}
