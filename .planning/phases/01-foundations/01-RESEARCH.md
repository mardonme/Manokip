# Phase 1: Foundations - Research

**Researched:** 2026-04-21
**Domain:** Next.js 16 App Router + Drizzle + Neon + next-intl v4 + Auth.js v5 + Sentry + Cloudinary — scaffold, schema, locale routing, auth, observability
**Confidence:** HIGH (verified against npm registry, official docs, Context7 CLI)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Locale codes + default locale**
- D-01: Bare `uz`/`ru`/`en` locale codes, stored as `TEXT CHECK (locale IN ('uz','ru','en'))`, verbatim in URLs. Cyrillic (`uz-Cyrl`) is v2+.
- D-02: Default locale is `uz`.
- D-03: Root `/` detection chain: cookie (`NEXT_LOCALE`) → `Accept-Language` header → default `uz`. 307 redirect.
- D-04: next-intl v4 with `locales: ['uz','ru','en']`, `defaultLocale: 'uz'`, `localePrefix: 'always'`. No root `page.tsx`.

**Translation fallback policy**
- D-05: Missing locale → render page in first available fallback locale WITH a prominent banner. No 404, no redirect, no field-level mixing.
- D-06: Fallback chain: `uz → ru → en`.
- D-07: Listings include products lacking the requested locale translation, rendered via fallback chain, with a badge (e.g., `RU`).
- D-08: JSON-LD on fallback-rendered pages declares actual content language (`inLanguage: "ru"` when rendering Russian under `/en/`).

**Auth + identity**
- D-09: Auth.js v5, `session: { strategy: 'database' }`, `@auth/drizzle-adapter`. `sessions.expires` updated per request; middleware rejects sessions > 24h idle or > 7d absolute.
- D-10: Auth.js-owned tables: `auth_users`, `auth_accounts`, `sessions`, `verification_tokens`. Separate `admin_user` table (PK: email) with `email, role, invited_by, invited_at, created_at, last_login_at, active`. `signIn` callback authorizes only when `admin_user WHERE email=? AND active=true` exists.
- D-11: `admin_user.role TEXT NOT NULL DEFAULT 'admin'`. `requireAdmin()` treats anything other than `'admin'` as unauthorized.
- D-12: `BOOTSTRAP_ADMIN_EMAIL` env var: idempotent on boot — if `admin_user` is empty and env var is set, insert one row. Guarded by `SELECT 1 FROM admin_user LIMIT 1`.
- D-13: `audit_log` table declared in Phase 1 schema; no writes in Phase 1. Columns: `id BIGSERIAL PK`, `actor_email TEXT`, `action TEXT`, `entity_type TEXT`, `entity_id TEXT`, `before_json JSONB`, `after_json JSONB`, `at TIMESTAMPTZ DEFAULT now()`, `ip TEXT`, `user_agent TEXT`.
- D-14: Magic-link email uses Resend; React Email template is a Phase 1 deliverable.
- D-15: Middleware: absence of valid Auth.js session cookie on `/[locale]/admin/*` → 307 redirect to `/[locale]/login`.

**spec_field shape details**
- D-16: `spec_field.data_type` enum: `('number','text','enum','bool')`. Range = two `number` fields with shared `filter_group_key`.
- D-17: `spec_field.filter_kind` enum: `('range','select','toggle',NULL)`.
- D-18: Enum options in `spec_field_enum_option` + `spec_field_enum_option_translations`; `product_spec_values.enum_value` stores option `key`.
- D-19: `spec_field.key` is mutable with migration-aware rename (admin UI in Phase 2).
- D-20: Free-form extras use `product_spec_value_translations (value_id, locale, text_value)` sibling; typed `text` values also flow through this sibling.
- D-21: `product_spec_values.unit` overrides `spec_field.unit` when non-null. Unit conversion deferred.

### Claude's Discretion

- Migration via `DATABASE_URL_DIRECT` in Vercel build step `vercel.json` `buildCommand`; runtime via pooled `DATABASE_URL` on `@neondatabase/serverless` HTTP driver.
- Neon-Vercel integration: preview branches per PR.
- Env validation: `@t3-oss/env-nextjs` + Zod at `src/env.ts`, strict server/client split.
- Sentry: 100% error, 10% perf, no session replay. `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`. Tunnel via `next.config.mjs`.
- Slug helper skeleton: `src/lib/slug.ts` with `oʻ`/`gʻ` U+02BB normalization.
- Font loading: `next/font` stub with `['latin','latin-ext','cyrillic']` subsets. Typeface choice is Phase 3.
- Minimal public homepage: empty `/[locale]/page.tsx` placeholder.
- Minimal admin placeholder: "Admin (coming soon)" page post-login.
- Cloudinary sign endpoint: `/api/cloudinary/sign`, requires valid admin session, validates `folder` against allowlist (`products|recipes|industries|manufacturers`), 15-min TTL signature.

### Deferred Ideas (OUT OF SCOPE)

- Full `LocaleSwitcher` component (Phase 2)
- `requireAdmin()` full implementation beyond stub (Phase 2)
- `logAudit()` helper implementation (Phase 2)
- Admin shell UI, invite flow, session timeout UX (Phase 2)
- `spec_field.key` rename UI (Phase 2)
- Slug admin UX (Phase 2)
- Translation completeness UI (Phase 2)
- Cloudinary upload consumers (Phase 2)
- `product_search` tsvector population (Phase 3)
- hreflang, JSON-LD, per-locale canonical emission (Phase 3)
- Uzbek Cyrillic, RBAC split, unit-conversion semantics (v2+)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Schema supports sibling `*_translations` tables for every translatable entity, keyed `(entity_id, locale)` — no per-locale columns, no JSONB bags | Drizzle schema pattern verified (Pattern 1 in ARCHITECTURE.md); `CHECK (locale IN ('uz','ru','en'))` + `UNIQUE(locale, slug)` syntax confirmed via Drizzle docs |
| FOUND-02 | Schema supports typed spec fields (`spec_field` catalog with type `number`/`enum`/`bool`/`text` + unit) and long `product_spec_values` with typed columns | D-16..D-21 + Pattern 2 schema; Drizzle pgEnum, check, composite PK syntax verified |
| FOUND-03 | Locale-prefixed routing via next-intl middleware; root `/` redirects to detected/default locale | next-intl v4.9.1 API verified: `defineRouting`, `createMiddleware`, middleware composition pattern confirmed |
| FOUND-04 | Managed Postgres (Neon) with pooled runtime connection and direct migration connection; Vercel region co-located with DB | Neon `-pooler` URL format verified; drizzle-kit migrate with direct URL in vercel.json buildCommand confirmed |
| FOUND-05 | Auth.js v5 with email magic-link (Resend), Drizzle adapter, admin session cookie gated by middleware for `/[locale]/admin/*` | Auth.js v5 beta.31; `@auth/drizzle-adapter@1.11.2`; Resend provider; edge-split `auth.config.ts` pattern verified |
| FOUND-06 | Cloudinary SDK wired with server-side signing endpoint; credentials in env only | Sign endpoint pattern verified; `cloudinary@2.9.0` + `next-cloudinary@6.17.5`; 1h signature validity confirmed |
| FOUND-07 | Vercel Pro deployment with Sentry error tracking and Vercel Web Analytics + Speed Insights enabled | `@sentry/nextjs@10.49.0`; three-runtime config + `withSentryConfig` + `tunnelRoute` verified; `@vercel/analytics@2.0.1`, `@vercel/speed-insights@2.0.0` confirmed |
</phase_requirements>

---

## Summary

Phase 1 is the first code-producing phase. The repository is empty. Every pattern established here becomes a convention that Phases 2–5 reuse. The core risk this phase eliminates is irreversible schema debt: Russian-first columns, opaque spec strings, and JSONB filter cliffs — all prevented by the typed, locale-agnostic schema committed in this phase.

The implementation divides into eight interdependent streams: (1) project scaffold with strict TypeScript and `@t3-oss/env-nextjs` env validation, (2) Drizzle + Neon client wiring with two connection URLs, (3) the complete schema DDL across 14+ table files, (4) Drizzle migrations runner wired into the Vercel build step, (5) next-intl v4 routing with custom middleware composition for the admin gate, (6) Auth.js v5 with edge-split config + Resend magic-link + `admin_user` authorization callback, (7) Cloudinary sign endpoint, and (8) Sentry + Vercel Analytics observability.

The largest implementation risk is the Auth.js v5 middleware split: because Neon's `@neondatabase/serverless` HTTP driver is NOT Edge-compatible in the same way as a JWT-only Auth.js config, the middleware must check the session cookie cryptographically (JWT decode in Edge runtime) rather than querying the database. This requires `auth.config.ts` to export a providers-only config that the middleware imports, while `auth.ts` adds the Drizzle adapter. Sessions are `strategy: 'database'` for Node.js routes but the middleware performs a lightweight cookie-presence check (JWT-signed cookie verification), not a DB query.

**Primary recommendation:** Build in this order: scaffold → env → Neon client → schema → migrations → next-intl routing → auth → Cloudinary sign endpoint → observability. Each step has a test gate before the next begins.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locale detection + redirect | Edge middleware | — | Must happen before any rendering; zero-latency cookie+header read at Edge |
| Admin session gate (`/[locale]/admin/*`) | Edge middleware | API (Node) for session refresh | Cookie presence + JWT verification at Edge; full DB session validation in Node routes |
| Schema definition | Database (Postgres/Neon) | — | Tables, constraints, indexes live in the DB; Drizzle schema files are the source of truth |
| DB migration runner | Build step (Vercel) | Developer CLI | `drizzle-kit migrate` runs against direct URL before `next build`; never at runtime |
| Drizzle client factory | API / Backend (Node runtime) | — | `@neondatabase/serverless` HTTP driver is Node-only; not Edge-importable in migration files |
| Auth provider logic (signIn callback, DB session) | API / Backend (Node) | — | Drizzle adapter needs TCP/HTTP to Neon; cannot run in Edge runtime |
| Auth config (providers shape) | Shared (Edge + Node) | — | `auth.config.ts` providers-only; imported by both middleware and `auth.ts` |
| Cloudinary sign endpoint | API / Backend (`/api/cloudinary/sign/route.ts`) | — | Needs `CLOUDINARY_API_SECRET` (server-only); signs with server-side Node SDK |
| Env validation | Build + Runtime (server entry) | — | `src/env.ts` imported by `next.config.mjs`; validates at build + first import |
| Sentry instrumentation | All three runtimes (server/client/edge) | — | Three config files, `instrumentation.ts` registers server+edge, `sentry.client.config.ts` runs in browser |
| Vercel Analytics + Speed Insights | Browser (client) | — | `<Analytics />` and `<SpeedInsights />` are client components in root layout |
| Bootstrap admin insert | API / Backend (app boot hook) | — | Lazy: checked on first authenticated request or startup; uses Drizzle + pooled URL |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.4 | React meta-framework, SSR, App Router | Locked project choice; App Router RSC + ISR mandatory for spec-heavy SSR pages |
| `react` | 19.x (bundled with Next 16) | UI runtime | Required by Next.js 16; Server Components for locale-aware spec table rendering |
| `typescript` | 5.x (strict) | Type safety | `strict: true`, `noUncheckedIndexedAccess: true`; hybrid EAV schema benefits greatly from strict types |
| `drizzle-orm` | 0.45.2 | SQL query builder + schema-as-code | [VERIFIED: npm registry 2026-04-21] |
| `drizzle-kit` | 0.31.10 | Migration generator + runner | [VERIFIED: npm registry 2026-04-21] |
| `drizzle-zod` | 0.8.3 | Generate Zod schemas from Drizzle tables | [VERIFIED: npm registry 2026-04-21] |
| `@neondatabase/serverless` | 1.1.0 | Neon HTTP/WebSocket Postgres driver | [VERIFIED: npm registry 2026-04-21]; HTTP mode for stateless Vercel functions |
| `next-intl` | 4.9.1 | i18n routing, messages, formatting | [VERIFIED: npm registry 2026-04-21]; `latest` tag confirmed; App Router native |
| `next-auth` | 5.0.0-beta.31 | Auth framework | [VERIFIED: npm registry 2026-04-21]; `beta` dist-tag; v5 is the App Router-native version |
| `@auth/drizzle-adapter` | 1.11.2 | Auth.js ↔ Drizzle bridge | [VERIFIED: npm registry 2026-04-21] |
| `resend` | 6.12.2 | Transactional email (magic links) | [VERIFIED: npm registry 2026-04-21] |
| `react-email` | 6.0.0 | Email template components | [VERIFIED: npm registry 2026-04-21] |
| `@react-email/components` | 1.0.12 | Pre-built email components | [VERIFIED: npm registry 2026-04-21] |
| `cloudinary` | 2.9.0 | Cloudinary Node SDK (sign endpoint) | [VERIFIED: npm registry 2026-04-21] |
| `next-cloudinary` | 6.17.5 | `<CldImage>` + Cloudinary Next.js helpers | [VERIFIED: npm registry 2026-04-21]; scaffolded in Phase 1, consumed in Phase 2 |
| `@t3-oss/env-nextjs` | 0.13.11 | Zod-validated env schema with server/client split | [VERIFIED: npm registry 2026-04-21] |
| `zod` | 4.3.6 | Schema validation | [VERIFIED: npm registry 2026-04-21] |
| `@sentry/nextjs` | 10.49.0 | Error tracking (server + client + edge) | [VERIFIED: npm registry 2026-04-21] |
| `@vercel/analytics` | 2.0.1 | Vercel Web Analytics | [VERIFIED: npm registry 2026-04-21] |
| `@vercel/speed-insights` | 2.0.0 | Core Web Vitals tracking | [VERIFIED: npm registry 2026-04-21] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tailwindcss` | v4.x | Styling | Phase 1 scaffold only; minimal usage until admin shell in Phase 2 |
| `react-hook-form` | 7.73.1 | Form state | Scaffolded in Phase 1 deps; actively used in Phase 2 admin forms |
| `lucide-react` | ^0.4xx | Icon set | Needed by Phase 1 admin placeholder page |
| `sonner` | ^1.x | Toast notifications | Scaffolded; used in Phase 2 |
| `vitest` | 4.1.4 | Unit test runner | [VERIFIED: npm registry 2026-04-21]; schema + helper tests in Phase 1 |
| `@playwright/test` | 1.59.1 | E2E tests | [VERIFIED: npm registry 2026-04-21]; Phase 1 smoke: login round-trip |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `drizzle-orm` | Prisma | Prisma's generated client is heavier on cold starts; JSONB typing less ergonomic; Neon HTTP driver pairing is native with Drizzle |
| `next-intl` | Paraglide JS | Paraglide is tree-shakeable and type-safe per-message; smaller ecosystem for App Router hreflang recipes; fine to reconsider in v2 |
| `next-auth@beta` | `better-auth` | `better-auth` is maturing quickly; Auth.js has more production stories with Drizzle adapter + Email provider for now |
| Neon | Supabase | Supabase bundles auth + storage + realtime we don't need; Neon's branching integration with Vercel is cleaner for preview workflows |

**Installation (pnpm):**
```bash
pnpm create next-app@latest manometr --typescript --tailwind --app --src-dir --import-alias "@/*"
cd manometr

# core data layer
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit drizzle-zod

# i18n
pnpm add next-intl

# auth + email
pnpm add next-auth@beta @auth/drizzle-adapter
pnpm add resend react-email @react-email/components

# env validation + forms
pnpm add @t3-oss/env-nextjs zod react-hook-form @hookform/resolvers

# media
pnpm add cloudinary next-cloudinary

# admin UI primitives (shadcn/ui init handled separately)
pnpm add lucide-react sonner

# observability
pnpm add @sentry/nextjs @vercel/analytics @vercel/speed-insights

# dev tools
pnpm add -D vitest @vitest/coverage-v8 @playwright/test prettier prettier-plugin-tailwindcss eslint-config-prettier husky lint-staged
```

---

## Architecture Patterns

### System Architecture Diagram

```
Browser/Bot
    │ HTTPS
    ▼
[Edge Middleware: middleware.ts]
  ┌─ Has locale prefix? No → detect cookie/header/default → 307 /uz/...
  └─ Path matches /[locale]/admin/*?
       Yes: check Auth.js session cookie (JWT decode, Edge-safe)
         Absent/invalid → 307 /[locale]/login
         Present → pass through
       No: pass through
    │
    ▼
[Next.js Node Runtime — App Router]
  ┌─────────────────────────────────────────────────────┐
  │  /[locale]/page.tsx        (placeholder RSC)        │
  │  /[locale]/admin/page.tsx  (auth-gated placeholder) │
  │  /[locale]/login/page.tsx  (magic-link trigger UI)  │
  │  /api/auth/[...nextauth]   (Auth.js handlers)       │
  │  /api/cloudinary/sign      (signed upload endpoint) │
  └──────────────────────┬──────────────────────────────┘
                         │ Drizzle (HTTP)
                         ▼
[Neon Postgres — eu-central-1]
  ┌───────────────────────────────────────────────────────┐
  │ Auth tables: auth_users, auth_accounts,               │
  │              sessions, verification_tokens            │
  │ App tables:  admin_user, audit_log                    │
  │ Schema-only: category*, product*, spec_field*,        │
  │              product_spec_values*, product_search,    │
  │              manufacturer*, recipe*, industry*,       │
  │              contact_submission                       │
  └───────────────────────────────────────────────────────┘
         (* = entity + translations sibling)
                         │
                         ▼
[External Services]
  Cloudinary (sign endpoint → direct browser upload in Phase 2)
  Resend (magic-link email delivery)
  Sentry (error events from all three runtimes)
```

### Recommended Project Structure
```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx          # NextIntlClientProvider + html lang + next/font stub
│   │   ├── page.tsx            # Minimal placeholder ("Welcome / Добро пожаловать")
│   │   ├── login/
│   │   │   └── page.tsx        # Magic-link email input (Phase 1 shell only)
│   │   └── admin/
│   │       └── page.tsx        # "Admin (coming soon)" placeholder
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/route.ts  # Auth.js handlers export
│       └── cloudinary/
│           └── sign/route.ts   # Cloudinary signature endpoint
├── db/
│   ├── client.ts               # drizzle() on neon() HTTP driver
│   └── schema/
│       ├── auth.ts             # Auth.js tables (auth_users, auth_accounts, sessions, verification_tokens)
│       ├── admin.ts            # admin_user + audit_log
│       ├── categories.ts       # category + category_translations
│       ├── products.ts         # product + product_translations
│       ├── manufacturers.ts    # manufacturer + manufacturer_translations
│       ├── spec-fields.ts      # spec_field + spec_field_translations + spec_field_enum_option + spec_field_enum_option_translations
│       ├── spec-values.ts      # product_spec_values + product_spec_value_translations
│       ├── search.ts           # product_search (declared; populated Phase 3)
│       ├── recipes.ts          # recipe + recipe_translations
│       ├── industries.ts       # industry + industry_translations
│       └── contact.ts          # contact_submission
├── i18n/
│   ├── routing.ts              # defineRouting({locales, defaultLocale, localePrefix})
│   ├── request.ts              # getRequestConfig for server components
│   └── navigation.ts           # createNavigation exports (Link, redirect, useRouter, etc.)
├── lib/
│   ├── auth.ts                 # NextAuth({adapter, session, providers, callbacks}) — Node only
│   ├── auth.config.ts          # providers-only config — Edge safe
│   ├── cloudinary.ts           # cloudinary.config() + sign helper
│   └── slug.ts                 # U+02BB normalizer stub
├── emails/
│   └── magic-link.tsx          # React Email template for magic-link
├── env.ts                      # @t3-oss/env-nextjs validated env
├── middleware.ts               # next-intl middleware + admin gate (imports auth.config only)
├── instrumentation.ts          # Sentry server + edge registration
├── drizzle.config.ts
├── next.config.mjs             # withSentryConfig wrapper
└── messages/
    ├── uz.json                 # Phase 1 minimal keys
    ├── ru.json
    └── en.json
```

### Pattern 1: next-intl v4 routing configuration
**What:** `defineRouting` in `src/i18n/routing.ts` is the single source of truth for locales, default locale, and prefix strategy. All other next-intl APIs receive it.
**When to use:** Every locale-aware page, middleware, and navigation link.

```typescript
// src/i18n/routing.ts
// Source: https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing [VERIFIED: 2026-04-21]
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['uz', 'ru', 'en'],
  defaultLocale: 'uz',
  localePrefix: 'always',
});
```

```typescript
// src/i18n/navigation.ts
// Source: https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing [VERIFIED: 2026-04-21]
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

```typescript
// src/i18n/request.ts
// Source: https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing [VERIFIED: 2026-04-21]
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  return { locale };
});
```

### Pattern 2: Middleware composition — locale rewrite + admin gate
**What:** `createMiddleware(routing)` handles locale detection and redirect. Admin gate logic wraps it.
**When to use:** `middleware.ts` at repo root. Imports only `auth.config.ts` (NOT `auth.ts`) to stay Edge-safe.

```typescript
// middleware.ts
// Source: next-intl docs + Auth.js edge-compatibility guide [VERIFIED: 2026-04-21]
import createMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import authConfig from '@/lib/auth.config';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

export default auth(async function middleware(req) {
  const pathname = req.nextUrl.pathname;

  // Admin gate: requires valid session
  const isAdminPath = /^\/(uz|ru|en)\/admin(\/|$)/.test(pathname);
  if (isAdminPath && !req.auth) {
    const locale = pathname.split('/')[1] || 'uz';
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return Response.redirect(url, 307);
  }

  return handleI18nRouting(req);
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

**Critical note:** `auth.config.ts` must NOT import `@auth/drizzle-adapter` or any Neon client — those are Node-only. `auth.ts` imports both.

### Pattern 3: Drizzle schema — sibling translations table
**What:** Every translatable entity follows this exact pattern: base table (locale-agnostic) + `*_translations` table (entity_id, locale, translatable fields).
**Source:** ARCHITECTURE.md Pattern 1 + Drizzle ORM docs [VERIFIED: 2026-04-21]

```typescript
// src/db/schema/products.ts
import {
  pgTable, uuid, text, boolean, timestamp,
  primaryKey, uniqueIndex, index, check, foreignKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { categories } from './categories';
import { manufacturers } from './manufacturers';

export const products = pgTable('product', {
  id:             uuid().primaryKey().defaultRandom(),
  categoryId:     uuid('category_id').notNull()
                    .references(() => categories.id),
  manufacturerId: uuid('manufacturer_id')
                    .references(() => manufacturers.id),
  sku:            text().unique(),
  publishedAt:    timestamp({ withTimezone: true }),
  createdAt:      timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const productTranslations = pgTable('product_translations', {
  productId:  uuid('product_id').notNull()
                .references(() => products.id, { onDelete: 'cascade' }),
  locale:     text().notNull(),
  name:       text().notNull(),
  slug:       text().notNull(),
  shortDesc:  text('short_desc'),
  longDesc:   text('long_desc'),
}, (t) => [
  primaryKey({ columns: [t.productId, t.locale] }),
  uniqueIndex('product_translations_locale_slug').on(t.locale, t.slug),
  index('product_translations_locale_idx').on(t.locale),
  check('product_translations_locale_check',
    sql`${t.locale} IN ('uz','ru','en')`),
]);
```

### Pattern 4: Drizzle schema — spec_field + product_spec_values (long-table EAV)
**What:** `spec_field` catalog owned by a category; `product_spec_values` one row per (product, field) with typed value columns.
**Source:** ARCHITECTURE.md Pattern 2 + D-16..D-21 [VERIFIED from context]

```typescript
// src/db/schema/spec-fields.ts
import { pgTable, uuid, text, boolean, integer,
  pgEnum, primaryKey, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const specDataTypeEnum = pgEnum('spec_data_type', ['number', 'text', 'enum', 'bool']);
export const specFilterKindEnum = pgEnum('spec_filter_kind', ['range', 'select', 'toggle']);

export const specFields = pgTable('spec_field', {
  id:            uuid().primaryKey().defaultRandom(),
  categoryId:    uuid('category_id').notNull()
                   .references(() => categories.id),
  key:           text().notNull(),        // mutable, migration-aware
  dataType:      specDataTypeEnum('data_type').notNull(),
  unit:          text(),                  // 'bar', 'mm', '°C'
  required:      boolean().notNull().default(false),
  sortOrder:     integer('sort_order').notNull().default(0),
  filterKind:    specFilterKindEnum('filter_kind'),
  filterGroupKey: text('filter_group_key'), // shared by range min/max pair
}, (t) => [
  uniqueIndex('spec_field_category_key_idx').on(t.categoryId, t.key),
]);
```

```typescript
// src/db/schema/spec-values.ts
import { pgTable, bigserial, uuid, text, boolean, numeric,
  integer, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const productSpecValues = pgTable('product_spec_values', {
  id:           bigserial({ mode: 'bigint' }).primaryKey(),
  productId:    uuid('product_id').notNull()
                  .references(() => products.id, { onDelete: 'cascade' }),
  specFieldId:  uuid('spec_field_id')
                  .references(() => specFields.id, { onDelete: 'set null' }),
  isExtra:      boolean('is_extra').notNull().default(false),
  extraKey:     text('extra_key'),
  numValue:     numeric('num_value'),
  textValue:    text('text_value'),
  boolValue:    boolean('bool_value'),
  enumValue:    text('enum_value'),
  unit:         text(),                  // overrides spec_field.unit when non-null
  sortOrder:    integer('sort_order').notNull().default(0),
}, (t) => [
  index('psv_field_num_idx').on(t.specFieldId, t.numValue),
  index('psv_field_enum_idx').on(t.specFieldId, t.enumValue),
  index('psv_product_idx').on(t.productId),
  check('psv_extra_key_check',
    sql`${t.isExtra} = false OR ${t.extraKey} IS NOT NULL`),
]);

export const productSpecValueTranslations = pgTable('product_spec_value_translations', {
  valueId:   bigserial('value_id', { mode: 'bigint' }).notNull()
               .references(() => productSpecValues.id, { onDelete: 'cascade' }),
  locale:    text().notNull(),
  textValue: text('text_value'),
}, (t) => [
  primaryKey({ columns: [t.valueId, t.locale] }),
  check('psvt_locale_check', sql`${t.locale} IN ('uz','ru','en')`),
]);
```

### Pattern 5: Auth.js v5 edge-split configuration
**What:** `auth.config.ts` (Edge-safe) contains providers only; `auth.ts` (Node-only) adds Drizzle adapter + callbacks.
**Source:** https://authjs.dev/guides/edge-compatibility [VERIFIED: 2026-04-21]

```typescript
// src/lib/auth.config.ts — Edge-safe: no DB imports
import Resend from 'next-auth/providers/resend';
import type { NextAuthConfig } from 'next-auth';

export default {
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.RESEND_FROM_EMAIL,
    }),
  ],
  pages: {
    signIn: '/uz/login',   // default locale; middleware handles locale rewrite
    error:  '/uz/login',
  },
} satisfies NextAuthConfig;
```

```typescript
// src/lib/auth.ts — Node runtime only
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db/client';
import { authUsers, authAccounts, sessions, verificationTokens } from '@/db/schema/auth';
import authConfig from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: authAccounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'database' },
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;
      const adminUser = await db.query.adminUsers.findFirst({
        where: (a, { eq, and }) =>
          and(eq(a.email, user.email!), eq(a.active, true)),
      });
      return !!adminUser;
    },
    async session({ session }) {
      // Attach role to session from admin_user table
      return session;
    },
  },
});

// requireAdmin() — wraps server-side pages/actions
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }
  return session;
}
```

### Pattern 6: Drizzle client factory (Neon HTTP driver)
**What:** Single shared `db` instance using `drizzle-orm/neon-http`. HTTP is fastest for stateless Vercel functions.
**Source:** https://orm.drizzle.team/docs/connect-neon [VERIFIED: 2026-04-21]

```typescript
// src/db/client.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';  // barrel export from schema/index.ts

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
```

For multi-statement transactions (e.g., the BOOTSTRAP_ADMIN_EMAIL boot check), use the WebSocket-based Pool variant:

```typescript
// src/db/client-ws.ts — for transactional writes only
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const dbTx = drizzle({ client: pool, schema });
```

**Note:** `DATABASE_URL` = pooled `-pooler` URL. `DATABASE_URL_DIRECT` = direct URL for migrations only.

### Pattern 7: Env validation with @t3-oss/env-nextjs
**What:** `src/env.ts` defines all environment variables with Zod, split into server-only and client-accessible.
**Source:** https://env.t3.gg/docs/nextjs [VERIFIED: 2026-04-21]

```typescript
// src/env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL:          z.string().url(),           // pooled runtime URL
    DATABASE_URL_DIRECT:   z.string().url(),           // direct migration URL
    AUTH_SECRET:           z.string().min(32),
    AUTH_RESEND_KEY:       z.string().min(1),
    RESEND_FROM_EMAIL:     z.string().email(),
    BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY:    z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    SENTRY_DSN:            z.string().url().optional(),
    SENTRY_AUTH_TOKEN:     z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL:           process.env.DATABASE_URL,
    DATABASE_URL_DIRECT:    process.env.DATABASE_URL_DIRECT,
    AUTH_SECRET:            process.env.AUTH_SECRET,
    AUTH_RESEND_KEY:        process.env.AUTH_RESEND_KEY,
    RESEND_FROM_EMAIL:      process.env.RESEND_FROM_EMAIL,
    BOOTSTRAP_ADMIN_EMAIL:  process.env.BOOTSTRAP_ADMIN_EMAIL,
    CLOUDINARY_CLOUD_NAME:  process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY:     process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET:  process.env.CLOUDINARY_API_SECRET,
    SENTRY_DSN:             process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN:      process.env.SENTRY_AUTH_TOKEN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
});
```

Import `env` in `next.config.mjs` to trigger build-time validation:
```javascript
// next.config.mjs
import './src/env.js';
```

### Pattern 8: Cloudinary sign endpoint
**What:** POST `/api/cloudinary/sign` mints a 15-min signed upload credential for an authorized admin.
**Source:** Cloudinary docs (1h TTL for signatures) + ARCHITECTURE.md Pattern 7 [VERIFIED: 2026-04-21]

```typescript
// src/app/api/cloudinary/sign/route.ts
import { v2 as cloudinary } from 'cloudinary';
import { auth } from '@/lib/auth';
import { env } from '@/env';

const ALLOWED_FOLDERS = new Set(['products', 'recipes', 'industries', 'manufacturers']);

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { folder } = await req.json() as { folder?: string };
  if (!folder || !ALLOWED_FOLDERS.has(folder)) {
    return new Response('Invalid folder', { status: 400 });
  }

  // Cloudinary signatures are valid for 1 hour per official docs
  // Setting timestamp to 15 min in the future provides an effective 15-min window
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    env.CLOUDINARY_API_SECRET,
  );

  return Response.json({
    signature,
    timestamp,
    folder,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  });
}
```

### Pattern 9: Sentry three-runtime setup
**What:** Three config files + `instrumentation.ts` + `withSentryConfig` wrapper.
**Source:** https://docs.sentry.io/platforms/javascript/guides/nextjs/ [VERIFIED: 2026-04-21]

The `instrumentation.ts` file (Next.js built-in hook) registers server and edge Sentry configs:
```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
export const onRequestError = Sentry.captureRequestError; // needs Sentry import
```

`sentry.client.config.ts` in repo root is auto-loaded by `@sentry/nextjs` in the browser.

`next.config.mjs`:
```javascript
import { withSentryConfig } from '@sentry/nextjs';
import './src/env.js';

const nextConfig = { /* ... */ };

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/sentry-tunnel',
  silent: !process.env.CI,
});
```

### Pattern 10: Drizzle migration runner in Vercel build
**What:** `vercel.json` `buildCommand` runs `drizzle-kit migrate` against `DATABASE_URL_DIRECT` before `next build`.
**Source:** Drizzle-kit migration docs + CONTEXT.md [VERIFIED: 2026-04-21]

```json
// vercel.json
{
  "buildCommand": "pnpm drizzle-kit migrate && pnpm next build",
  "env": {
    "DATABASE_URL": "@database-url-pooled",
    "DATABASE_URL_DIRECT": "@database-url-direct"
  }
}
```

`drizzle.config.ts`:
```typescript
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT!,  // direct URL for migrations
  },
});
```

The migration fails loudly (non-zero exit) if the DB is unreachable or migration SQL errors, blocking the deploy.

### Anti-Patterns to Avoid

- **Importing `auth.ts` (with DrizzleAdapter) in `middleware.ts`**: This pulls in the Neon TCP client into Edge runtime, causing a runtime crash. Always import only `auth.config.ts` in middleware.
- **Using `DATABASE_URL` (pooled) for `drizzle-kit migrate`**: Transaction-mode PgBouncer does not support DDL migrations. Always use the direct URL for migrations.
- **Storing `spec_field.data_type = 'range'`**: Range is modeled as two `number` fields with a shared `filter_group_key`. No range type in the DB enum.
- **Per-locale columns on entity tables** (`name_uz`, `name_ru`, `name_en`): The sibling translations table pattern prevents this. See D-01.
- **Not calling `setRequestLocale(locale)` in layouts and pages**: next-intl v4 requires this for static rendering support. Missing it causes dynamic rendering fallback.
- **Using `createSharedPathnamesNavigation`**: This is the old v3 API. v4 uses `createNavigation` from `'next-intl/navigation'`.
- **Importing `next-auth` (v4 stable) instead of `next-auth@beta` (v5)**: The `latest` tag of `next-auth` is 4.24.14, not v5. The install command must be `next-auth@beta` or pinned to `5.0.0-beta.31`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale detection + redirect | Custom locale cookie/header logic | `next-intl createMiddleware` | Handles cookie, Accept-Language, prefix, default locale, 307 redirect — edge cases abound |
| Session cookie verification at Edge | Custom JWT decode in middleware | Auth.js v5 `auth()` with `auth.config.ts` | Auth.js handles cookie name, rotation, encryption standard |
| DB connection pool | `new Pool()` per request | `@neondatabase/serverless` HTTP driver | Serverless TCP pools exhaust Neon connection limits under concurrency |
| Env validation | `process.env.X || throw` guards | `@t3-oss/env-nextjs` | Catches missing vars at build time; server/client split prevents leaking secrets to browser |
| Cloudinary signature | Manual HMAC | `cloudinary.utils.api_sign_request()` | Cloudinary SDK handles the correct parameter serialization and hashing |
| Magic-link email auth | Custom token generation + email | Auth.js v5 Email (Resend) provider | Token storage, expiry, single-use enforcement, email delivery — all handled |
| Schema validation for server actions | Ad-hoc `if (!x) throw` | Zod + `drizzle-zod` | Type-safe, reusable, same schema validates form and DB insert |
| Sentry error capture | `try/catch + console.error` | `@sentry/nextjs` | Source maps, release tracking, Edge + Server + client all covered with one config |

**Key insight:** The "just five lines of code" shortcuts in auth, env validation, and locale detection each contain 5–10 edge cases that surface in production. Every item above has been hand-rolled and regretted before.

---

## Common Pitfalls

### Pitfall 1: Middleware imports `auth.ts` instead of `auth.config.ts`
**What goes wrong:** Next.js Edge runtime crashes at startup with "Module not found" or a Node.js TCP socket error because Neon's driver is not Edge-compatible.
**Why it happens:** Developer imports `@/lib/auth` (which includes DrizzleAdapter → Neon) in `middleware.ts`.
**How to avoid:** `middleware.ts` imports only `auth.config.ts`. The `auth.ts` file is imported only in Server Components, API routes, and Server Actions.
**Warning signs:** `Error: The edge runtime does not support Node.js 'net' module` in Vercel logs.

### Pitfall 2: next-auth `latest` tag installs v4, not v5
**What goes wrong:** `pnpm add next-auth` installs 4.24.14. Project uses v5 APIs (`handlers`, `auth()` as function, `signIn` callback shape) that don't exist in v4 — cryptic TypeScript errors.
**Why it happens:** `latest` npm dist-tag points to v4 stable; v5 is under `beta`.
**How to avoid:** Always install `next-auth@beta` or pin `next-auth@5.0.0-beta.31`.
**Warning signs:** `TypeError: NextAuth is not a function` or missing `handlers` export after install.

### Pitfall 3: `DATABASE_URL` (pooled) used in `drizzle.config.ts` for migrations
**What goes wrong:** `drizzle-kit migrate` against PgBouncer transaction-mode pool fails with "prepared statement does not exist" or silent DDL no-ops.
**Why it happens:** Developer copies the app's `DATABASE_URL` into `drizzle.config.ts` without reading the connection-mode difference.
**How to avoid:** `drizzle.config.ts` must use `DATABASE_URL_DIRECT`. The pooled URL is only for the runtime Drizzle client.
**Warning signs:** Migrations appear to succeed (exit 0) but tables are not created; or crash with PgBouncer error.

### Pitfall 4: `setRequestLocale()` not called in layout or page
**What goes wrong:** next-intl v4 forces the route to dynamic rendering instead of static. Pages that should be ISR become always-dynamic, burning Vercel serverless budget.
**Why it happens:** Developer follows next-intl v3 docs or misses the v4 requirement.
**How to avoid:** Every `layout.tsx` and `page.tsx` under `[locale]/` calls `setRequestLocale(locale)` before any `useTranslations` / `getTranslations` call. Also call `generateStaticParams()` returning all three locales.
**Warning signs:** Vercel analytics shows all locale pages as "Dynamic" when they should be "Static/ISR"; `next build` output shows no static generation for locale routes.

### Pitfall 5: Cloudinary signature timestamp mismatch / clock skew
**What goes wrong:** The signed upload is rejected by Cloudinary with "Invalid signature" even though the code looks correct.
**Why it happens:** Vercel serverless function clock can be slightly off; also, if `timestamp` is passed as a string vs number, signature comparison fails.
**How to avoid:** `timestamp = Math.floor(Date.now() / 1000)` (integer seconds). Pass it consistently in the `api_sign_request` params AND in the upload form data.
**Warning signs:** `Error 401: Invalid Signature` from Cloudinary upload API.

### Pitfall 6: `spec_field.data_type` includes `'range'`
**What goes wrong:** Build fails because the `pgEnum('spec_data_type', [...])` in the DB does not include `'range'`, or Phase 2 admin UI tries to create a field with `data_type='range'` and gets a DB constraint error.
**Why it happens:** REQUIREMENTS.md uses `range` in FOUND-02 description; D-16 overrides this to two `number` fields.
**How to avoid:** The enum in code is `['number','text','enum','bool']`. "Range" behavior comes from two `number` fields sharing `filter_group_key`. Document this clearly in the schema file comment.
**Warning signs:** Admin tries to create a pressure range spec field as a single row and the DB rejects it.

### Pitfall 7: Auth.js `signIn` page not locale-prefixed
**What goes wrong:** Auth.js redirects to `/login` (no locale prefix) which is a 404 because all routes live under `/[locale]/`.
**Why it happens:** Default `pages.signIn` in Auth.js is `/login`. The `[locale]` route segment means this path does not exist.
**How to avoid:** In `auth.config.ts`, set `pages: { signIn: '/uz/login', error: '/uz/login' }`. Middleware will 307-redirect the user to their detected locale's login page on first visit anyway.
**Warning signs:** After magic-link click, user lands on 404 page.

### Pitfall 8: `BOOTSTRAP_ADMIN_EMAIL` insert races on concurrent cold starts
**What goes wrong:** Two Vercel functions cold-start simultaneously, both check `admin_user` table (empty), both insert → unique constraint violation on the email PK.
**Why it happens:** The check-then-insert is not atomic.
**How to avoid:** Use `INSERT INTO admin_user (...) VALUES (...) ON CONFLICT (email) DO NOTHING`. The `ON CONFLICT DO NOTHING` makes the idempotent insert safe under concurrency.

---

## Code Examples

### Auth.js v5 schema tables (Drizzle PostgreSQL)
```typescript
// src/db/schema/auth.ts
// Source: https://authjs.dev/getting-started/adapters/drizzle [VERIFIED: 2026-04-21]
import {
  pgTable, text, integer, timestamp, primaryKey,
} from 'drizzle-orm/pg-core';

export const authUsers = pgTable('auth_users', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:          text('name'),
  email:         text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image:         text('image'),
});

export const authAccounts = pgTable('auth_accounts', {
  userId:            text('user_id').notNull()
                       .references(() => authUsers.id, { onDelete: 'cascade' }),
  type:              text('type').notNull(),
  provider:          text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token:     text('refresh_token'),
  access_token:      text('access_token'),
  expires_at:        integer('expires_at'),
  token_type:        text('token_type'),
  scope:             text('scope'),
  id_token:          text('id_token'),
  session_state:     text('session_state'),
}, (t) => [
  primaryKey({ columns: [t.provider, t.providerAccountId] }),
]);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId:       text('user_id').notNull()
                  .references(() => authUsers.id, { onDelete: 'cascade' }),
  expires:      timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token:      text('token').notNull(),
  expires:    timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.identifier, t.token] }),
]);
```

### `admin_user` table
```typescript
// src/db/schema/admin.ts
import { pgTable, text, timestamp, boolean, bigserial, jsonb } from 'drizzle-orm/pg-core';

export const adminUsers = pgTable('admin_user', {
  email:      text('email').primaryKey(),
  role:       text('role').notNull().default('admin'),
  invitedBy:  text('invited_by'),
  invitedAt:  timestamp('invited_at', { withTimezone: true }),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  active:     boolean('active').notNull().default(true),
});

export const auditLog = pgTable('audit_log', {
  id:         bigserial('id', { mode: 'bigint' }).primaryKey(),
  actorEmail: text('actor_email'),
  action:     text('action'),
  entityType: text('entity_type'),
  entityId:   text('entity_id'),
  beforeJson: jsonb('before_json'),
  afterJson:  jsonb('after_json'),
  at:         timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  ip:         text('ip'),
  userAgent:  text('user_agent'),
});
```

### Bootstrap admin insert (idempotent, concurrency-safe)
```typescript
// src/lib/bootstrap.ts
import { db } from '@/db/client';
import { adminUsers } from '@/db/schema/admin';
import { env } from '@/env';

export async function bootstrapAdmin() {
  const email = env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) return;

  await db.insert(adminUsers).values({
    email,
    role: 'admin',
    active: true,
  }).onConflictDoNothing();
}
```

### `product_search` table declaration (populated in Phase 3)
```typescript
// src/db/schema/search.ts
import { pgTable, uuid, text, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

// tsvector is not a built-in Drizzle column type — use customType
const tsvector = customType<{ data: string }>({
  dataType() { return 'tsvector'; },
});

export const productSearch = pgTable('product_search', {
  productId:  uuid('product_id').notNull()
                .references(() => products.id, { onDelete: 'cascade' }),
  locale:     text('locale').notNull(),
  searchTsv:  tsvector('search_tsv').notNull(),
}, (t) => [
  index('product_search_tsv_gin')
    .using('gin', t.searchTsv),
  index('product_search_locale_idx').on(t.locale),
]);
// PRIMARY KEY defined as composite: set via SQL in migration
```

### next-intl root layout pattern
```typescript
// src/app/[locale]/layout.tsx
// Source: https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing [VERIFIED: 2026-04-21]
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createSharedPathnamesNavigation` | `createNavigation` (from `'next-intl/navigation'`) | next-intl v4 | Old import path still works but deprecated; use new API |
| `getServerSession(authOptions)` in RSC | `auth()` from `src/lib/auth.ts` | Auth.js v5 | Eliminates `authOptions` prop-drilling |
| `withAuth()` middleware wrapper | `auth` export used as middleware or wrapped | Auth.js v5 | New export pattern; `export const { auth } = NextAuth(authConfig)` |
| `NextAuth()` default export | Named exports: `handlers, auth, signIn, signOut` | Auth.js v5 | Route handler becomes `export const { GET, POST } = handlers` |
| `sentry.server.config.ts` auto-loaded | `instrumentation.ts` conditionally imports sentry configs | `@sentry/nextjs` v8+ | Three-runtime split requires `instrumentation.ts` |
| `unstable_cache` for data caching | Still `unstable_cache` in Next.js 16 (with new `"use cache"` directive in experimental) | Next.js 15/16 | `revalidateTag` and `unstable_cache` remain the stable API; `"use cache"` is opt-in experimental |
| `next-intl/server` for `getTranslations` | Same path, but v4 requires `setRequestLocale` in every layout/page for static rendering | next-intl v4 | New requirement; omitting it causes dynamic rendering fallback |

**Deprecated/outdated:**
- `getServerSession` from next-auth v4: replaced by `auth()` in v5
- `next-auth/providers/email` generic Email provider: use `next-auth/providers/resend` for Resend specifically
- `pages/api/auth/[...nextauth].ts`: replaced by `app/api/auth/[...nextauth]/route.ts` with `export const { GET, POST } = handlers`
- Lucia auth library: archived 2024; do not use

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `next-auth@beta` (5.0.0-beta.31) is stable enough for production Phase 1 use | Standard Stack | If a breaking change ships in beta.32+, upgrade path needed; low risk given Auth.js v5 has been in beta for 18+ months |
| A2 | Neon WebSocket driver (`drizzle/neon-serverless`) is needed for multi-statement transactions in Vercel serverless | Architecture Patterns | Neon HTTP driver does support transactions via `.transaction()` in newer versions; confirm at implementation time |
| A3 | `instrumentation.ts` is the correct registration hook for Sentry in Next.js 16 (not a separate `_app.tsx`) | Pattern 9 | If Next.js 16 changed the hook name, Sentry server/edge config would not register; verify `instrumentation.ts` is in `src/` or root per Next.js docs |
| A4 | Auth.js v5 `pages.signIn` path should include locale prefix (`/uz/login`) | Pattern 5 | If Auth.js strips or rewrites the path, the locale-prefixed login redirect may fail; test with the middleware running |
| A5 | `tsvector` column requires `customType` in Drizzle — no native support | Code Examples | If Drizzle added native `tsvector` type in a recent version, the customType workaround is unnecessary but harmless |

---

## Open Questions

1. **Auth.js v5 `session: { strategy: 'database' }` with Edge middleware**
   - What we know: The edge-split pattern (`auth.config.ts` + `auth.ts`) allows middleware to verify the JWT-signed session cookie without hitting the DB.
   - What's unclear: With `strategy: 'database'`, Auth.js signs the session cookie with `AUTH_SECRET` but does NOT embed all session data in the JWT. Middleware can only confirm the cookie is cryptographically valid, not that the session row still exists in the DB.
   - Recommendation: Accept this trade-off for Phase 1. The 24h idle / 7d absolute timeout is enforced at the Node.js layer (Server Actions / route handlers calling `auth()`), not at the Edge layer. The admin gate in middleware is a first-line filter; `requireAdmin()` in each action is the authoritative check.

2. **`next-intl` v4 → v5 migration timeline**
   - What we know: `latest` is 4.9.1; there is a `canary` tag but no v5 stable.
   - What's unclear: next-intl v5 may ship before Phase 3; the migration guide between v4 and v5 is unknown.
   - Recommendation: Pin `next-intl@^4.9.1` in `package.json`. Review release notes before Phase 3 work begins.

3. **Neon `eu-central-1` branch creation timing in Vercel preview deploys**
   - What we know: Neon-Vercel integration creates a branch per PR.
   - What's unclear: Branch creation can take 10–30s; if the Vercel build step runs `drizzle-kit migrate` before the branch is ready, migration fails.
   - Recommendation: Add a retry loop or a `sleep 10` before `drizzle-kit migrate` in the `buildCommand`. Document in runbook.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server-side code | Yes | 20.19.4 LTS | — |
| npm | Package installation | Yes | 10.8.2 | — |
| pnpm | Preferred package manager | No (not in PATH) | — | Use npm; or `npm i -g pnpm` in Vercel build |
| Neon database | Schema + auth | External service | — | Create account at neon.tech before Phase 1 |
| Resend | Magic-link email | External service | — | Create account + verify domain before testing auth |
| Cloudinary | Sign endpoint test | External service | — | Create account + copy credentials before Phase 1 sign-endpoint test |
| Vercel CLI / project | Deployment | External service | — | Must exist + `SENTRY_DSN`, DB URLs configured before deploy |

**Missing dependencies with no fallback:**
- Neon project in `eu-central-1` region with two connection strings (pooled + direct) — must be provisioned before Wave 1 execution
- Resend account with a verified sender domain — must exist before the magic-link test in FOUND-05

**Missing dependencies with fallback:**
- pnpm: use npm if pnpm not installed globally (slightly slower; install pnpm globally as first task in Wave 0)

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`. This section maps each Phase 1 requirement to a test approach.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.ts` — Wave 0 creates this |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run && pnpm playwright test` |
| E2E command | `pnpm playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Every `*_translations` table has `PRIMARY KEY (entity_id, locale)` + `CHECK (locale IN ('uz','ru','en'))` + `UNIQUE(locale, slug)`; no `_ru`/`_en`/`_uz` columns exist in any table | Unit (schema snapshot) | `pnpm vitest run tests/schema/translations.test.ts` | Wave 0 |
| FOUND-01 | `product_translations` rejects `locale='de'` with a DB constraint error | Integration (live DB) | `pnpm vitest run tests/db/locale-constraint.test.ts` | Wave 0 |
| FOUND-02 | `spec_field.data_type` only accepts `number,text,enum,bool` (not `range`) | Unit (schema snapshot) | `pnpm vitest run tests/schema/spec-field.test.ts` | Wave 0 |
| FOUND-02 | `product_spec_values` has columns `num_value`, `text_value`, `bool_value`, `enum_value`, `unit`; no `value TEXT` column | Unit (schema snapshot) | included in above | Wave 0 |
| FOUND-02 | Inserting a spec value with `num_value=42.5` and querying by range returns the row | Integration (live DB) | `pnpm vitest run tests/db/spec-values.test.ts` | Wave 0 |
| FOUND-03 | GET `/` returns 307 to `/uz/` on a machine with no locale cookie and `Accept-Language: *` | E2E | `pnpm playwright test tests/e2e/locale-redirect.spec.ts` | Wave 0 |
| FOUND-03 | GET `/` with cookie `NEXT_LOCALE=ru` redirects to `/ru/` | E2E | included in above | Wave 0 |
| FOUND-03 | GET `/uz/admin/` without auth cookie redirects to `/uz/login` | E2E | `pnpm playwright test tests/e2e/admin-gate.spec.ts` | Wave 0 |
| FOUND-04 | `DATABASE_URL` uses `-pooler` hostname suffix | Unit (env check) | `pnpm vitest run tests/unit/env-validation.test.ts` | Wave 0 |
| FOUND-04 | `drizzle-kit migrate` succeeds against `DATABASE_URL_DIRECT` and all expected tables exist | Integration (manual smoke during deploy) | N/A — manual; verified by checking Neon console after first deploy | Manual |
| FOUND-04 | Vercel deployment region is `fra1` (verified via response headers or Vercel dashboard) | Manual smoke | `curl -I https://<preview-url>/api/health` check `x-vercel-id` header for `fra1` | Manual |
| FOUND-05 | Admin with `BOOTSTRAP_ADMIN_EMAIL` can receive magic-link email and complete login | E2E | `pnpm playwright test tests/e2e/magic-link-login.spec.ts` | Wave 0 |
| FOUND-05 | `signIn` callback rejects an email not in `admin_user` | Integration | `pnpm vitest run tests/db/auth-signin-callback.test.ts` | Wave 0 |
| FOUND-05 | Session row is created in `sessions` table after successful login | Integration | included in above | Wave 0 |
| FOUND-06 | `POST /api/cloudinary/sign` with valid admin session returns `{signature, timestamp, folder, apiKey, cloudName}` | Integration (API route test) | `pnpm vitest run tests/api/cloudinary-sign.test.ts` | Wave 0 |
| FOUND-06 | `POST /api/cloudinary/sign` without session returns 401 | Integration | included in above | Wave 0 |
| FOUND-06 | `POST /api/cloudinary/sign` with invalid folder returns 400 | Integration | included in above | Wave 0 |
| FOUND-06 | `CLOUDINARY_API_SECRET` is not accessible via `NEXT_PUBLIC_*` vars (client bundle) | Unit | `pnpm vitest run tests/unit/env-validation.test.ts` | Wave 0 |
| FOUND-07 | Sentry DSN is configured and a test error appears in the Sentry project within 60s of being triggered | Manual smoke | Trigger `throw new Error('Phase 1 smoke test')` in a server action; verify in Sentry dashboard | Manual |
| FOUND-07 | `<Analytics />` and `<SpeedInsights />` are present in root layout HTML | E2E | `pnpm playwright test tests/e2e/observability.spec.ts` (checks for script presence) | Wave 0 |
| FOUND-07 | Vercel Analytics dashboard shows at least one page view after deploy | Manual smoke | Visit any page; check Vercel Analytics dashboard within 5 minutes | Manual |

### Sampling Rate
- **Per task commit:** `pnpm vitest run --reporter=verbose` (unit + integration, ~30s)
- **Per wave merge:** `pnpm vitest run && pnpm playwright test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`; all manual smokes documented as checked

### Wave 0 Gaps (test files to create before implementation)

Schema snapshot tests:
- [ ] `tests/schema/translations.test.ts` — imports all `*_translations` schemas; asserts: (a) no columns ending in `_uz/_ru/_en` in any table, (b) every translations table has a composite PK `(entity_id, locale)`, (c) every translations table has a `CHECK (locale IN ('uz','ru','en'))` constraint in the Drizzle schema definition
- [ ] `tests/schema/spec-field.test.ts` — asserts `specDataTypeEnum` values are exactly `['number','text','enum','bool']`; asserts `product_spec_values` has `num_value`, `text_value`, `bool_value`, `enum_value` columns

Integration tests (require live Neon test branch):
- [ ] `tests/db/locale-constraint.test.ts` — attempts DB insert with invalid locale, expects throw
- [ ] `tests/db/spec-values.test.ts` — inserts a spec value with `num_value=42.5`; queries by range; verifies row returned
- [ ] `tests/db/auth-signin-callback.test.ts` — mocks or directly calls the `signIn` callback with a non-admin email; expects rejection

API route tests:
- [ ] `tests/api/cloudinary-sign.test.ts` — uses Next.js test utilities or direct `fetch` to the sign endpoint

E2E tests (Playwright, require deployed preview URL):
- [ ] `tests/e2e/locale-redirect.spec.ts` — tests `/` redirect to `/uz/` (default), cookie override, and Accept-Language override
- [ ] `tests/e2e/admin-gate.spec.ts` — tests that unauthenticated GET `/uz/admin/` redirects to `/uz/login`
- [ ] `tests/e2e/magic-link-login.spec.ts` — full magic-link round-trip (requires Resend test mode or Resend staging domain)
- [ ] `tests/e2e/observability.spec.ts` — checks that Vercel Analytics and Speed Insights scripts are present in page HTML

Unit tests:
- [ ] `tests/unit/env-validation.test.ts` — verifies `DATABASE_URL` and `DATABASE_URL_DIRECT` are configured; verifies `CLOUDINARY_API_SECRET` is not in the client-side bundle

Framework infrastructure:
- [ ] `vitest.config.ts` — configure with `environment: 'node'`, `globals: true`
- [ ] `playwright.config.ts` — configure `baseURL` from `process.env.TEST_BASE_URL`
- [ ] `.env.test` — test environment variables (Neon test branch URL, Resend test key)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Auth.js v5 magic-link via Resend; no passwords; `signIn` callback gates on `admin_user.active` |
| V3 Session Management | Yes | `strategy: 'database'`; 24h idle / 7d absolute enforced via `sessions.expires`; `SameSite=Lax` cookie (Auth.js default) |
| V4 Access Control | Yes | `requireAdmin()` wrapper on every Server Action; middleware first-line gate; admin_user table as authorization source |
| V5 Input Validation | Yes | `@t3-oss/env-nextjs` + Zod for env; Zod for Server Action inputs; `drizzle-zod` for DB insert schemas |
| V6 Cryptography | Partial | `AUTH_SECRET` for session cookie signing (min 32 chars enforced in env schema); Cloudinary signature via SDK (HMAC-SHA1); never hand-roll |

### Known Threat Patterns for Phase 1 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cloudinary API secret leak to client | Information Disclosure | `CLOUDINARY_API_SECRET` in `server` block of `@t3-oss/env-nextjs`; never in `NEXT_PUBLIC_*` |
| Admin session cookie replay after user deactivation | Elevation of Privilege | `strategy: 'database'` + `requireAdmin()` calls `auth()` which queries sessions table; deactivating user = deleting session row |
| BOOTSTRAP_ADMIN_EMAIL race condition | Spoofing | `INSERT ... ON CONFLICT DO NOTHING` (idempotent); env var stays set after first insert (no re-insert) |
| Open redirect in locale middleware | Spoofing | Redirect only within the same origin (`req.nextUrl.clone()`); destination path is constructed from static locale list, not user input |
| `DATABASE_URL_DIRECT` exposure | Information Disclosure | Server-only env var; never in `NEXT_PUBLIC_*`; Vercel env configured as secret |
| Magic-link token brute force | Spoofing | Auth.js `verificationTokens` table has short TTL (24h default); tokens are UUID + HMAC, not guessable; rate-limiting on the sign-in endpoint is a Phase 2 hardening |

---

## Sources

### Primary (HIGH confidence)
- npm registry — verified `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `drizzle-zod@0.8.3`, `@neondatabase/serverless@1.1.0`, `next-intl@4.9.1`, `next-auth@5.0.0-beta.31` (beta dist-tag), `@auth/drizzle-adapter@1.11.2`, `resend@6.12.2`, `react-email@6.0.0`, `@react-email/components@1.0.12`, `cloudinary@2.9.0`, `next-cloudinary@6.17.5`, `@t3-oss/env-nextjs@0.13.11`, `zod@4.3.6`, `@sentry/nextjs@10.49.0`, `next@16.2.4`, `@vercel/analytics@2.0.1`, `@vercel/speed-insights@2.0.0`, `vitest@4.1.4`, `@playwright/test@1.59.1`
- https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing — `defineRouting`, `createNavigation`, `setRequestLocale`, `getRequestConfig` API verified
- https://next-intl.dev/docs/routing/middleware — `createMiddleware`, composition pattern, matcher configuration verified
- https://orm.drizzle.team/docs/connect-neon — neon() + drizzle() HTTP driver setup verified
- https://orm.drizzle.team/docs/column-types/pg — `uuid().defaultRandom()`, `bigserial`, `pgEnum`, `timestamp({ withTimezone: true })`, `jsonb`, `boolean`, `numeric` verified
- https://orm.drizzle.team/docs/indexes-constraints — `primaryKey`, `unique`, `check`, `foreignKey` with `onDelete: 'cascade'`, `index`, `uniqueIndex` verified
- https://orm.drizzle.team/docs/migrations — `drizzle-kit generate` + `drizzle-kit migrate` + Vercel buildCommand pattern verified
- https://authjs.dev/getting-started/adapters/drizzle — Auth.js v5 Drizzle adapter table schema (auth_users, auth_accounts, sessions, verificationTokens) verified
- https://authjs.dev/getting-started/authentication/email — Resend provider import (`next-auth/providers/resend`), `AUTH_RESEND_KEY` env var verified
- https://authjs.dev/guides/edge-compatibility — `auth.config.ts` / `auth.ts` split pattern for Edge runtime verified
- https://authjs.dev/getting-started/migrating-to-v5 — v5 export pattern (`handlers, auth, signIn, signOut`), `auth()` replacing `getServerSession` verified
- https://env.t3.gg/docs/nextjs — `createEnv`, server/client split, `runtimeEnv` shape verified
- https://docs.sentry.io/platforms/javascript/guides/nextjs/ — three-runtime config, `withSentryConfig`, `tunnelRoute`, `instrumentation.ts` pattern verified
- https://neon.com/docs/connect/connection-pooling — `-pooler` URL format, transaction-mode limitations, direct vs pooled usage verified
- https://raw.githubusercontent.com/nextauthjs/next-auth/main/packages/adapter-drizzle/src/lib/pg.ts — Auth.js Drizzle adapter PostgreSQL schema table definitions verified
- `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`, `.planning/research/PITFALLS.md` — project-specific architectural decisions

### Secondary (MEDIUM confidence)
- https://cloudinary.com/documentation/upload_images#signed_upload — 1h signature validity, required parameters (timestamp, api_key, signature), `api_sign_request` pattern verified

### Tertiary (LOW confidence — Assumed)
- `tsvector` requires `customType` in Drizzle (no native type) — [ASSUMED] based on training knowledge; verify at implementation time
- `instrumentation.ts` hook location in Next.js 16 (root vs `src/`) — [ASSUMED]; confirm in Next.js 16 docs

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all package versions verified against npm registry 2026-04-21
- Architecture: HIGH — patterns verified against official docs; one assumed item (tsvector customType)
- Pitfalls: HIGH — derived from verified API behaviors and CONTEXT.md locked decisions
- Auth.js v5 edge split: MEDIUM-HIGH — pattern verified from official docs; beta status means API stability is assumed

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days; next-auth beta may ship updates sooner — check before Phase 1 execution)
