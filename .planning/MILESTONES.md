# Milestones

## v1.0 MVP — Trilingual B2B Catalog (Shipped: 2026-05-06)

**Phases completed:** 5 phases, 34 plans, 71 tasks
**Timeline:** 2026-04-21 → 2026-05-05 (15 days)
**Status:** Locally complete — v1 launch awaits 5 user-driven environmental tasks (DEF-5-06-* in STATE.md Deferred Items)

### Delivered

A modern B2B trilingual (Uzbek Latin / Russian / English) digital platform for industrial pressure-measurement equipment, with a content-team-friendly admin, server-rendered public catalog with faceted filtering and per-locale full-text search, recipe + industry content surfaces, and a single contact-form CTA gated by Turnstile + honeypot + rate limit.

### Key accomplishments

1. **Trilingual schema, locked correctly.** 24-table Drizzle schema on Neon Postgres with sibling `*_translations` tables (no per-locale columns, no JSONB translation bags), typed `product_spec_values` long-table driven by `spec_field` catalog (no opaque "0–600 bar" strings), and per-locale `tsvector` GIN indexes — the three highest-cost schema pitfalls prevented at the foundation.

2. **Admin panel that survives dogfooding.** Single-page product editor with 3-locale tabs swapping only translatable fields, typed spec-value entry driven by category schema, signed Cloudinary direct-upload (DB stores `public_id` only, never round-trips files through Vercel), per-product translation-completeness indicator, machine-translated flags, audit log writer + viewer, magic-link auth with 24h idle / 7d absolute session caps, atomic single-use admin invites.

3. **Public catalog with real SSR + SEO.** Locale-prefixed routing (`/uz/`, `/ru/`, `/en/`) with per-locale canonical + hreflang + `x-default`, fiztech-density grouped spec tables on product detail, faceted PLP filters via nuqs URL state, per-locale `tsvector` search with cascade fallback (current → uz → ru → en), SKU exact-match short-circuit redirect, per-locale XML sitemaps, Product/Organization/Category/BreadcrumbList JSON-LD.

4. **Content moat: recipes + industries.** Tiptap v3 rich-text authoring with Cloudinary image embeds, M:N admin-managed product cross-links, public reading surfaces with locale-fallback banners, "Used in" widget on product detail (capped at 6 cross-references), TechArticle JSON-LD on detail pages, sitemap fan-out per locale.

5. **Contact CTA, hardened.** Single site-wide contact form with honeypot + Cloudflare Turnstile + per-IP HMAC-keyed rate limit (5/hour AND 20/day) + atomic 2-bucket UPSERT, source-page capture, fire-and-forget Resend dispatcher with 2 React Email templates, canonical `/[locale]/contact` page mounted in sitemap.

6. **Cache invalidation that fires.** Typed `revalidateTag` helper set (7 helpers using Next 16 2-arg form), every Server Action mutation calls the right tags, OPS-01 e2e gate authored as Playwright merge-blocker (admin edit → public refresh visible within 5s).

7. **Observability + perf gates.** Sentry across 3 runtimes, Vercel Analytics + Speed Insights, Lighthouse CI workflow with 5-URL fan-out and warn→error severity lift, `ab -n 500 -c 50` load-test workflow, locale-aware glyph-render e2e (Inter Tight subsets cover Uzbek-Latin `oʻ`/`gʻ` U+02BB and Russian Cyrillic).

### Known deferred items at close

7 items carried to v1.1 (see STATE.md `## Deferred Items`):

- **DEF-2-17-01** — OPS-01 deployment-side validation (workflow GREEN on real PR + RED on regression PR + branch-protection rule)
- **DEF-5-06-SEO06-GSC** — Google Search Console registration + sitemap submission + International Targeting screenshot
- **DEF-5-06-SEO06-YANDEX** — Yandex Webmaster registration + TechArticle Rich Results validation
- **DEF-5-06-OPS02** — Content team dogfood (10 trilingual products at ≤10 min each per `05-DOGFOOD-PROTOCOL.md`)
- **DEF-5-06-DEVICEQA** — Real-device Slow-4G QA across uz/ru/en on 3 phones
- **DEF-5-06-CLOUDINARY-MANUAL** — Cloudinary widget full-upload manual smoke on Vercel preview
- **DEF-03** — Manual auth checkpoint (FOUND-05 acceptance) pending bootstrapAdmin seed

All are user-driven environmental work that crosses CLI/UI boundaries the executor cannot drive autonomously. None block the codebase being feature-complete.

---
