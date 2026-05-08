---
status: partial
phase: 06-design-system-foundation
source: [06-VERIFICATION.md]
started: 2026-05-08T00:00:00Z
updated: 2026-05-08T00:00:00Z
---

## Current Test

[awaiting human testing on Vercel preview]

## Tests

### 1. Visual fidelity of /design route on Vercel preview at 1440px against idea/design-canvas.jsx
expected: Background #f5f3ee, ink #14161b, accent #1240e5, Inter Tight body + JetBrains Mono eyebrows/tick numbers, gauge geometry (11 major + 40 minor ticks + needle at 6.4 + danger arc 8→10), ProductCard placeholder cross-hatched .mk-ph + corner brackets, KeyFactsRibbon 3/4/6 column variants, no console errors
result: [pending]

### 2. Glyph rendering verification on Vercel preview /uz, /ru, /en home pages
expected: Uzbek-Latin oʻ/gʻ (U+02BB) renders correctly without fallback; Cyrillic glyphs render correctly without fallback; no FOIT flash on first paint with Slow 3G throttle in fresh incognito
result: [pending]

### 3. Phase 5 contact form roundtrip regression on Vercel preview
expected: Submission of contact form on /uz/contact (or /ru, /en) succeeds end-to-end after REFACTOR-03 (process.env direct read of NEXT_PUBLIC_TURNSTILE_SITE_KEY); success toast appears, no 4xx/5xx in network panel; Resend admin email dispatched
result: [pending]

### 4. Admin layout scope verification on Vercel preview /uz/admin
expected: Admin layout body does NOT carry className="mk"; admin pages retain shadcn oklch theme (off-white #f5f3ee design canvas tokens do NOT bleed into admin); CLAUDE.md guardrail #5 honored
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
