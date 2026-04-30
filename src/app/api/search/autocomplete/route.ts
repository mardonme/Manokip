// Plan 03-06 Task 6.2 — Autocomplete API endpoint (SRCH-03).
//
// Public GET handler — NO auth gate. Validates query string with Zod
// (q: string ≤100 chars + locale: enum) and forwards to searchAutocomplete.
//
// Threat model (per plan threat register):
//   T-03-06-01 (T-V5-01) — tsquery injection via `q`: mitigated by the
//     sanitization regex inside searchAutocomplete (strip !&|():* before
//     building the prefix term).
//   T-03-06-03 (T-V5-01) — locale tampering: rejected here at Zod boundary
//     before any DB hit.
//   T-03-06-04 (DoS) — accepted; LIMIT 10 + < 2-char short-circuit + 30s
//     s-maxage Cache-Control header keeps the hot path bounded.
//
// Cache-Control: 30s s-maxage / 60s SWR — the autocomplete suggestion set
// for a given (locale, q) prefix is stable across visitors; Vercel's edge
// cache absorbs repeated keystroke patterns and serves them instantly.

import { z } from 'zod';
import { searchAutocomplete } from '@/lib/search';

const querySchema = z.object({
  q: z.string().max(100),
  locale: z.enum(['uz', 'ru', 'en']),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get('q') ?? '',
    locale: url.searchParams.get('locale') ?? 'uz',
  });
  if (!parsed.success) {
    return Response.json({ suggestions: [] }, { status: 400 });
  }
  const suggestions = await searchAutocomplete(
    parsed.data.q,
    parsed.data.locale,
  );
  return Response.json(
    { suggestions },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    },
  );
}
