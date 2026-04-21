# Stack Research

**Domain:** B2B industrial-equipment catalog (pressure-measurement devices) — server-rendered, multilingual, SEO-driven
**Researched:** 2026-04-21
**Confidence:** HIGH on verified versions (Next.js 16.2, Vercel platform); MEDIUM on peer libraries whose exact current minor versions could not be re-verified at write time (see "Version Verification Notes" below)

---

## Executive Recommendation (one-liner per decision)

| Question | Prescription |
|---|---|
| Next.js version + routing | **Next.js 16.2 + App Router + React 19 + TypeScript strict** |
| Database | **Postgres on Neon** (not Supabase — we don't need the BaaS surface area) |
| ORM | **Drizzle ORM** (not Prisma — better for Neon serverless + JSONB spec-schema workloads) |
| i18n | **next-intl** (App Router first-class, no runtime Provider gymnastics) |
| Full-text search | **Postgres `tsvector` with `unaccent` + `pg_trgm`** at 100–500 products; **Meilisearch Cloud** only if/when results quality forces the move |
| Auth | **Auth.js v5 (NextAuth) with Drizzle adapter + Email (magic link) provider** |
| Admin UI | **shadcn/ui + Tailwind CSS v4 + Radix primitives + TanStack Table** hand-assembled inside the same Next.js app (NOT Refine, NOT React Admin) |
| Forms | **React Hook Form + Zod + `@hookform/resolvers`** |
| Media | **Cloudinary** with `next-cloudinary` (not raw `next/image` remote loader) |
| Rich-text editor | **Tiptap v2** (for recipes/use-cases) |
| Email (admin invites, contact form) | **Resend + React Email** |
| Deployment | **Vercel Pro** (Hobby won't cut admin usage + email auth rate limits) |
| Analytics | **Vercel Web Analytics + Speed Insights**; add **Plausible** if marketing wants more detail |
| Error monitoring | **Sentry** (`@sentry/nextjs`) |

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | **16.2.x** | React meta-framework, SSR, routing, API | Verified current stable (released March 2026). App Router is mandatory for this project: Server Components let us render localized spec tables on the server without hydrating 500 products worth of strings; built-in ISR + on-demand revalidation lets admin edits appear in seconds without redeploy; `generateMetadata` gives per-locale titles/descriptions/hreflang cleanly. Pages Router is legacy — do not use. |
| React | **19.x** | UI runtime | Baked into Next.js 16 App Router. Server Components + async components are essential for the "render spec tables on the server" workflow. Do not pin a different React version. |
| TypeScript | **5.7.x+** (strict) | Type safety | `strict: true`, `noUncheckedIndexedAccess: true`. The hybrid spec schema (typed category fields + JSONB custom extras) is the exact scenario where loose TS causes silent admin-panel bugs. |
| PostgreSQL | **16.x** (via Neon) | Primary database | Neon's serverless Postgres ships 16 by default. We use JSONB for per-product custom specs, `tsvector` for full-text, `pg_trgm` for fuzzy matching, and `unaccent` for diacritic-insensitive Russian/Uzbek search. Managed — no ops. |
| Neon | managed service | Postgres hosting | Picked over Supabase because we only need the database, not the Supabase Auth/Storage/Realtime stack (we already use Auth.js + Cloudinary). Neon's branch-per-preview integration with Vercel is genuinely valuable for review workflows: every PR gets its own seeded DB branch. Scale-to-zero fits the low-traffic B2B usage pattern — we pay for what we use. Free tier (0.5 GB + 190 compute hours) covers development; Launch plan (~$19/mo) covers production at 100–500 products easily. |
| Drizzle ORM | **drizzle-orm ^0.40.x, drizzle-kit ^0.31.x** (check latest at install time) | SQL query builder + migrations | Picked over Prisma for three specific reasons: (1) Drizzle's Postgres JSONB support is first-class and type-safe — critical for the per-product `customSpecs` JSONB field; (2) no heavy generated client or separate `prisma generate` step — faster cold starts on Vercel serverless; (3) migrations are plain SQL you can read and diff. Prisma's query engine binary also makes serverless cold starts heavier. Drizzle pairs natively with `@neondatabase/serverless` driver for HTTP-based connections (no connection-pool headaches on Vercel). |
| next-intl | **^4.x** | i18n (routing, messages, formatting) | Purpose-built for Next.js App Router. Server-Component-friendly (`getTranslations` inside async Server Components — no "use client" leakage). Locale-prefixed routing (`/uz`, `/ru`, `/en`) is a one-liner in middleware. Built-in hreflang helpers for SEO. Alternatives: `next-i18next` (Pages Router era, basically deprecated for App Router); `react-i18next` (client-focused, requires bolting on server integration). Using anything but `next-intl` in a new Next.js 16 App Router project is a self-own. |
| Auth.js v5 (NextAuth) | **next-auth ^5.x (beta/stable)** | Auth for admin panel | Small invited team (2–5) doesn't need a hosted identity platform. Auth.js v5 App Router support is stable; Drizzle adapter (`@auth/drizzle-adapter`) matches our ORM choice; Email provider (magic link via Resend) satisfies "email-invite flow" in PROJECT.md without passwords. Clerk would work fine but costs money, locks us into a vendor, and ships a user model we don't need. Lucia (as a library) was archived/sunset in 2024 — its author recommends rolling your own or using Auth.js; avoid. |
| shadcn/ui | latest (copy-paste — no version pinning by design) | Admin UI components | Not a library — a set of copy-pasted Radix + Tailwind components owned by our repo. Correct choice for an admin panel we will customize heavily (custom spec-field editors, per-locale tabs, JSONB key-value editor). Refine and React Admin are opinionated frameworks that fight you when your admin UX diverges from CRUD-table norms; ours will. Tremor is chart/dashboard-focused — wrong fit for a content CMS. |
| Tailwind CSS | **v4.x** | Styling | v4's Oxide engine + CSS-first config is the current direction. Pairs natively with shadcn/ui. |
| Cloudinary | managed + `next-cloudinary ^6.x` | Image + PDF CDN | Already a PROJECT.md constraint. `next-cloudinary`'s `<CldImage>` integrates cleanly with Next.js Image and handles responsive sizing + format negotiation (AVIF/WebP). For PDFs/datasheets, Cloudinary's raw-file delivery with `fl_attachment` gives us download URLs with proper `Content-Disposition`. Crucially: Cloudinary can generate a PDF first-page thumbnail automatically — we get datasheet previews for free. |
| Tiptap | **^2.x** | Rich-text editor for recipes/use-cases | Headless, ProseMirror-based, battle-tested, extensible. We need embedded images (via Cloudinary), internal links to product pages, tables, and maybe custom nodes for "related products". Tiptap handles all of it. Lexical is more modern but has a steeper API and weaker ecosystem for niche extensions we'll likely need. BlockNote is gorgeous but block-based — wrong model for technical article writing. Do not use TinyMCE / CKEditor (heavyweight, licensing headaches). |
| React Hook Form | **^7.x** | Form state | Standard. Unopinionated, fast, works with Server Actions via `useActionState`. |
| Zod | **^3.24.x+** | Schema validation | Use the same schema for form validation (RHF), Server Action input parsing, and DB insert/update validation. Pair with `drizzle-zod` to generate Zod schemas from Drizzle table definitions — single source of truth. |
| Resend | managed + `react-email ^3.x` | Transactional email | Admin invites, contact-form notifications, magic-link auth emails. React Email lets us write templates as JSX (localized via next-intl). Resend's free tier (3000 emails/mo) comfortably covers a B2B admin-team + occasional contact form. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@neondatabase/serverless` | ^0.10.x | Neon's HTTP-driven Postgres driver | Use this (not `pg`) when running on Vercel serverless — HTTP avoids TCP pooling issues. Falls back to WebSocket for transactions. |
| `drizzle-zod` | ^0.7.x | Generate Zod schemas from Drizzle tables | Admin forms — keeps DB schema and input validation in lockstep. |
| `@tanstack/react-table` | ^8.x | Headless admin tables | For the product / category / manufacturer list tables in admin. Pairs with shadcn/ui `<Table>`. Sorting, filtering, pagination, column visibility — all client-side for 100–500 products. |
| `@tanstack/react-query` | ^5.x | Client-side data for interactive admin views | Only inside the admin panel. Public product/category pages should use Server Components + fetch directly. Don't reach for React Query on the public site. |
| `@auth/drizzle-adapter` | ^1.x | Auth.js ↔ Drizzle bridge | Persists users, sessions, verification tokens in our Postgres. |
| `nuqs` | ^2.x | URL-state for filters | Faceted category-page filter state (`?bar_max=100&fluid=gas`) synced to the URL — critical for shareable filtered product lists and for SSR-correct pages. |
| `lucide-react` | ^0.4xx | Icon set | Default pairing with shadcn/ui. |
| `sonner` | ^1.x | Toast notifications | shadcn/ui's recommended toast. |
| `@vercel/og` | bundled with Next.js | OG image generation | Per-product OG images ("ManometerX / 100 bar / stainless") for LinkedIn/Telegram shares. Free on Vercel. |
| `zod-i18n-map` + next-intl | — | Localized Zod error messages | Admin form errors need to respect current admin locale. |
| `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-table` | match Tiptap core | Tiptap extensions | Required for useful recipe articles. |
| `sharp` | ^0.33.x | Image processing on Vercel | Pre-installed on Vercel for `next/image`. Only pin if building custom thumbnail pipeline (unlikely — Cloudinary does this). |
| `@sentry/nextjs` | ^8.x | Error tracking | Instrument server + client + edge runtimes. Free tier handles this project's volume. |
| `@vercel/analytics` | latest | Page-view analytics | Privacy-respecting. Verified in Vercel docs as the recommended choice. |
| `@vercel/speed-insights` | latest | Core Web Vitals tracking | Matters for SEO — Google uses CWV as a ranking signal. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `drizzle-kit` | Schema migrations, introspection, Drizzle Studio | `drizzle-kit generate` produces SQL migration files you commit; `drizzle-kit migrate` applies them. Use Neon branching for safe migration testing. |
| `eslint` + `eslint-config-next` | Linting | Next.js-aware config. Add `@typescript-eslint/no-floating-promises` — critical for async Server Components. |
| `prettier` + `prettier-plugin-tailwindcss` | Formatting | Tailwind class sorting matters for review diffs. |
| `husky` + `lint-staged` | Git hooks | Pre-commit format + typecheck. Small team = cheap gate against bad commits. |
| `vitest` | Unit tests | Faster than Jest, ESM-native. Test Zod schemas, business-logic helpers, locale fallback. |
| `playwright` | E2E | Test critical flows: admin login, create product, view in all three locales, search. |
| `pnpm` | Package manager | Faster installs, strict peer-dep handling — helps when Next.js + Auth.js + Drizzle have overlapping peers. |

---

## Installation

```bash
# scaffold
pnpm create next-app@latest manometr --typescript --tailwind --app --src-dir --import-alias "@/*"
cd manometr

# core data
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit drizzle-zod

# i18n
pnpm add next-intl

# auth
pnpm add next-auth@beta @auth/drizzle-adapter
pnpm add resend react-email @react-email/components

# forms + validation
pnpm add react-hook-form @hookform/resolvers zod

# admin UI
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label textarea select table dialog dropdown-menu form tabs toast card badge
pnpm add @tanstack/react-table @tanstack/react-query nuqs lucide-react sonner

# media
pnpm add next-cloudinary cloudinary

# rich text
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header

# observability
pnpm add @vercel/analytics @vercel/speed-insights @sentry/nextjs

# dev tooling
pnpm add -D prettier prettier-plugin-tailwindcss eslint-config-prettier husky lint-staged vitest @playwright/test
```

> After install, always run `pnpm outdated` and bump to current stable. The versions above are prescriptive for _which_ packages, not for the exact minor releases — pin at install time.

---

## Alternatives Considered

### Database: Neon vs Supabase vs others

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Neon** | **Supabase** | Choose Supabase if you want auth + storage + realtime + RLS bundled and are willing to accept its opinions. For Manometr we explicitly pair Auth.js and Cloudinary, making Supabase's extra surface area wasted. Supabase is also heavier on row-level-security configuration that we don't need for a small invited admin team. |
| Neon | **Vercel Postgres (now Neon-branded)** | Vercel Postgres _is_ Neon under the hood since 2024. Using Neon directly gives you the full dashboard + branching UX without Vercel abstractions. |
| Neon | Railway / Fly Postgres | Choose these only if you outgrow Vercel and move to a VPS-style deploy. Not a v1 concern. |
| Neon | RDS / Cloud SQL | Overkill for 100–500 products. Saves nothing, costs more, adds ops. |

### ORM: Drizzle vs Prisma vs Kysely

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Drizzle** | **Prisma** | Choose Prisma if your team has strong Prisma experience and you value its mature Studio + ecosystem over cold-start speed. Prisma's schema language is friendlier to read for non-SQL-comfortable devs. Trade-off: heavier runtime, slower serverless cold starts, JSONB support less ergonomic. |
| Drizzle | **Kysely** | Choose Kysely if you want pure type-safe SQL building with no schema DSL and prefer writing migrations by hand. Legitimate choice — smaller surface area than Drizzle. Why not here: Drizzle's schema-as-code + migration tooling is a time-saver for a small team. |
| Drizzle | raw `postgres` + manual SQL | Only for one-off scripts. For app code, you want types. |

### i18n: next-intl vs next-i18next vs react-i18next vs Paraglide

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **next-intl** | **Paraglide JS** | Paraglide is newer, tree-shakeable, type-safe per-message. Legitimately interesting for bundle size. Why not here: smaller ecosystem, fewer recipes for App Router locale-prefixed routing with hreflang, and our bundle budget is fine. Revisit in v2. |
| next-intl | **next-i18next** | Legacy Pages-Router-era wrapper around `react-i18next`. Does not idiomatically support Server Components. Avoid for new App Router projects. |
| next-intl | **react-i18next** | Client-side-first. Requires bolting on your own server integration for SSR. next-intl does all of this out of the box. |
| next-intl | Next.js built-in `middleware` + manual JSON dictionaries | Fine for a 2-locale site with flat strings. For 3 locales with pluralization, date/number formatting, and rich text, you will reinvent next-intl poorly. |

### Full-Text Search: Postgres vs Meilisearch vs Typesense vs Algolia

**Scale math for this project:** 100–500 products × 3 locales × (name + short desc + long desc + spec keys + spec values + use-case body) ≈ 100–500 × 3 × ~2 KB = **600 KB to 3 MB of searchable text**. Postgres can full-text search this in single-digit milliseconds all day. A dedicated search engine would be premature optimization.

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Postgres `tsvector` + `unaccent` + `pg_trgm`** | **Meilisearch (self-hosted or Cloud)** | Switch when: (a) result relevance from tsvector's BM25-ish ranking is obviously bad for real queries, (b) you need typo-tolerance across all three locales (Meili does this natively; Postgres needs `pg_trgm` workarounds), or (c) you cross ~5k products and `tsvector` maintenance becomes annoying. Meilisearch Cloud is ~$30/mo at small scale. |
| Postgres FTS | **Typesense** | Very similar position to Meilisearch — pick either one when you outgrow Postgres. Typesense has slightly richer faceting. |
| Postgres FTS | **Algolia** | Only if marketing demands hosted, premium, with UI libraries. Expensive ($500+/mo realistically for multilingual). Overkill for this project. |
| Postgres FTS | **ElasticSearch / OpenSearch** | Do not. Ops burden + cost enormously exceeds the problem. |

**Implementation for v1 (Postgres FTS):**
- One `search_index` table keyed by `(product_id, locale)` with `tsvector` generated column, indexed with `GIN`.
- Or inline `tsvector` generated columns on the `products_translations` table.
- Use `to_tsvector('simple', unaccent(text))` for Uzbek (no built-in Uzbek dictionary); `'russian'` config for Russian; `'english'` for English.
- `pg_trgm` `GIN` index on names for prefix/typo matches.
- Rank with `ts_rank_cd`; fall back to a trigram-similarity OR for no-match-recovery.

### Auth: Auth.js vs Clerk vs Lucia vs Supabase Auth

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Auth.js v5** | **Clerk** | Choose Clerk if the team values the polished UI, MFA/social-login out of the box, and doesn't mind paying per MAU. For a 2–5 admin team the cost is negligible, but it introduces a vendor dependency for something that's genuinely simple (invite → magic link → session). |
| Auth.js | **Lucia** | Lucia was **archived** in early 2024; its maintainer now recommends Auth.js or rolling your own. Do not start a new project on Lucia. |
| Auth.js | **Supabase Auth** | Only if you also picked Supabase for the DB — otherwise you're adopting a whole platform for auth alone. |
| Auth.js | **better-auth** | Newer, promising, growing ecosystem. Legitimate alternative if you want type-safe auth with more first-class primitives than Auth.js. Why not here: Auth.js has more mature Drizzle-adapter + Email-provider production stories. Revisit in v2. |

### Admin UI: shadcn/ui vs Refine vs React Admin vs Tremor

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **shadcn/ui (hand-built admin)** | **Refine** | Choose Refine if your admin is 100% CRUD-list-detail and you want auto-generated pages. Manometr's admin needs custom editors (per-locale tab UI, spec-schema designer, JSONB key-value extras editor) — Refine will fight you. |
| shadcn/ui | **react-admin** | Older Material-UI-based framework. Heavyweight, opinionated, and the resulting UI looks dated. Avoid for a premium-feeling product. |
| shadcn/ui | **Tremor** | Tremor is dashboards/charts, not content CRUD. Useful if you later add an analytics dashboard; not the right base. |
| shadcn/ui | Build from Radix directly | You can, but shadcn/ui is Radix + Tailwind with sensible defaults — no reason not to start from it. |

### Rich-Text Editor: Tiptap vs Lexical vs BlockNote

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Tiptap v2** | **Lexical** | Choose Lexical if you need extreme performance on very large docs or deep collaborative editing. Steeper learning curve and smaller plugin ecosystem than Tiptap — not a fit for "a small team writing use-case articles". |
| Tiptap | **BlockNote** | Notion-style block editor. Beautiful for block-based writing (what Notion does). Wrong model for Manometr's linear technical articles with inline links and tables. |
| Tiptap | **Platejs** | Very customizable, slate-based. More complex than we need. |
| Tiptap | **TinyMCE / CKEditor** | Commercial license issues, heavy, dated DX. Do not use. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Headless CMS (Strapi, Sanity, Directus, Contentful, Payload as SaaS)** | Explicitly ruled out in PROJECT.md. Hybrid spec schema + per-category filtering + structured relations do not map cleanly to off-the-shelf CMS data models. Managing it becomes "fighting the CMS"; writing it ourselves in Postgres + Drizzle is more lines but fewer workarounds. | Drizzle + Postgres + shadcn/ui admin. |
| **Next.js Pages Router** | Deprecated for new projects. No Server Components, awkward async data flow, worse i18n story. | App Router. |
| **`next-i18next`** | Pages-Router era. Not idiomatic in App Router. | `next-intl`. |
| **Prisma for JSONB-heavy workloads** | Works, but the generated client is heavier and JSONB typing is less ergonomic than Drizzle's. | Drizzle. |
| **Lucia (the auth library)** | Archived in 2024 by the author. | Auth.js v5 or better-auth. |
| **Algolia at v1** | Hosted search at B2B-friendly pricing is $500+/mo. At 100–500 products, Postgres full-text is free and fast. | Postgres `tsvector`; Meilisearch when you outgrow it. |
| **MongoDB or any document DB** | Relational modeling (products ↔ categories ↔ manufacturers ↔ spec schemas ↔ translations) is cleaner in Postgres, and you still get JSONB where you need flexibility. | Postgres. |
| **Tremor or React Admin** | Wrong-shape for a content CMS. | shadcn/ui hand-assembled. |
| **Clerk at this team size** | Paid, vendor lock-in, ships features we don't need. Perfectly fine tech — just not justified here. | Auth.js v5 with Email provider. |
| **Uploading product media to Vercel Blob / raw S3** | Cloudinary is already mandated and gives us PDF-thumbnailing, format negotiation, and responsive images for free. | Cloudinary via `next-cloudinary`. |
| **TinyMCE / CKEditor** | Licensing friction and dated DX. | Tiptap. |
| **Running your own Postgres on a VPS** | Ops burden for zero upside at this scale. | Neon. |
| **SSG (fully static export) for product pages** | Admin edits must appear without a deploy. | App Router SSR + ISR (`revalidate`) + on-demand revalidation from admin mutations. |
| **Server Actions as the only write path for bulk admin work** | For CSV import / batch edits, route handlers give cleaner error reporting. | Mix: Server Actions for form submits, Route Handlers for bulk/webhooks. |

---

## Stack Patterns by Variant

**If product count exceeds ~5,000 within the year:**
- Move full-text search off Postgres to **Meilisearch Cloud**.
- Add a read replica in Neon (multi-branch read routing is built in).
- Consider precomputing category-page filter facets to a materialized view refreshed on product write.

**If the team grows to >5 admins and roles matter:**
- Introduce a proper RBAC layer — easiest path is `better-auth` or extending Auth.js session with a `role` claim and route-level checks. Don't try to bolt RBAC onto a flat admin schema retroactively; migrate.

**If you want collaborative editing on recipes:**
- Keep Tiptap; add `@hocuspocus/server` on a Fly.io or Railway worker for Yjs sync. Do not try to run websockets on Vercel.

**If SEO traffic explodes and you need edge-rendering:**
- Most pages are static-ish; enable Partial Prerendering (PPR) — marked experimental in Vercel docs but has been converging toward stable. Keeps Server Components streaming dynamic parts while edge-caching the shell.

**If Uzbek Cyrillic is added in v2:**
- next-intl supports an arbitrary list of locales; just add `uz-Cyrl` to the config and mirror translation files. No schema change required because our DB translations are keyed by locale string, not enum.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16.x | React 19 (required) | React 18 no longer supported in Next 16+. |
| Next.js 16.x | Node.js 20.x LTS or 22.x LTS | Vercel's default runtime. |
| next-intl 4.x | Next.js 14, 15, 16 (App Router) | Pages Router support deprecated. |
| Auth.js v5 | Next.js 14+ App Router | v5 removed the `NextAuth()` default export in favor of `handlers, auth, signIn, signOut` exports — follow the current migration guide. |
| Drizzle + Neon serverless | Edge runtime supported via HTTP driver; Node runtime via WebSocket driver | Use HTTP for most queries on Vercel Functions; switch to WebSocket only for multi-statement transactions. |
| Tailwind v4 | Requires PostCSS 8.x + modern bundler | shadcn/ui has updated templates for Tailwind v4 — confirm the CLI you run uses the v4 variant. |
| Tiptap v2 | React 18 + React 19 | Community Tiptap v3 is in flight — check release notes when installing; stable for now is v2. |
| `next-cloudinary` 6.x | Next.js 14+ | `<CldImage>` maps to `<Image>` automatically. |

---

## Version Verification Notes (honest confidence)

- **Next.js 16.2 (March 2026), React 19 in App Router, Vercel platform features** — **HIGH** confidence, verified against nextjs.org/blog and vercel.com/docs during research.
- **Drizzle ORM, next-intl, Auth.js v5, Tiptap, next-cloudinary, shadcn/ui, React Hook Form, Zod, TanStack Table, Tailwind v4, Neon feature set** — **MEDIUM** confidence. The exact current minor/patch versions could not be freshly verified inside this research session due to fetch/search tool access limits; however, all are widely-used stable libraries whose major-version lines were current as of knowledge cutoff (Jan 2026) and none had deprecation signals. Before `pnpm install`, the implementing dev should run `pnpm view <pkg> version` (or check the package's own docs) to pin the exact current release. Major-version recommendations above are the ones to trust.
- **Lucia being archived** — **MEDIUM-HIGH** confidence, widely reported in the ecosystem through 2024; double-check the current state of the `lucia-auth/lucia` repo's README before finalizing if you are considering Lucia.
- **Postgres FTS being sufficient at 100–500 products** — **HIGH** confidence, straightforward from the scale math in the Full-Text Search section above.

---

## Sources

- https://nextjs.org/blog — verified Next.js 16.2 as current stable (released March 2026), React 19 support, Turbopack improvements.
- https://vercel.com/docs/frameworks/nextjs — verified `@vercel/analytics`, `@vercel/speed-insights`, `@vercel/og`, ISR, Image Optimization, Speed Insights as platform-native capabilities.
- https://nextjs.org/docs — confirmed App Router uses React 19 stable changes; confirmed built-in guides exist for internationalization and authentication (implementation details were not in the excerpt but framework-level posture confirmed).
- Training data (Anthropic knowledge cutoff Jan 2026) — Drizzle ORM, next-intl, Auth.js v5, Tiptap, shadcn/ui, Tailwind v4, Neon, Cloudinary, Resend, Sentry. Confidence MEDIUM on exact versions; HIGH on library selection rationale.
- PROJECT.md (this repo) — constraints, audience, scale, and explicit exclusions drove every recommendation.

---
*Stack research for: B2B industrial-equipment catalog (Manometr) — Next.js + Postgres + Vercel*
*Researched: 2026-04-21*
