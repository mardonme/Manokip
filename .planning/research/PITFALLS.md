# Pitfalls Research

**Domain:** Multilingual B2B industrial-catalog platform (Next.js App Router + Postgres + Cloudinary + Vercel)
**Researched:** 2026-04-21
**Confidence:** HIGH (domain-specific issues verified against Next.js docs, PostgreSQL best practices, and CIS B2B SEO patterns)

> **Read this first.** Pitfalls are ordered by *how expensive they are to fix once content exists*. The first five will force a schema migration, a locale rewrite, or a full re-index if discovered after launch. Everything below is recoverable in a sprint.

---

## Critical Pitfalls

### Pitfall 1: "Russian-first" content schema with translations bolted on

**What goes wrong:**
Developer creates `products.name`, `products.description`, `products.specs` as plain columns, then adds `products_translations(product_id, locale, name, description)` later. Worse: schema starts with `name_ru`, `name_en`, `name_uz` columns. When a fourth locale (Kazakh, Turkmen, Uzbek Cyrillic) is requested, every table and every query must be rewritten. "Fallback to Russian" logic leaks into application code because the base row is implicitly Russian.

**Why it happens:**
"We only have three languages, it's fine." `name_ru` is 30 seconds of work; a translation table is 30 minutes. The project has Russian content first and the team treats it as the source of truth.

**How to avoid:**
- **From day one**, store ALL translatable fields in a separate `*_translations` table keyed by `(entity_id, locale)`. No `_ru`/`_en`/`_uz` columns. No "default language" column on the parent entity.
- Treat locale as a tuple dimension, not a column dimension. Adding a locale = inserting rows, not altering tables.
- Locale strings are BCP-47: `ru`, `en`, `uz-Latn`. Do not use bare `uz` — you will regret it when Cyrillic demand appears.
- Fallback logic lives in one SQL view or one query helper, never scattered across components.

**Warning signs:**
- Any column name ending in `_ru`, `_en`, `_uz`
- Any place the code says "if no translation, use Russian"
- `default_locale` or `primary_language` field on a content table
- A PR adding a 4th locale requires more than an `INSERT INTO supported_locales`

**Phase to address:** Phase 1 (database schema / foundations) — **cannot be retrofitted cheaply once 100+ products exist**.

---

### Pitfall 2: Spec values stored as opaque strings, breaking numeric filtering forever

**What goes wrong:**
Spec schema stores everything as `{ "pressure_range": "0-600 bar" }` or `{ "weight": "1.2 kg" }`. Later, a user wants "filter manometers by pressure range overlapping 100–400 bar." You cannot query that. You re-parse every row with regex, guess the unit, and give up. Your faceted filter shows string equality only: users see "0-600 bar" and "0 - 600 bar" as separate filter options.

**Why it happens:**
Admin UI is easier with a single text field. JSONB "just works" with strings. Nobody thinks about range queries until a salesperson asks, "Why can't we filter by pressure range?"

**How to avoid:**
- Spec fields declared at the category-schema level are **typed**: `number`, `range`, `enum`, `boolean`, `text`. Stored as separate JSONB keys: `{ "pressure_min": 0, "pressure_max": 600, "pressure_unit": "bar" }`.
- Units are an explicit first-class field on every numeric spec, not embedded in the value string. Canonical unit stored alongside the display unit; comparisons happen on canonical.
- Enum specs store the enum *key* (`"stainless_steel"`), not the localized label. Labels live in the translation table. A product's material is the same value regardless of the page's language.
- Per-product "extras" can be free-form strings — but they must not be filterable. The hybrid contract: structured = filterable, extras = display-only.

**Warning signs:**
- Any spec value of the form `"N unit"` (`"600 bar"`, `"1.2 kg"`)
- Filter UI shows string buckets that are obviously the same value typed differently
- Admin spec field only has "label" + "value" inputs, no "type" or "unit" selector
- Numeric range filters fall back to "contains this number"

**Phase to address:** Phase 1 (schema) and Phase 2 (admin spec-field editor). Retrofitting after products exist requires a supervised data-cleaning pass — expensive but not impossible.

---

### Pitfall 3: Missing or wrong hreflang — SEO cannibalization across locales

**What goes wrong:**
`/ru/product/p100` and `/en/product/p100` both rank for the same queries in Google. Google picks one arbitrarily. Russian users land on the English page; English users land on Russian. Worse: without hreflang, Google treats the three locales as duplicate content and deprioritizes all three. CIS B2B traffic — the whole point — evaporates.

**Why it happens:**
`next-intl` and similar libraries localize routes but don't emit `<link rel="alternate" hreflang>` automatically across every page. Teams ship SSR, check "the page renders in Russian," and assume SEO is done. The bug is invisible: no error, no warning, just flat organic traffic.

**How to avoid:**
- Every localized page emits `<link rel="alternate" hreflang="ru" href="...">` for each available locale, plus `hreflang="x-default"` pointing to a sensible default (likely Russian for CIS audience).
- `<link rel="canonical">` points to *the same-locale URL*, not a "master" URL. Canonical and hreflang are not the same thing; both are needed.
- URL structure is locale-prefixed from root (`/ru/…`, `/en/…`, `/uz/…`). Do not use cookies or `Accept-Language` to silently swap content at the same URL — Googlebot will see only one locale.
- Sitemap lists every locale of every URL. Submit one sitemap per locale or one combined sitemap with hreflang annotations.
- Test with Google Search Console's "International Targeting" report after launch.

**Warning signs:**
- View-source on any product page: no `hreflang` tags
- Same URL returns different languages based on cookie/header
- `next-sitemap` or similar generator not configured for locales
- Search Console shows "Duplicate without user-selected canonical" warnings

**Phase to address:** Phase 3 (SEO layer) — must be verified before launch. Retrofitting is cheap technically but the lost ranking takes months to recover.

---

### Pitfall 4: Admin UX treated as an afterthought — content team abandons the platform

**What goes wrong:**
Admin panel ships with raw JSON editors for specs, separate save buttons per locale, no bulk edit, no duplicate-product shortcut, no image crop. Content team creates 30 products, hates it, populates the rest in a spreadsheet "we'll import later," then stops. Six months later the site has 30 products and everyone blames the CMS.

**Why it happens:**
Developers build the admin for themselves. It works; they ship. The content team's pain is invisible in the codebase. PROJECT.md even warns: "admin UX matters — content team will live here" — this pitfall exists because that warning is routinely ignored under deadline pressure.

**How to avoid:**
- **Dogfood the admin.** The person building the admin must personally enter at least 10 real products with all three locales before declaring the panel "done." Time each entry. If entering a product takes more than 10 minutes, fix the admin.
- Product-creation flow is a single page, not a wizard across 12 screens. The three locales are tabs or side-by-side columns, not separate screens.
- Spec entry uses the typed fields defined for the category (dropdowns for enums, numeric inputs with unit suggestions for numbers) — never a "paste JSON" textbox.
- Include from day one: duplicate-product, bulk-category-reassign, "mark untranslated" filter, draft/published state.
- Content team tests the admin on a staging environment before go-live, and their feedback blocks launch.

**Warning signs:**
- Admin has a `<textarea>` for "specs JSON"
- Creating a product requires saving, navigating, and re-opening
- No "duplicate this product" button
- Bulk operations missing (can't reassign 20 products to a new category)
- Admin team starts CC'ing the developer on every data entry question

**Phase to address:** Phase 2 (admin). Allocate at least a third of Phase 2 to polishing admin UX, not adding features. Budget the dogfood pass as a deliverable.

---

### Pitfall 5: Next.js App Router caching — stale product pages after admin edits

**What goes wrong:**
Admin edits a product at 10:00. User visits the page at 10:05 and sees old content. Admin refreshes, content is still old. Admin panics. The cause is Next.js App Router's aggressive data caching + full-route caching: `fetch` is cached by default, and the rendered RSC payload is cached at the edge. Nothing the admin does invalidates it unless the code explicitly calls `revalidatePath` / `revalidateTag` / uses `cache: 'no-store'`.

**Why it happens:**
Next.js 14/15 App Router silently caches everything by default. The failure mode is only visible in production (dev mode bypasses most caches). Developers test locally, see fresh data, ship. Two weeks later the content team reports "edits don't appear."

**How to avoid:**
- **Tag every fetched resource** with stable cache tags: `product-{id}`, `category-{slug}`, `products-list-{categoryId}-{locale}`.
- Every admin mutation ends with the corresponding `revalidateTag()` call. Mutations without invalidation are bugs.
- For pages that must always be fresh (admin panel views), opt out explicitly: `export const dynamic = 'force-dynamic'` or `fetch(..., { cache: 'no-store' })`.
- Public product/category pages use ISR with short `revalidate` windows (60s) as a safety net — even if a tag miss happens, staleness is bounded.
- Test the edit-and-verify loop end-to-end on Vercel preview before launch. Do not rely on `next dev`.

**Warning signs:**
- "It works locally but not on Vercel"
- Admin makes an edit, refreshes the public page, sees old data
- No `revalidateTag` / `revalidatePath` calls in server actions
- Product pages use plain `fetch(...)` with no `next: { tags: [...] }`

**Phase to address:** Phase 2 (admin mutations) and Phase 3 (public page rendering). Verify with an end-to-end test script that edits then reads.

---

### Pitfall 6: Hardcoded admin credentials / weak invite flow

**What goes wrong:**
Ships with `ADMIN_PASSWORD` in `.env.local` that gets committed, or a single shared login that rotates quarterly (i.e., never), or an invite flow that sends a link that never expires, or invite links that don't require email verification — so anyone who guesses the URL becomes an admin.

**Why it happens:**
"It's just 2–5 trusted people." Auth is treated as plumbing. Developer copy-pastes an invite flow from a tutorial and ships.

**How to avoid:**
- Use a proven auth library (Auth.js / NextAuth, Lucia, or Clerk) — do not hand-roll.
- Invite tokens are single-use, expire in 24–72 hours, and require the invited email to prove ownership (click-through-verified).
- Sessions expire (idle timeout + absolute max). Default: 12-hour idle, 7-day absolute. Re-auth for sensitive operations (changing another admin's role, deleting a manufacturer).
- No hardcoded credentials. A pre-commit hook greps for obvious secrets patterns.
- `.env*` is in `.gitignore` before the first commit. Use Vercel environment variables for production secrets.
- Audit log every admin login, every invite, every admin action (who / when / what changed). This is cheap with Postgres and invaluable when "who deleted that spec?" is asked.

**Warning signs:**
- Any `password` or `secret` string literal in source
- `.env` tracked in git history (check `git log --all -- '**/.env*'`)
- Invite link reuses, or no "link expired" error state
- No session timeout configuration

**Phase to address:** Phase 2 (admin auth). Audit logging added in Phase 2 — retrofitting after incidents is too late.

---

### Pitfall 7: Serverless + Postgres connection meltdown

**What goes wrong:**
Vercel spins up 50 serverless function instances under load. Each opens a direct Postgres connection. Postgres' `max_connections` (default ~100 on Neon/Supabase free tier) is saturated in seconds. New requests hang or error with "too many connections." Site looks down.

**Why it happens:**
A raw `new Pool()` in a server action works locally (one process, one pool). In serverless it creates one pool per cold-started instance, with no coordination.

**How to avoid:**
- **Use a connection pooler.** Neon has built-in PgBouncer (use the `-pooler` connection string). Supabase provides Supavisor. Do not connect directly to Postgres from serverless code unless reading from a singleton pool in a long-running server.
- Pooled connections use transaction mode; prepared statements and session-scoped features (e.g., `SET LOCAL`) behave differently. Validate your ORM (Prisma, Drizzle) is configured for transaction-mode pooling.
- Use pooled URL for the Next.js app; direct URL only for migrations (where you need session features).
- Co-locate Vercel region and Postgres region (e.g., Vercel `fra1` + Neon `eu-central-1`). Cross-region adds 50–200ms per query.

**Warning signs:**
- Connection string hostname doesn't include `-pooler` or equivalent
- Errors: "remaining connection slots are reserved," "sorry, too many clients already"
- Latency spikes under modest concurrency (> 20 req/s)
- Dashboard shows connection count near max

**Phase to address:** Phase 1 (database setup). Verify with a simple load test (`ab -n 500 -c 50`) against a preview deployment before launch.

---

## High-Severity Pitfalls

### Pitfall 8: Machine-translated B2B spec copy destroys trust

**What goes wrong:**
Team uses DeepL or Google Translate to auto-fill the missing locales. "Manometer with stainless steel diaphragm, pressure range 0–600 bar" becomes, in Russian, nonsense to a pressure-instrumentation engineer: wrong unit translation, wrong industry term for "diaphragm" (`диафрагма` vs. correct `мембрана`), marketing fluff mistranslated as technical spec. Engineers see one wrong term and distrust the whole site.

**Why it happens:**
Translation is expensive and slow. Machine translation looks fluent enough to developers who don't speak the language. Nobody native to the domain reviews the output.

**How to avoid:**
- **B2B technical copy is manually translated by domain-fluent speakers.** PROJECT.md already commits to this — the pitfall is letting "just use DeepL for now" slip in under deadline.
- If machine translation is used as a draft, it is marked `machine_translated: true` in the DB and hidden from the public site until a human reviews.
- Build a "missing or machine-translated content" admin view so translators have a work queue.
- Maintain a glossary of industry terms (Russian `манометр`, `мембрана`, `сильфон`, etc.) so translations stay consistent across products.
- **Never** auto-translate unit symbols, part numbers, or enum keys. Leave `"бар"` as `"bar"` or translate consistently — decide once.

**Warning signs:**
- Reviewer sees obviously wrong industry terminology
- Bug reports like "the Russian page calls this the wrong thing"
- Translation tickets are closed in minutes (suggests no human review)
- No glossary document exists

**Phase to address:** Phase 2 (content workflow). Introduce the `machine_translated` flag even if not used in v1 — cheap insurance.

---

### Pitfall 9: Cyrillic and Uzbek-Latin font / rendering failures

**What goes wrong:**
Site uses a trendy font from Google Fonts that only supports Latin Extended. Russian (`ПРОМЫШЛЕННЫЙ`) renders in a fallback system font — different weight, different metrics, broken layout. Uzbek Latin has diacritics `oʻ`, `gʻ` — many fonts render these as tofu boxes or substitute a visually wrong glyph. Product names look unprofessional, spec tables misalign.

**Why it happens:**
Designer picks a font for the Latin mockup. Cyrillic and Uzbek are tested on a different machine where a system font silently fills in.

**How to avoid:**
- Every font in the stack is verified to include: **Basic Latin, Latin Extended-A (for `oʻ`, `gʻ` and ʻ U+02BB MODIFIER LETTER TURNED COMMA), and Cyrillic**. Test before committing. Inter, Noto Sans, IBM Plex Sans, Golos Text — all fine. Most display fonts — not fine.
- Uzbek Latin uses `ʻ` (U+02BB MODIFIER LETTER TURNED COMMA), not apostrophe `'` (U+0027). Both look similar but sort, search, and render differently. Pick one (U+02BB is technically correct) and enforce in a validator on content entry.
- Load fonts via `next/font` — automatic subsetting, `font-display: swap`, no FOUC. Specify the correct subsets: `['latin', 'latin-ext', 'cyrillic']`.
- Preview product pages in all three locales on a real device before sign-off, not just in dev tools.

**Warning signs:**
- Russian headings look noticeably different weight/style from English
- `oʻ` or `gʻ` renders with a thin vertical bar or tofu
- Google Search Console or Lighthouse flags font-related CLS
- "The Russian site looks different from the English site" feedback

**Phase to address:** Phase 3 (design system / typography). Catch during design QA, not post-launch.

---

### Pitfall 10: JSONB spec filtering performance cliff

**What goes wrong:**
Filtering `WHERE specs @> '{"material": "stainless_steel"}'` is fast at 100 products. At 1,000+ with four filter conditions combined, it's a full-table scan on every query. Category pages take 2–5 seconds. Mobile users bounce.

**Why it happens:**
JSONB looks magical. Developers assume Postgres "handles it." GIN indexes exist but must be created explicitly and tuned per workload.

**How to avoid:**
- Create a **GIN index** on the `specs` JSONB column: `CREATE INDEX ON products USING GIN (specs jsonb_path_ops)`. Use `jsonb_path_ops` for `@>` containment queries — smaller and faster than default ops.
- For range queries on numeric specs (pressure, temperature), store as `numeric` generated columns or in a normalized `product_spec_values` table indexed by `(spec_field_id, value_numeric)`. JSONB range scans are not indexed efficiently.
- Category browse pages apply category scope first (indexed `category_id`) so the JSONB filter runs on a narrower set.
- Measure with `EXPLAIN ANALYZE` on real-sized data. "It feels fast" at 50 products tells you nothing about 500.

**Warning signs:**
- Category page latency grows noticeably between 100 and 500 products
- `EXPLAIN` shows `Seq Scan on products` when filters are applied
- No GIN index on `specs`
- Filter count numbers ("142 matching products") take longer than the results themselves

**Phase to address:** Phase 1 (schema) for the index; Phase 3 (listing pages) for query shape. Load-test with synthetic data before launch.

---

### Pitfall 11: Cloudinary bandwidth surprise and oversized images on mobile

**What goes wrong:**
Admin uploads a 4000×3000 product photo. Site serves the raw URL to everyone. A mobile user on Uzbek 4G downloads 2MB for a thumbnail. LCP is 5 seconds. Cloudinary monthly bandwidth quota burns out mid-month on a tier the team "didn't realize was metered."

**Why it happens:**
Cloudinary's magic (`q_auto`, `f_auto`, responsive sizes) only happens if you use the transformation URL — not the "default" upload URL that developers copy first.

**How to avoid:**
- Every image URL in the app goes through a helper that adds `f_auto,q_auto,w_<pixelDensity>` transformations. Raw Cloudinary URLs never appear in JSX.
- Use `next/image` with a Cloudinary loader, or a `<CldImage>` component. Provide `sizes` attribute so the browser picks the right variant.
- Cap the maximum served dimension (e.g., 1600px wide). Nobody needs 4000px on a product page.
- Set up Cloudinary usage alerts at 50%, 75%, 90% of quota. Monitor monthly.
- PDFs: serve via Cloudinary with `fl_attachment` and `q_auto`. Large datasheets can be 20MB+ — Cloudinary's PDF compression is meaningful.

**Warning signs:**
- Raw `res.cloudinary.com/.../upload/v123/image.jpg` URLs in page source (no transformation segment)
- Mobile Lighthouse score < 70 with "Properly size images" flagged
- Cloudinary monthly dashboard spiking unexpectedly
- PDFs > 10MB served without transformation

**Phase to address:** Phase 2 (media upload) for the helper; Phase 3 (product pages) for `<CldImage>` adoption.

---

### Pitfall 12: Locale fallback leaks — users see English on a Russian page

**What goes wrong:**
Product exists with Russian content only. User on `/en/product/p100` sees half-English UI with Russian product data, or worse, an empty page because the query returned `null`. Reverse happens too: English UI wraps unlocalized Russian content. Looks unprofessional, kills trust.

**Why it happens:**
Fallback logic is either missing or done wrong: "if no translation, show English" applies to *every* field independently, producing a Frankenstein page. No visibility at the admin level into what's untranslated.

**How to avoid:**
- **One clear fallback policy:** if a product lacks a translation for the requested locale, either (a) show the page in the fallback locale with a banner ("This product is available in Russian only"), or (b) exclude it from the list/search in that locale entirely. Pick one per content type. Do not mix field-level fallbacks — the result is unreadable.
- Admin view shows translation completeness per product: "2/3 locales, missing UZ." Listing page has a filter "show only fully-translated."
- Search results respect the current locale — do not return products with no translation for that locale unless explicitly requested.
- Structured data (`JSON-LD`) on a fallback-rendered page declares the actual content language (`inLanguage: "ru"`), so Google doesn't index Russian content as English.

**Warning signs:**
- Product page shows a mix of English labels and Russian values (or vice versa)
- Empty/broken pages for products missing a translation
- No "translation progress" view in the admin
- Google Search Console: "Indexed, not submitted in sitemap" or wrong-language snippets

**Phase to address:** Phase 1 (fallback policy decision) and Phase 2 (admin visibility) and Phase 3 (public rendering).

---

### Pitfall 13: Thin SSR pages with no structured data — invisible to B2B buyers

**What goes wrong:**
Product pages SSR correctly (Googlebot sees real HTML), but lack `Product` JSON-LD, `BreadcrumbList`, `Organization`. Rich snippets never appear. Competitors with structured data rank above you even when your content is better. B2B buyers searching "манометр 0-600 бар нержавеющая сталь" see competitors' rich results, not yours.

**Why it happens:**
"SSR = SEO done." Structured data is an extra step and invisible in the browser. Nobody tests with Google's Rich Results Test.

**How to avoid:**
- Every product page emits `Product` JSON-LD with at minimum: `name`, `description`, `brand`, `sku`, `image`, `category`. Because this is not e-commerce, omit `offers` — it would be misleading. Use `Product` + contact-information link.
- Every category page emits `BreadcrumbList` and `CollectionPage`.
- Site-wide: `Organization` schema in root layout with `name`, `logo`, `sameAs` (social), `contactPoint`.
- Recipes / use-case articles emit `Article` or `TechArticle` JSON-LD.
- Validate every page type with [Rich Results Test](https://search.google.com/test/rich-results) before launch.

**Warning signs:**
- View source: no `<script type="application/ld+json">` on product pages
- Search Console: "Unparsable structured data" or no enhancement reports
- Competitors show rich snippets, you don't, for comparable queries

**Phase to address:** Phase 3 (SEO layer). Add JSON-LD as part of the component that renders product pages, not as an afterthought.

---

### Pitfall 14: Spec-schema evolution orphans existing products

**What goes wrong:**
Six months in, admin realizes "Operating Temperature Range" should be two fields (min + max) instead of one string. They delete the old field, add two new ones. Every existing product in that category loses the temperature data. Or: admin renames a category spec field, and the JSONB keys on products still reference the old name — filters silently drop those products.

**Why it happens:**
Spec-schema editing UI doesn't understand migrations. Fields are mutated in place. No concept of "this field used to be called X."

**How to avoid:**
- Spec fields have a stable **internal key** (`op_temp_min`) and a **display label** (translated per locale). Editing the label is free. Editing the key is a rename migration with an explicit "update all products from old key to new key" action.
- Deletion of a field that has values on products shows a confirmation with the affected product count. Offer "archive instead of delete" to preserve data.
- Changing a field's type (string → numeric) runs a preview: "45 products have values that can't convert — review before committing."
- Schema-change operations are logged to the audit trail with before/after.

**Warning signs:**
- Admin UI deletes a field with no warning about affected products
- Categories with "ghost" spec keys in their product JSONB (present in data, not in schema)
- "Why did the temperature filter stop working?" support tickets

**Phase to address:** Phase 2 (spec-schema editor). Do not ship editable schema without migration awareness.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Start with one locale, plan to add others later | Ship content faster | Migration from mono-locale schema to poly-locale is a week of work + every query rewritten | **Never** — PROJECT.md already commits to tri-lingual day one |
| Store specs as freeform JSONB strings | Admin UI is trivial | Breaks filtering, range queries, units. Data cleanup is manual | **Only** for per-product "extras" explicitly marked display-only |
| Use `fetch` without cache tags in App Router | No caching concerns to think about | Admin edits don't appear on public pages in prod | Only on pages marked `force-dynamic` |
| Direct Postgres connection from Vercel | Works in dev | Connection-pool meltdown at modest traffic | Migrations only; never runtime |
| Raw Cloudinary URLs in components | Fast to copy-paste | Bandwidth blow-out, slow mobile | Never in committed code; only while prototyping |
| Shared admin login for the team | Skip invite flow | No audit trail, no accountability, firing an admin = rotating password | Never — v1 has 2–5 invited users, do it right |
| `_ru`/`_en`/`_uz` columns | Quick to type | Adding a 4th locale = schema migration everywhere | Never |
| Machine-translate then publish | Instant trilingual | Engineer trust destroyed by wrong terminology | Only with a `machine_translated` flag + hidden from public until reviewed |
| Hand-rolled auth | "Auth is simple" | It isn't. Security bugs found by attackers, not you | Never |
| Skip JSON-LD "we'll add it later" | Ship faster | Months of SEO ranking lost to rivals with rich snippets | Only for non-indexed admin pages |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Neon / Supabase Postgres** | Using direct connection string in Vercel env | Use pooled connection string (`-pooler` host); reserve direct string for migrations |
| **Vercel region** | Leaving region as default US (`iad1`) while DB is in EU | Set Vercel functions to `fra1` (or closest EU region) to co-locate with Neon `eu-central-1` |
| **Cloudinary** | Copying the "original" URL from the dashboard | Use `f_auto,q_auto,w_<n>` transformations via `<CldImage>` or a helper |
| **Cloudinary signed uploads** | Long-running admin uploads expire mid-stream | Generate signed upload credentials on the server per upload, with sufficient TTL (15+ min), and retry on 401 |
| **next/image with Cloudinary** | Using default loader (routes through Vercel image optimization — double-transforms and burns Vercel bandwidth) | Use a Cloudinary-specific loader or `<CldImage>`; disable Vercel image optimization for Cloudinary URLs |
| **Auth.js / NextAuth invite flow** | Email provider emits magic link with no rate limit | Rate-limit invite sends; token single-use; require matching email on redemption |
| **Email (contact form + invites)** | SMTP credentials in code; no SPF/DKIM | Use Resend or Postmark (DKIM/SPF guided); API key in Vercel env only |
| **next-intl / next-i18next** | Routing set up but hreflang never emitted | Emit `<link rel="alternate" hreflang>` for every locale in every page head |
| **PostgreSQL FTS** | `to_tsvector('english', ...)` used for Russian content | Use `'russian'` config for Russian, `'english'` for English, `'simple'` (or custom) for Uzbek — per-locale tsvector column |
| **Drizzle / Prisma migrations** | Running against pooled connection (transaction-mode) | Migrations use direct connection string; runtime uses pooler |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Missing GIN index on `specs` JSONB | Listing/filter pages slow, scales linearly with product count | `CREATE INDEX ... USING GIN (specs jsonb_path_ops)` | ~500 products with multi-facet filters |
| N+1 queries for product translations | Listing page makes 1 + N queries to fetch translations per product | Join translations in the listing query, or use a view that returns pre-resolved locale | Immediately visible at 50+ products per page |
| Serverless cold-start × connection open | First request per instance is 500ms+ | Connection pooler + keep-alive; avoid per-request `new Pool()` | Low traffic hides this; spiky traffic amplifies |
| Full-page ISR with very long revalidate | Admin edits take hours to appear | `revalidateTag` on mutation + short (60s) ISR fallback | As soon as admins edit, always |
| Serving uncompressed PDFs via Cloudinary | 15MB datasheet downloads | `f_auto,q_auto` + server pre-check on upload size | Immediately, on any mobile user |
| Non-indexed `category_id` + `locale` on translations | Category browse query scans all products | Composite index `(category_id)` on products, `(entity_type, entity_id, locale)` on translations | ~200 products |
| Running full-text search across all three locale tsvectors | Every query hits three indexes unnecessarily | Separate `tsvector_ru`, `tsvector_en`, `tsvector_uz` columns; query only the current locale's column | ~1000 products |
| Rendering spec tables with hundreds of rows on mobile | LCP > 4s, poor mobile Lighthouse | Collapse spec sections; lazy-render below-the-fold; prefer CSS tables not React-rendered ones | Any spec-heavy product page on 4G |
| Unbounded Cloudinary bandwidth | Monthly overage bill | Quota alerts; strict transformation helper; cap max image dimension | Usually end-of-month after launch |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Admin credentials in `.env` committed to git | Full platform compromise, embarrassment | `.gitignore` `.env*` before first commit; rotate if ever committed; use Vercel env for prod |
| Invite link without expiry | Old invite forwarded to wrong person, unauthorized admin | Single-use tokens, 24–72h TTL, email-ownership verification |
| No session expiry on admin | Stolen laptop = permanent admin access | Idle timeout (12h) + absolute timeout (7d); re-auth for destructive ops |
| Server actions without auth check | Unauthenticated mutations via direct POST | Wrap every server action in a `requireAdmin()` helper; never rely on "the UI only shows the button to admins" |
| Cloudinary upload signed on client with master API secret | Secret leaked in bundle = full Cloudinary account compromise | Generate signatures server-side per upload; use scoped upload presets |
| No CSRF on form submissions | Hostile site triggers admin actions via logged-in admin's browser | Use SameSite=Lax cookies + origin check; Auth.js handles this by default |
| Contact form: no rate limit, no honeypot | Spam DB + wasted admin time | Honeypot field + Cloudflare Turnstile or hCaptcha + per-IP rate limit |
| File upload accepts any MIME | Upload of disguised executables, stored XSS via SVG | Whitelist MIME types server-side; for images, require Cloudinary round-trip; for PDFs, scan size/headers |
| SQL injection via raw `query()` with user input | Data exfiltration | Always use parameterized queries (Drizzle / Prisma enforce this); never string-concatenate SQL |
| Exposing Postgres connection string in client env | Direct DB access from attackers | Only `NEXT_PUBLIC_*` vars reach the client; DATABASE_URL stays server-side |
| No audit log | "Who deleted that product?" unanswerable | `audit_log(actor_id, action, entity, before_json, after_json, at)` on every mutation |
| Assuming `.uz` domain is automatically geo-targeted | Russia/Kazakhstan traffic deprioritized | Use Search Console's International Targeting to confirm geo; hreflang handles language |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Language switcher buried in footer | Users don't find it, bounce to a competitor | Top-right of nav, with current locale visible; remembered via cookie for return visits |
| Language switch drops user to homepage | User loses context, leaves | Switch to the same URL in the target locale; if translation missing, keep on page with "available in X only" banner |
| Product page shows only structured specs, no narrative | Feels like a datasheet — users want context | Combine: narrative description + structured specs + "used in" case studies |
| Spec filter UI shows every possible value as a checkbox | 50-item filter list overwhelms users | Group by unit/range; collapse less-used filters; "show more" expansion |
| No "compare products" affordance | Users open 5 tabs, lose track | Defer compare to v2 per PROJECT.md, but ensure shareable product URLs so users can paste into email easily |
| PDF downloads lack visible size / preview | User clicks, 20MB download starts on mobile, they bounce | Show `(PDF, 2.4 MB)` next to link; generate a Cloudinary thumbnail preview of page 1 |
| Contact form asks 12 fields | Drop-off > 60%, lead quality no better | 4 fields: name, company, email, message. Everything else is a follow-up conversation |
| No indication of which locale a page is actually showing | User in Russian UI sees product with English content, confused | Banner: "This product is currently available in English. [Request Russian translation]" |
| Mobile spec tables horizontal-scroll | User can't see label + value together | Stack label/value vertically on mobile; keep table layout on desktop |
| Assuming Russian is the default for everyone in Uzbekistan | Tashkent tech workforce skews Uzbek-preferred | Default locale by geo/`Accept-Language`, not hardcoded to Russian. Uzbek Latin is a first-class default for `.uz` visitors. |
| No obvious "contact us" CTA on product pages | Core conversion path buried | Sticky contact CTA on product pages; pre-fill "interested in [Product Name]" in the form |
| Breadcrumbs only on some pages | Inconsistent navigation feels amateur | Breadcrumbs on every category, product, and recipe page; also emitted as `BreadcrumbList` JSON-LD |
| Slow-connection users see broken pages | Uzbek industrial sites often on sub-1Mbps connections | Budget: LCP < 3s on simulated Slow 4G; test with DevTools throttling; avoid hero videos/large images above the fold |

---

## "Looks Done But Isn't" Checklist

Things that appear complete in demo but are missing critical pieces.

- [ ] **Multilingual content:** Homepage/product pages render in all three locales — verify `hreflang` tags are emitted, sitemap includes all locales, untranslated-content fallback is intentional (not accidental).
- [ ] **Spec schema editor:** Admin can create/edit spec fields — verify editing a field key migrates existing product JSONB keys, deletion warns about affected products, and type changes preview conversions.
- [ ] **Product detail page:** Renders with data — verify `<link rel="canonical">`, `<link rel="alternate" hreflang>` for every locale, `Product` JSON-LD validated in Rich Results Test, Open Graph tags per-locale.
- [ ] **Filters:** Faceted filtering works — verify numeric ranges actually range-query (not string-contains), unit conversions consistent, multi-select combines correctly, category scope applied first in the query plan.
- [ ] **Admin auth:** Login works — verify invite flow expires tokens, session has idle + absolute timeout, every server action has `requireAdmin()`, audit log entries on every mutation.
- [ ] **Cache invalidation:** Edit propagates — verify on Vercel preview (not dev), with ISR enabled, edit-then-refresh shows new content within 60s, `revalidateTag` called from every mutation.
- [ ] **Search:** Finds products — verify locale-scoped (Russian query hits Russian tsvector), handles Uzbek-Latin `oʻ`/`gʻ` correctly, returns zero results gracefully, not blowing up on stop words.
- [ ] **Images:** Render on product pages — verify served via Cloudinary transformation URL (not raw), `<CldImage>` with `sizes` attribute, LCP image preloaded, max dimension capped.
- [ ] **PDFs:** Downloadable — verify Cloudinary-optimized (`fl_attachment`, `q_auto`), file size displayed next to link, broken-link check script runs on CI.
- [ ] **Contact form:** Submits — verify honeypot + CAPTCHA, rate-limited per IP, email delivered via SPF/DKIM-configured sender, DB row inserted with locale captured.
- [ ] **Fonts:** Render everything — verify Cyrillic and Uzbek-Latin `oʻ`/`gʻ` display correctly on a real device, no font-swap CLS, subsets loaded correctly via `next/font`.
- [ ] **SEO:** Pages indexable — verify sitemap.xml exists and lists all locales, robots.txt allows crawling of content, Search Console registered and hreflang report clean, structured data validator passes.
- [ ] **Connection pool:** Works under load — verify connection string includes `-pooler`, a simple `ab -n 500 -c 50` test against preview completes without errors, dashboard connection count stays bounded.
- [ ] **Region alignment:** Fast queries — verify Vercel function region matches Postgres region, p95 DB query latency < 50ms.
- [ ] **Mobile:** Actually usable — verify tested on real device at throttled 4G, LCP < 3s, spec tables readable, contact form submits.
- [ ] **Audit log:** Captures everything — verify every admin action produces a log entry with actor/timestamp/entity/before-after diff.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Schema built without translation table | HIGH | Create translations tables; backfill existing rows as "ru" (or whatever default); rewrite every query; dual-write during migration; cut over; delete old columns. Plan: 1–2 weeks. |
| Spec values stored as strings with units | HIGH | Introduce typed spec field definitions; write a migration tool that parses each existing value (regex + human-review queue); store normalized into new columns; keep string as display-only fallback. Plan: 1 week + translator/content time. |
| Missing hreflang discovered post-launch | MEDIUM | Add hreflang tags in layout immediately; update sitemap; submit to Search Console; wait 4–8 weeks for re-indexing. Ranking recovery depends on competitors. |
| Admin team refuses to use the CMS | MEDIUM | Conduct user research with them; list top 10 pain points; fix by severity; re-onboard. Two weeks of focused UX work. |
| Next.js caching staleness in prod | LOW | Add `revalidateTag` calls to every mutation; tag every fetch; deploy. 1–2 days. |
| Hardcoded credentials leaked | HIGH | Rotate immediately; audit access logs; force-reset all admin passwords; rewrite git history to remove (BFG repo-cleaner) and force-push (coordinate with team); notify anyone with local clones. |
| Connection pool meltdown under traffic | LOW | Switch to pooled connection string; deploy. < 1 hour. |
| Cloudinary bandwidth overage | LOW | Enable transformation helper retroactively; add alerts; next month's bill is safe. 1 day. |
| Cyrillic/Uzbek-Latin font rendering broken | LOW | Swap font to one with proper subset support; deploy. 1 day. |
| Machine-translated content published and discovered | MEDIUM | Add `machine_translated` flag retroactively to all content flagged by translators; hide from public until reviewed; translator queue. Ongoing until cleaned. |
| Spec field deleted, data orphaned | MEDIUM-HIGH | If audit log captured before-state: restore from log. Otherwise: restore from DB backup, manual re-entry. Backups matter. |
| Admin login shared and someone leaves | MEDIUM | Rotate everyone's credentials; review audit log for suspicious activity; add per-user auth properly. 1 week. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls. Phase names are indicative; roadmap author will finalize.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Russian-first schema (#1) | Phase 1: Foundations / DB schema | Schema review: no `_ru`/`_en`/`_uz` columns, translations table exists, no `default_locale` on entity tables |
| Spec values as strings (#2) | Phase 1 (schema) + Phase 2 (admin spec editor) | Category spec fields have explicit `type` and `unit`; JSONB keys are typed; numeric filters range-query |
| Missing hreflang (#3) | Phase 3: SEO layer | Every rendered page has `hreflang` for every locale; Google Rich Results Test passes; Search Console hreflang report clean |
| Admin UX afterthought (#4) | Phase 2: Admin | Dogfood exercise: developer enters 10 products across all locales in ≤ 10 min each; content team signs off before launch |
| Caching staleness (#5) | Phase 2 (mutations) + Phase 3 (rendering) | E2E test: edit via admin, verify public page updates within 60s on Vercel preview |
| Hardcoded credentials / weak auth (#6) | Phase 2: Auth | Auth.js/Lucia configured; invite tokens expire; sessions timeout; no secrets in repo (pre-commit hook + history scan) |
| Connection pool meltdown (#7) | Phase 1: DB setup | Connection string uses pooler; load test `ab -n 500 -c 50` succeeds without connection errors |
| Machine translation abuse (#8) | Phase 2: Content workflow | `machine_translated` flag in schema; translation queue view exists in admin |
| Font / Cyrillic rendering (#9) | Phase 3: Design / typography | Real-device QA in all three locales; `oʻ`/`gʻ` specifically verified |
| JSONB filter performance (#10) | Phase 1 (index) + Phase 3 (listing queries) | GIN index in migration; `EXPLAIN ANALYZE` on category+filter query shows index use; load-tested with 500 synthetic products |
| Cloudinary bandwidth (#11) | Phase 2 (upload) + Phase 3 (rendering) | No raw Cloudinary URLs in source; Lighthouse mobile score ≥ 85; quota alerts configured |
| Locale fallback leaks (#12) | Phase 1 (policy) + Phase 2 (admin visibility) + Phase 3 (rendering) | One documented fallback policy; admin shows translation completeness; public pages never mix locales mid-content |
| No structured data (#13) | Phase 3: SEO layer | Product, Organization, BreadcrumbList, CollectionPage, TechArticle JSON-LD on every relevant page; Rich Results Test passes |
| Spec-schema evolution (#14) | Phase 2: Admin spec editor | Field rename is a migration, not an in-place edit; field deletion warns with impact count; audit log captures schema changes |

---

## CIS / Uzbekistan-Specific Notes

Pitfalls that don't get surfaced in generic Next.js guidance.

- **`.uz` domain geo-signal.** A `.uz` ccTLD implicitly geo-targets Uzbekistan. This is usually desired — but if the audience is CIS-wide (Kazakhstan, Russia, Kyrgyzstan), reinforce international targeting explicitly in Search Console and strong hreflang. Do not assume a `.uz` site ranks organically in Russian search.
- **Yandex matters.** Russian-speaking industrial buyers in Uzbekistan and broader CIS use Yandex in addition to Google. Yandex respects hreflang and structured data similarly, but has its own Webmaster Tools; register there too. Its crawler honors `robots.txt` but has different rendering quirks than Googlebot — test with Yandex's page audit tool.
- **Russian is not everyone's first language in Uzbekistan.** Engineers in Tashkent often prefer Russian; engineers in regions may prefer Uzbek. Auto-detecting by `Accept-Language` + a visible switcher is safer than forcing Russian. Do not treat "CIS" as "Russian-speaking" monolithically.
- **Uzbek Latin transliteration variance.** Users may search `o'zbek` (ASCII apostrophe), `oʻzbek` (U+02BB), or `uzbek` (no diacritic). FTS config and URL slug handling should normalize all three. Tested search inputs include all variants.
- **Slow-connection reality.** Regional industrial sites and field offices have unreliable connections. Performance budget is not "nice to have" — it's the difference between engagement and a closed tab. Target LCP < 3s on simulated Slow 4G.
- **Payment-free informational site helps SEO trust.** The platform does not process transactions, which simplifies security and compliance (no PCI, no GDPR e-commerce provisions). But contact-form lead data is still personal data — keep a simple privacy policy and don't retain indefinitely.
- **PDF datasheets are trust signals.** In this market, a downloadable technical PDF signals legitimacy. Missing PDFs on a product page look like amateur content scraping. PDF generation / upload must be a first-class admin feature, not an afterthought.

---

## Sources

- Next.js App Router caching behavior — [nextjs.org/docs/app/building-your-application/caching](https://nextjs.org/docs/app/building-your-application/caching) (HIGH confidence)
- Neon serverless connection pooling — [neon.tech/docs/connect/connection-pooling](https://neon.tech/docs/connect/connection-pooling) (HIGH)
- Supabase Supavisor pooler — [supabase.com/docs/guides/database/connecting-to-postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) (HIGH)
- PostgreSQL JSONB indexing — [postgresql.org/docs/current/datatype-json.html#JSON-INDEXING](https://www.postgresql.org/docs/current/datatype-json.html) (HIGH)
- Google hreflang guidance — [developers.google.com/search/docs/specialty/international/localized-versions](https://developers.google.com/search/docs/specialty/international/localized-versions) (HIGH)
- Google Product structured data — [developers.google.com/search/docs/appearance/structured-data/product](https://developers.google.com/search/docs/appearance/structured-data/product) (HIGH)
- Cloudinary transformation URL structure — [cloudinary.com/documentation/image_transformations](https://cloudinary.com/documentation/image_transformations) (HIGH)
- Auth.js (NextAuth) invite/email flows — [authjs.dev/getting-started/authentication/email](https://authjs.dev/getting-started/authentication/email) (HIGH)
- `next/font` subset configuration — [nextjs.org/docs/app/building-your-application/optimizing/fonts](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) (HIGH)
- Domain knowledge: Russian industrial terminology, Uzbek Latin orthography (U+02BB), CIS B2B SEO (MEDIUM — community + expert knowledge, no single authoritative doc)
- fiztech.ru (inspirational reference from PROJECT.md) — observed patterns of dense spec tables, category navigation, PDF downloads (MEDIUM — direct observation)
- Yandex Webmaster — [yandex.com/support/webmaster/](https://yandex.com/support/webmaster/) (HIGH)

---
*Pitfalls research for: Multilingual B2B industrial-catalog platform (Manometr)*
*Researched: 2026-04-21*
