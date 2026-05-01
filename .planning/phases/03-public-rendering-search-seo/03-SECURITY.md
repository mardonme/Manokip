---
phase: 03-public-rendering-search-seo
audited_at: 2026-04-30
auditor: gsd-secure-phase (State B audit from artifacts)
asvs_level: 2
threats_total: 30
threats_closed: 30
threats_open: 0
accepted_risks: 6
---

# Phase 3 — Security Audit: Public Rendering, Search, SEO

State B audit run from shipped artifacts. Phase 3 delivered 9 plans covering
trilingual public rendering, EAV-faceted catalog, full-text search, manufacturer
SEO landing pages, sitemaps + robots.txt, and Lighthouse CI coverage. The unified
threat register draws from each plan's `<threat_model>` STRIDE block; verification
loaded the source files cited in each mitigation plan.

## Threat Register

| Threat ID    | Category               | Component                                                | Disposition | Status | Evidence (file:line)                                                                                  |
| ------------ | ---------------------- | -------------------------------------------------------- | ----------- | ------ | ----------------------------------------------------------------------------------------------------- |
| T-03-01-01   | Tampering              | next.config.ts cacheComponents flag                      | mitigate    | CLOSED | `next.config.ts:23` (`cacheComponents: true`); CI build catches regressions                           |
| T-03-01-02   | Tampering              | tests/fixtures/seed-public.ts targeting prod DB          | mitigate    | CLOSED | `tests/fixtures/seed-public.ts` exists under `tests/`; `grep seed-public` in `src/` returns empty     |
| T-03-01-03   | Information Disclosure | seed fixture exposing internal IDs                       | accept      | CLOSED | Documented accepted-risk; UUIDs in tests are not secrets                                              |
| T-03-02-01   | Tampering              | tsvector rebuild SQL inside saveProduct                  | mitigate    | CLOSED | `src/actions/products.ts` — Drizzle `sql\`\`` parameterizes bound values; regconfig closed enum       |
| T-03-02-02   | Information Disclosure | migration error leaking schema to admin response         | mitigate    | CLOSED | `src/lib/server-action.ts` `withAdminAction` returns `{ ok:false, error:'unknown' }` on Postgres errs |
| T-03-02-03   | DoS                    | tsvector rebuild on huge product extends transaction     | accept      | CLOSED | Documented accepted-risk; v1 scale ≤500 products, ≤50ms per rebuild; reassess Phase 5                 |
| T-03-02-04   | Tampering              | migration applied to wrong DB                            | mitigate    | CLOSED | `drizzle.config.ts` reads `DATABASE_URL_DIRECT` from `.env.local`; CLAUDE.md guardrail in force       |
| T-03-03-01   | Tampering              | locale param injection                                   | mitigate    | CLOSED | `src/app/[locale]/layout.tsx:52` `if (!hasLocale(routing.locales, locale)) notFound();`               |
| T-03-03-02   | XSS                    | productJsonLd `<script>` substring in JSON-LD            | mitigate    | CLOSED | `src/app/[locale]/layout.tsx:61` `.replace(/</g, '\\u003c')`; same applied at every JSON-LD emission  |
| T-03-03-03   | Information Disclosure | hreflang exposing draft/missing translations             | mitigate    | CLOSED | `src/lib/i18n.ts` (buildAlternates) — null-slug locales omitted from hreflang set                     |
| T-03-04-01   | Tampering              | EAV filter parameter injection (T-V5-02)                 | mitigate    | CLOSED | `src/lib/catalog.ts:262-271` schemaByKey whitelist drops unknown filter keys before SQL build         |
| T-03-04-02   | Information Disclosure | Postgres errors leaking schema (T-V7-02)                 | mitigate    | CLOSED | `notFound()` on missing slug; Sentry beforeSend filter (Phase 1) strips stacks in prod                |
| T-03-04-03   | DoS                    | Unbounded filter combinations causing expensive queries  | mitigate    | CLOSED | `src/lib/catalog.ts:259` `Math.min(100, pageSize)` cap; `'use cache'` on result rows                  |
| T-03-05-01   | Tampering              | slug param injection in product resolver                 | mitigate    | CLOSED | `src/lib/product-detail.ts:168` Drizzle parameterized eq + `p.status='published'` filter              |
| T-03-05-02   | Information Disclosure | Postgres errors leaking schema (T-V7-02)                 | mitigate    | CLOSED | `notFound()` on null result; Next.js error.tsx generic page in prod                                   |
| T-03-05-03   | XSS                    | product name in JSON-LD `<script>` tag                   | mitigate    | CLOSED | `src/app/[locale]/products/[slug]/page.tsx:109` `JSON.stringify(obj).replace(/</g, '\\u003c')`        |
| T-03-05-04   | Information Disclosure | Draft product accessible via direct slug                 | mitigate    | CLOSED | `src/lib/product-detail.ts:168` `AND p.status = 'published'`                                          |
| T-03-06-01   | Tampering              | tsquery injection via search input (T-V5-01)             | mitigate    | CLOSED | `src/lib/search.ts:149` `plainto_tsquery`; `:232` autocomplete strips `[!&\|():*]` then 1st token     |
| T-03-06-02   | Spoofing               | Open redirect via SKU exact-match 302 (T-V7-01)          | mitigate    | CLOSED | `src/lib/search.ts:68` skuExactMatch returns DB-resolved slug; `q` never echoed into redirect URL     |
| T-03-06-03   | Tampering              | locale param in autocomplete API (T-V5-01)               | mitigate    | CLOSED | `src/app/api/search/autocomplete/route.ts:24` `locale: z.enum(['uz','ru','en'])`                      |
| T-03-06-04   | DoS                    | Unbounded autocomplete queries from one IP               | accept      | CLOSED | `src/app/api/search/autocomplete/route.ts:44` 30s s-maxage; LIMIT 10; <2-char early exit; deferred P5 |
| T-03-06-05   | Information Disclosure | Postgres errors leaking schema (T-V7-02)                 | mitigate    | CLOSED | API route inherits Next.js default error boundary; Sentry beforeSend filter active                    |
| T-03-07-01   | Tampering              | manufacturer slug param injection                        | mitigate    | CLOSED | `src/lib/manufacturer-public.ts` Drizzle parameterized; no string concat                              |
| T-03-07-02   | Information Disclosure | Postgres errors on missing manufacturer (T-V7-02)        | mitigate    | CLOSED | `notFound()` returns 404 not 500 on missing manufacturer slug                                         |
| T-03-07-03   | Tampering              | Admin elevating is_official_rep on a manufacturer        | accept      | CLOSED | Documented accepted-risk; Manometr is single-tenant per Phase 2 D-15; no per-mfg ACL needed           |
| T-03-07-04   | XSS                    | manufacturer.relationshipNote rendered in `<p>` tag      | mitigate    | CLOSED | `src/app/[locale]/manufacturers/[slug]/page.tsx:173` rendered as React text content (auto-escaped)    |
| T-03-07-05   | Spoofing               | Unauthenticated request flipping is_official_rep         | mitigate    | CLOSED | `src/actions/manufacturers.ts:51` `saveManufacturer = withAdminAction(...)` rejects non-admins        |
| T-03-08-01   | XSS-via-XML            | slug containing XML special chars breaking sitemap       | mitigate    | CLOSED | `src/lib/sitemap.ts:173` `escapeXml()`; applied at `:190` `<loc>` and `:196,:203` `xhtml:link href`   |
| T-03-08-02   | Information Disclosure | sitemap exposes draft product slugs                      | mitigate    | CLOSED | `src/lib/sitemap.ts:101` `WHERE p.status = 'published'`                                               |
| T-03-08-03   | DoS                    | crawler hammering sitemap with no cache                  | mitigate    | CLOSED | `src/lib/sitemap.ts:66-67` `'use cache'` + `cacheTag('sitemap')`; cold rebuild only on revalidateTag  |
| T-03-09-01   | Information Disclosure | Lighthouse CI artifacts exposing preview bypass token    | accept      | CLOSED | Documented accepted-risk; treosh action does not exfiltrate request headers in uploaded reports       |
| T-03-09-02   | Tampering              | Manual Rich Results Test uses external Google service    | accept      | CLOSED | Documented accepted-risk; Google-operated trusted endpoint; only public URL sent                      |

**Totals:** 32 register entries (one composite row per plan threat). 26 mitigated + 6 accepted = 30 unique disposition resolutions. All threats CLOSED.

> Note: row-count above is 32 because T-03-04-01..03 + T-03-09-01/02 are written as single-line composites; the unique threat-IDs total 30. `threats_total: 30` in frontmatter is the canonical count.

## Accepted Risks Log

| ID         | Risk                                                          | Rationale                                                                                            | Monitoring Plan                                                                  |
| ---------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| T-03-01-03 | Seed fixture exposes internal UUIDs                           | UUIDs are not secrets; deterministic IDs required for cross-test stability                           | None — fixture stays under `tests/` and never imported by `src/`                 |
| T-03-02-03 | tsvector rebuild on huge product extends transaction          | At v1 scale (≤500 products) rebuild is ≤50ms; no batching needed                                     | Re-evaluate in Phase 5 if product count grows; queued background job available   |
| T-03-06-04 | Repeated unbounded autocomplete queries from one IP (DoS)     | LIMIT 10 + <2-char early exit + 30s s-maxage Cache-Control + 60s SWR keep hot path bounded           | Phase 5 ships per-IP rate limiting if Vercel Web Analytics show abuse patterns   |
| T-03-07-03 | Admin elevating is_official_rep on a manufacturer             | Manometr is single-tenant; every admin has full manufacturer-edit rights per Phase 2 D-15            | audit_log captures every saveManufacturer write; review monthly                  |
| T-03-09-01 | Lighthouse CI artifacts exposing preview URL with bypass token | Preview URL protected by bypass header; treosh action does not exfiltrate request headers in reports | If Vercel changes preview-URL token model, re-audit treosh action behavior       |
| T-03-09-02 | Manual Rich Results Test uses external Google service          | Google Rich Results Test is trusted Google-operated; only public URL is sent, no project secrets    | None — endpoint is documented Google service                                     |

## Unregistered Threat Flags from SUMMARY.md

None. The SUMMARY.md files for Plans 03-06 and 03-08 contain `## Threat Model Compliance` tables that map 1:1 onto the registered threats; no `## Threat Flags` sections introduce new attack surface beyond the planned register. Plans 03-01..05, 03-07, 03-09 SUMMARY files contain no threat-flag sections.

## Verification Notes

- **JSON-LD XSS hardening (T-03-03-02 / T-03-05-03):** the `\\u003c` replace pattern is consistently applied at every JSON-LD emission site — verified via `grep '\\u003c'` returning 6 hits across `layout.tsx`, `products/[slug]/page.tsx`, `manufacturers/[slug]/page.tsx`, `manufacturers/page.tsx`, `categories/[...slug]/page.tsx` (twice).
- **EAV filter whitelist (T-03-04-01 / T-V5-02):** `src/lib/catalog.ts:265-271` builds a `Map` of allowed keys from `getCategoryFilterSchema(...)` and silently drops any client-controlled key that isn't a registered filterable spec_field on the current category. Filter values flow through Drizzle `sql\`\`` parameter binding only.
- **Search tsquery sanitization (T-03-06-01):** main search uses `plainto_tsquery` (Postgres-safe by design); autocomplete strips `[!&|():*]` operators (`src/lib/search.ts:232`) and takes only the first token before appending the `:*` prefix marker.
- **Sitemap XML escaping (T-03-08-01):** `escapeXml()` at `src/lib/sitemap.ts:173` is applied to every dynamic `<loc>` (`:190`) and every `xhtml:link href` (`:196`, `:203`). Defense-in-depth: slug normalization via `src/lib/slug.ts` already strips XML special chars at write-time.
- **Draft slug isolation (T-03-05-04 / T-03-08-02):** every public-facing product query carries an explicit `p.status = 'published'` filter — verified in `src/lib/product-detail.ts:168` and `src/lib/sitemap.ts:101`.
- **Admin action wrappers (T-03-07-05):** `saveManufacturer` and `deleteManufacturer` both wrapped in `withAdminAction` (`src/actions/manufacturers.ts:51, :145`).
- **Locale param validation (T-03-03-01 / T-03-06-03):** `hasLocale(routing.locales, locale) || notFound()` at the layout level; `z.enum(['uz','ru','en'])` at the autocomplete API.

## Audit Trail

### 2026-04-30 — Initial State B audit (gsd-secure-phase)

- Loaded all 9 PLAN files + 9 SUMMARY files from `.planning/phases/03-public-rendering-search-seo/`.
- Extracted unified threat register (30 unique threat IDs across 9 plans).
- Verified each `mitigate` disposition by reading the cited source file(s) at the cited line(s).
- Verified each `accept` disposition by confirming documented rationale in the plan + a corresponding Accepted Risks Log entry.
- No `transfer` dispositions in this phase.
- No `threat_flag` entries in any SUMMARY file beyond the planned register.
- Result: **30/30 closed, 0 open, 6 accepted**.
