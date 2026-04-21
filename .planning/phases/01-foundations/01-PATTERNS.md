# Phase 1: Foundations - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 30 (new/modified files to create)
**Analogs found:** 0 / 30 — this is the first code-producing phase; all files are new-file

---

## Codebase Reality

The repository contains only `.planning/`, `CLAUDE.md`, and `.claude/`. No source code exists yet. Every file below is a new-file seed. The research patterns in RESEARCH.md are the canonical implementation references — the planner must treat those excerpts as the "analog" for each file.

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/env.ts` | env-boundary | build-only → all runtimes | none in-repo | new-file |
| `src/db/client.ts` | client-factory | node-runtime → neon HTTP | none in-repo | new-file |
| `src/db/client-ws.ts` | client-factory | node-runtime → neon WebSocket | none in-repo | new-file |
| `src/db/schema/index.ts` | config (barrel) | build-only | none in-repo | new-file |
| `src/db/schema/auth.ts` | schema | build-only | none in-repo | new-file |
| `src/db/schema/admin.ts` | schema | build-only | none in-repo | new-file |
| `src/db/schema/categories.ts` | schema | build-only | none in-repo | new-file |
| `src/db/schema/products.ts` | schema | build-only | none in-repo | new-file |
| `src/db/schema/manufacturers.ts` | schema | build-only | none in-repo | new-file |
| `src/db/schema/spec-fields.ts` | schema | build-only | none in-repo | new-file |
| `src/db/schema/spec-values.ts` | schema | build-only | none in-repo | new-file |
| `src/db/schema/search.ts` | schema | build-only | none in-repo | new-file |
| `src/db/schema/recipes.ts` | schema | build-only | none in-repo | new-file |
| `src/db/schema/industries.ts` | schema | build-only | none in-repo | new-file |
| `src/db/schema/contact.ts` | schema | build-only | none in-repo | new-file |
| `src/i18n/routing.ts` | config | edge-runtime + node-runtime | none in-repo | new-file |
| `src/i18n/navigation.ts` | utility | client-bundle + node-runtime | none in-repo | new-file |
| `src/i18n/request.ts` | config | node-runtime (server components) | none in-repo | new-file |
| `src/lib/auth.config.ts` | auth-config | edge-runtime | none in-repo | new-file |
| `src/lib/auth.ts` | auth-config | node-runtime | none in-repo | new-file |
| `src/lib/cloudinary.ts` | utility | node-runtime | none in-repo | new-file |
| `src/lib/slug.ts` | utility | node-runtime + client-bundle | none in-repo | new-file |
| `src/lib/bootstrap.ts` | utility | node-runtime (boot hook) | none in-repo | new-file |
| `src/emails/magic-link.tsx` | email-template | build-only (React Email) | none in-repo | new-file |
| `middleware.ts` | middleware | edge-runtime | none in-repo | new-file |
| `src/instrumentation.ts` | instrumentation | node-runtime + edge-runtime | none in-repo | new-file |
| `src/app/[locale]/layout.tsx` | layout-shell | node-runtime (RSC) | none in-repo | new-file |
| `src/app/[locale]/page.tsx` | layout-shell | node-runtime (RSC) | none in-repo | new-file |
| `src/app/[locale]/login/page.tsx` | layout-shell | node-runtime (RSC) | none in-repo | new-file |
| `src/app/[locale]/admin/page.tsx` | layout-shell | node-runtime (RSC) | none in-repo | new-file |
| `src/app/api/auth/[...nextauth]/route.ts` | api-route | node-runtime | none in-repo | new-file |
| `src/app/api/cloudinary/sign/route.ts` | api-route | node-runtime | none in-repo | new-file |
| `drizzle.config.ts` | config | build-only | none in-repo | new-file |
| `next.config.mjs` | config | build-only | none in-repo | new-file |
| `vercel.json` | config | build-only (Vercel CI) | none in-repo | new-file |
| `sentry.server.config.ts` | instrumentation | node-runtime | none in-repo | new-file |
| `sentry.client.config.ts` | instrumentation | client-bundle | none in-repo | new-file |
| `sentry.edge.config.ts` | instrumentation | edge-runtime | none in-repo | new-file |
| `messages/uz.json` | config | build-only | none in-repo | new-file |
| `messages/ru.json` | config | build-only | none in-repo | new-file |
| `messages/en.json` | config | build-only | none in-repo | new-file |

---

## Pattern Assignments

All patterns below come from RESEARCH.md (verified against official docs 2026-04-21). There are no in-repo analogs. Line numbers reference `01-RESEARCH.md`.

---

### `src/env.ts` (env-boundary, build-only → all runtimes)

**Analog:** new-file — RESEARCH.md Pattern 7 (lines 579–619)
**Runtime constraint:** imported in `next.config.mjs`; validates at build time AND first Node/Edge import. ALL secrets must be in `server:{}` only.

**Full pattern** (RESEARCH.md lines 583–619):
```typescript
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL:          z.string().url(),
    DATABASE_URL_DIRECT:   z.string().url(),
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

**Trigger in `next.config.mjs`:** `import './src/env.js';` at top of file (before `nextConfig` definition).

---

### `src/db/client.ts` (client-factory, node-runtime)

**Analog:** new-file — RESEARCH.md Pattern 6 (lines 551–563)
**Runtime constraint:** Node-only. NEVER import in `middleware.ts` or any Edge-runtime file.

**Full pattern** (RESEARCH.md lines 555–563):
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';  // barrel export from schema/index.ts

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
```

**Note:** Uses pooled `DATABASE_URL` (not `DATABASE_URL_DIRECT`). The HTTP driver is stateless — correct for Vercel serverless. For transactions, use `src/db/client-ws.ts`.

---

### `src/db/client-ws.ts` (client-factory, node-runtime, transactional)

**Analog:** new-file — RESEARCH.md Pattern 6 (lines 565–575)
**Runtime constraint:** Node-only. Use ONLY when a multi-statement transaction is required (e.g., bootstrap admin insert, spec rename, Phase 3 product_search rebuild).

**Full pattern** (RESEARCH.md lines 568–575):
```typescript
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const dbTx = drizzle({ client: pool, schema });
```

---

### `src/db/schema/index.ts` (config / barrel, build-only)

**Analog:** new-file — no pattern excerpt in RESEARCH.md; implement as standard barrel re-export.

**Pattern:** Re-export all named exports from every sibling schema file so `import * as schema from './schema'` in `client.ts` gets all tables.

```typescript
export * from './auth';
export * from './admin';
export * from './categories';
export * from './products';
export * from './manufacturers';
export * from './spec-fields';
export * from './spec-values';
export * from './search';
export * from './recipes';
export * from './industries';
export * from './contact';
```

---

### `src/db/schema/auth.ts` (schema, build-only)

**Analog:** new-file — RESEARCH.md Code Examples section (lines 825–872)
**Source tables:** `auth_users`, `auth_accounts`, `sessions`, `verification_tokens` — Auth.js v5 / `@auth/drizzle-adapter` required shape.

**Full pattern** (RESEARCH.md lines 828–872):
```typescript
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

---

### `src/db/schema/admin.ts` (schema, build-only)

**Analog:** new-file — RESEARCH.md Code Examples (lines 874–901) + D-10, D-11, D-13

**Full pattern** (RESEARCH.md lines 877–901):
```typescript
import { pgTable, text, timestamp, boolean, bigserial, jsonb } from 'drizzle-orm/pg-core';

export const adminUsers = pgTable('admin_user', {
  email:       text('email').primaryKey(),
  role:        text('role').notNull().default('admin'),
  invitedBy:   text('invited_by'),
  invitedAt:   timestamp('invited_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  active:      boolean('active').notNull().default(true),
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

**Note:** `audit_log` is declared here in Phase 1 but no code writes to it yet (Phase 2 ships `logAudit()`).

---

### `src/db/schema/categories.ts` (schema, build-only)

**Analog:** new-file — apply RESEARCH.md Pattern 3 (translations sibling) to category entity.

**Pattern to copy:** Follow `products.ts` / `productTranslations` shape from RESEARCH.md lines 379–414 but for `category`. Key specifics:
- `category` table: `id UUID PK`, `parent_id UUID FK self-ref nullable` (self-referential tree), `sort_order INT`, timestamps
- `category_translations` table: `(category_id, locale)` composite PK, `name TEXT NOT NULL`, `slug TEXT NOT NULL`, `description TEXT`, `UNIQUE(locale, slug)`, `CHECK(locale IN ('uz','ru','en'))`

**Sibling translations template** (RESEARCH.md lines 400–414):
```typescript
(t) => [
  primaryKey({ columns: [t.productId, t.locale] }),
  uniqueIndex('product_translations_locale_slug').on(t.locale, t.slug),
  index('product_translations_locale_idx').on(t.locale),
  check('product_translations_locale_check',
    sql`${t.locale} IN ('uz','ru','en')`),
]
```
Replicate this constraint pattern for every `*_translations` table, adjusting the index/constraint names.

---

### `src/db/schema/products.ts` (schema, build-only)

**Analog:** new-file — RESEARCH.md Pattern 3 (lines 379–414) is the primary reference.

**Full pattern** (RESEARCH.md lines 383–414):
```typescript
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

---

### `src/db/schema/manufacturers.ts` (schema, build-only)

**Analog:** new-file — mirror `products.ts` pattern for manufacturer entity.

**Pattern:** Apply the base-table + translations-sibling template. `manufacturer` table has `id`, `logo_public_id` (Cloudinary), timestamps. `manufacturer_translations` has `(manufacturer_id, locale)` PK + `name`, `slug`, `description` + same constraints as product translations.

---

### `src/db/schema/spec-fields.ts` (schema, build-only)

**Analog:** new-file — RESEARCH.md Pattern 4 (lines 417–443)

**Full pattern** (RESEARCH.md lines 421–443):
```typescript
import { pgTable, uuid, text, boolean, integer,
  pgEnum, primaryKey, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const specDataTypeEnum = pgEnum('spec_data_type', ['number', 'text', 'enum', 'bool']);
export const specFilterKindEnum = pgEnum('spec_filter_kind', ['range', 'select', 'toggle']);

export const specFields = pgTable('spec_field', {
  id:             uuid().primaryKey().defaultRandom(),
  categoryId:     uuid('category_id').notNull()
                    .references(() => categories.id),
  key:            text().notNull(),        // mutable — see D-19
  dataType:       specDataTypeEnum('data_type').notNull(),
  unit:           text(),                  // 'bar', 'mm', '°C'
  required:       boolean().notNull().default(false),
  sortOrder:      integer('sort_order').notNull().default(0),
  filterKind:     specFilterKindEnum('filter_kind'),
  filterGroupKey: text('filter_group_key'), // shared by range min/max pair
}, (t) => [
  uniqueIndex('spec_field_category_key_idx').on(t.categoryId, t.key),
]);
```

Also add `spec_field_translations`, `spec_field_enum_option`, and `spec_field_enum_option_translations` tables in this same file (D-18):
- `spec_field_translations`: `(spec_field_id, locale)` PK + `label TEXT NOT NULL`
- `spec_field_enum_option`: `id UUID PK`, `spec_field_id UUID FK`, `key TEXT`, `sort_order INT`, `UNIQUE(spec_field_id, key)`
- `spec_field_enum_option_translations`: `(option_id, locale)` PK + `label TEXT NOT NULL`

**Critical guard (D-16):** The `specDataTypeEnum` MUST NOT include `'range'`. Range behavior = two `number` fields sharing `filter_group_key`.

---

### `src/db/schema/spec-values.ts` (schema, build-only)

**Analog:** new-file — RESEARCH.md Pattern 4 (lines 446–482)

**Full pattern** (RESEARCH.md lines 450–482):
```typescript
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
  unit:         text(),                  // overrides spec_field.unit (D-21)
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

---

### `src/db/schema/search.ts` (schema, build-only — declared, not populated in Phase 1)

**Analog:** new-file — RESEARCH.md Code Examples (lines 922–944)

**Full pattern** (RESEARCH.md lines 926–944):
```typescript
import { pgTable, uuid, text, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({
  dataType() { return 'tsvector'; },
});

export const productSearch = pgTable('product_search', {
  productId:  uuid('product_id').notNull()
                .references(() => products.id, { onDelete: 'cascade' }),
  locale:     text('locale').notNull(),
  searchTsv:  tsvector('search_tsv').notNull(),
}, (t) => [
  index('product_search_tsv_gin').using('gin', t.searchTsv),
  index('product_search_locale_idx').on(t.locale),
]);
// Composite PK (productId, locale) added via raw SQL in the migration file
```

**Note:** `tsvector` is NOT a built-in Drizzle type — use `customType`. Table declared here but population (tsvector writes) deferred to Phase 3.

---

### `src/db/schema/recipes.ts` (schema, build-only)

**Analog:** new-file — mirror `products.ts` translations-sibling pattern.

**Pattern:** `recipe` table with `id`, `featured_image_public_id`, timestamps. `recipe_translations` with `(recipe_id, locale)` PK + `title`, `slug`, `body` (Tiptap JSON stored as `text` or `jsonb`) + same locale CHECK + UNIQUE(locale, slug).

---

### `src/db/schema/industries.ts` (schema, build-only)

**Analog:** new-file — mirror `recipes.ts` pattern for industry entity.

**Pattern:** `industry` table + `industry_translations` sibling. Same locale CHECK + UNIQUE(locale, slug) constraint template.

---

### `src/db/schema/contact.ts` (schema, build-only)

**Analog:** new-file — single table, no translations sibling.

**Pattern:** `contact_submission` table: `id BIGSERIAL PK`, `name TEXT`, `email TEXT`, `phone TEXT`, `message TEXT NOT NULL`, `locale TEXT`, `submitted_at TIMESTAMPTZ DEFAULT now()`, `read_at TIMESTAMPTZ` (nullable). No translations sibling needed (submissions are stored as-received).

---

### `src/i18n/routing.ts` (config, edge + node)

**Analog:** new-file — RESEARCH.md Pattern 1 (lines 296–309)

**Full pattern** (RESEARCH.md lines 299–308):
```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['uz', 'ru', 'en'],
  defaultLocale: 'uz',
  localePrefix: 'always',
});
```

**This is the single source of truth** for all locale-aware routing. All other next-intl APIs receive `routing`.

---

### `src/i18n/navigation.ts` (utility, client + node)

**Analog:** new-file — RESEARCH.md Pattern 1 (lines 311–318)

**Full pattern** (RESEARCH.md lines 312–318):
```typescript
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

**Critical:** Use `createNavigation` from `'next-intl/navigation'`. NOT the old v3 `createSharedPathnamesNavigation`.

---

### `src/i18n/request.ts` (config, node-runtime / RSC)

**Analog:** new-file — RESEARCH.md Pattern 1 (lines 320–334)

**Full pattern** (RESEARCH.md lines 322–334):
```typescript
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

**Note:** This file must also load message dictionaries. Add `messages: (await import(\`../../messages/${locale}.json\`)).default` to the return object.

---

### `src/lib/auth.config.ts` (auth-config, edge-runtime)

**Analog:** new-file — RESEARCH.md Pattern 5 (lines 489–505)
**Runtime constraint:** MUST NOT import `@auth/drizzle-adapter`, `@/db/client`, or any Neon module. Edge-safe providers-only config.

**Full pattern** (RESEARCH.md lines 490–505):
```typescript
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
    signIn: '/uz/login',   // D-15: middleware rewrites to user's detected locale
    error:  '/uz/login',
  },
} satisfies NextAuthConfig;
```

**Pitfall to avoid (RESEARCH.md line 746):** `middleware.ts` imports `auth.config.ts` only, NEVER `auth.ts`. Importing `auth.ts` pulls Neon's TCP driver into Edge runtime → crash.

---

### `src/lib/auth.ts` (auth-config, node-runtime)

**Analog:** new-file — RESEARCH.md Pattern 5 (lines 508–548)
**Runtime constraint:** Node-only. Import only in Server Components, API routes, Server Actions.

**Full pattern** (RESEARCH.md lines 509–548):
```typescript
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
      return session;
    },
  },
});

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }
  return session;
}
```

**D-12 boot hook:** Import and call `bootstrapAdmin()` from `src/lib/bootstrap.ts` in the app's server startup path (e.g., inside a Server Component that runs on first request, or from `instrumentation.ts` `register()` under `nodejs` runtime).

---

### `src/lib/bootstrap.ts` (utility, node-runtime / boot hook)

**Analog:** new-file — RESEARCH.md Code Examples (lines 903–920)

**Full pattern** (RESEARCH.md lines 906–920):
```typescript
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
  }).onConflictDoNothing();   // safe under concurrent cold-starts (Pitfall 8)
}
```

---

### `src/lib/cloudinary.ts` (utility, node-runtime)

**Analog:** new-file — configuration helper extracted from the sign endpoint pattern.

**Pattern:** Export a configured `cloudinary` instance so the sign endpoint and future upload helpers share one config call.

```typescript
import { v2 as cloudinary } from 'cloudinary';
import { env } from '@/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
```

---

### `src/lib/slug.ts` (utility, node + client bundle)

**Analog:** new-file — CONTEXT.md Claude's Discretion (lines 62–63) + CONTEXT.md specifics (lines 143–145)

**Pattern:** Stub normalizer for Uzbek Latin diacritics. No RESEARCH.md excerpt; implement from spec:
- Normalize `oʻ` / `gʻ` variants: replace U+0027 (apostrophe) with U+02BB (modifier letter turned comma) in `oʻ` / `gʻ` combinations
- Convert to lowercase, trim, replace whitespace + unsafe characters with `-`
- Deduplicate hyphens, strip leading/trailing hyphens

```typescript
// Uzbek Latin: U+02BB is the canonical modifier for oʻ and gʻ
export function slugify(input: string): string {
  return input
    .toLowerCase()
    // normalize apostrophe variants to U+02BB
    .replace(/o['‘’ʼ]/g, 'oʻ')
    .replace(/g['‘’ʼ]/g, 'gʻ')
    .replace(/\s+/g, '-')
    .replace(/[^\wʻ-]/g, '-')  // keep word chars + U+02BB
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

Full per-locale slug UX (auto-generate + collision suffix) is a Phase 2 deliverable.

---

### `src/emails/magic-link.tsx` (email-template, React Email)

**Analog:** new-file — D-14 specifies a minimal branded React Email template for magic-link.

**Pattern:** Use `@react-email/components` primitives. Minimal structure:
```typescript
import { Html, Head, Body, Container, Text, Link, Preview } from '@react-email/components';

interface MagicLinkEmailProps {
  url: string;
  locale?: 'uz' | 'ru' | 'en';
}

export default function MagicLinkEmail({ url, locale = 'uz' }: MagicLinkEmailProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>Manometr — kirish havolasi</Preview>
      <Body>
        <Container>
          <Text>Admin paneliga kirish uchun quyidagi havolani bosing:</Text>
          <Link href={url}>Kirish</Link>
        </Container>
      </Body>
    </Html>
  );
}
```

Wire to Auth.js Email provider by passing `sendVerificationRequest` in `auth.config.ts` (uses Resend SDK + this template). Full multi-locale email copy is a Phase 2 refinement.

---

### `middleware.ts` (middleware, edge-runtime)

**Analog:** new-file — RESEARCH.md Pattern 2 (lines 337–370)
**Runtime constraint:** EDGE only. Imports `auth.config.ts`, NOT `auth.ts`. NEVER imports `@/db/client` or anything that requires Node TCP.

**Full pattern** (RESEARCH.md lines 341–370):
```typescript
import createMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import authConfig from '@/lib/auth.config';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

export default auth(async function middleware(req) {
  const pathname = req.nextUrl.pathname;

  const isAdminPath = /^\/(uz|ru|en)\/admin(\/|$)/.test(pathname);
  if (isAdminPath && !req.auth) {
    const locale = pathname.split('/')[1] || 'uz';
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return Response.redirect(url, 307);  // D-03: 307 not 308
  }

  return handleI18nRouting(req);
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

**Detection chain (D-03):** cookie `NEXT_LOCALE` → `Accept-Language` header → default `uz`. This is handled automatically by `createMiddleware(routing)` using the `routing` config from `i18n/routing.ts`.

---

### `src/app/api/auth/[...nextauth]/route.ts` (api-route, node-runtime)

**Analog:** new-file — RESEARCH.md State of the Art (lines 991–999)

**Full pattern:**
```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

No additional logic. Auth.js handles all magic-link flows through `handlers`.

---

### `src/app/api/cloudinary/sign/route.ts` (api-route, node-runtime)

**Analog:** new-file — RESEARCH.md Pattern 8 (lines 628–672)

**Full pattern** (RESEARCH.md lines 632–672):
```typescript
import { cloudinary } from '@/lib/cloudinary';
import { auth } from '@/lib/auth';
import { env } from '@/env';

const ALLOWED_FOLDERS = new Set(['products', 'recipes', 'industries', 'manufacturers']);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { folder } = await req.json() as { folder?: string };
  if (!folder || !ALLOWED_FOLDERS.has(folder)) {
    return new Response('Invalid folder', { status: 400 });
  }

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

**Pitfall 5 (RESEARCH.md line 799):** Timestamp must be `Math.floor(Date.now() / 1000)` (integer, not string). Pass the same value in `api_sign_request` AND return it in the response for the client to include in the upload form data.

---

### `src/app/[locale]/layout.tsx` (layout-shell, node-runtime RSC)

**Analog:** new-file — RESEARCH.md Code Examples (lines 947–979) + Pitfall 4 (lines 792–797)

**Full pattern** (RESEARCH.md lines 950–979):
```typescript
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
  setRequestLocale(locale);  // REQUIRED — prevents dynamic rendering fallback

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

Add `next/font` stub with `subsets: ['latin', 'latin-ext', 'cyrillic']` (CONTEXT.md discretion). Specific typeface deferred to Phase 3. Also add `<Analytics />` and `<SpeedInsights />` client components here (RESEARCH.md line 113).

---

### `src/app/[locale]/page.tsx` (layout-shell, node-runtime RSC — placeholder)

**Analog:** new-file — minimal placeholder per CONTEXT.md discretion.

**Pattern:**
```typescript
import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <main><h1>Manometr</h1></main>;
}
```

Zero styling beyond confirming routing works. Real content is Phase 3.

---

### `src/app/[locale]/login/page.tsx` (layout-shell, node-runtime RSC)

**Analog:** new-file — minimal magic-link trigger shell per CONTEXT.md discretion + D-15.

**Pattern:** Render a simple email input form that calls `signIn('resend', { email, redirectTo: '/${locale}/admin' })` via a Server Action. Full invite UX is Phase 2.

---

### `src/app/[locale]/admin/page.tsx` (layout-shell, node-runtime RSC — placeholder)

**Analog:** new-file — minimal placeholder per CONTEXT.md discretion.

**Pattern:**
```typescript
import { requireAdmin } from '@/lib/auth';

export default async function AdminPage() {
  await requireAdmin();   // throws → middleware catches if session invalid
  return <main><p>Admin (coming soon)</p></main>;
}
```

---

### `src/instrumentation.ts` (instrumentation, node + edge)

**Analog:** new-file — RESEARCH.md Pattern 9 (lines 675–691)

**Full pattern** (RESEARCH.md lines 682–691):
```typescript
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
export const onRequestError = Sentry.captureRequestError;
```

---

### `sentry.server.config.ts` / `sentry.client.config.ts` / `sentry.edge.config.ts` (instrumentation)

**Analog:** new-file — RESEARCH.md Pattern 9 + CONTEXT.md discretion (lines 61)

**Shared initialization pattern** (adapt per runtime):
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,    // 10% performance traces
  sampleRate: 1.0,          // 100% error capture
  // No sessionReplay in v1
});
```

`sentry.client.config.ts` uses `NEXT_PUBLIC_SENTRY_DSN` (client-accessible). Server and edge configs use `SENTRY_DSN` (server-only). Tunnel route is `/sentry-tunnel` (set in `next.config.mjs`).

---

### `next.config.mjs` (config, build-only)

**Analog:** new-file — RESEARCH.md Pattern 9 (lines 695–709) + env import pattern (lines 622–626)

**Full pattern** (RESEARCH.md lines 700–708):
```javascript
import { withSentryConfig } from '@sentry/nextjs';
import './src/env.js';  // triggers build-time env validation

const nextConfig = {
  // App Router is default in Next 16; add experimental flags here if needed
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  tunnelRoute: '/sentry-tunnel',
  silent: !process.env.CI,
});
```

---

### `drizzle.config.ts` (config, build-only)

**Analog:** new-file — RESEARCH.md Pattern 10 (lines 726–739)

**Full pattern** (RESEARCH.md lines 728–738):
```typescript
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT!,  // MUST be direct URL, not pooled
  },
});
```

**Critical (Pitfall 3, RESEARCH.md line 789):** ALWAYS `DATABASE_URL_DIRECT` here. Using the pooled `DATABASE_URL` silently fails DDL migrations under PgBouncer transaction mode.

---

### `vercel.json` (config, Vercel CI)

**Analog:** new-file — RESEARCH.md Pattern 10 (lines 714–724)

**Full pattern** (RESEARCH.md lines 716–724):
```json
{
  "buildCommand": "pnpm drizzle-kit migrate && pnpm next build",
  "env": {
    "DATABASE_URL": "@database-url-pooled",
    "DATABASE_URL_DIRECT": "@database-url-direct"
  }
}
```

Migration runs BEFORE `next build` — if migration fails, deploy is blocked. Both env vars reference Vercel secrets (`@secret-name` syntax).

---

### `messages/uz.json`, `messages/ru.json`, `messages/en.json` (config, build-only)

**Analog:** new-file — minimal key set for Phase 1.

**Pattern (Phase 1 minimal keys):**
```json
{
  "common": {
    "siteTitle": "Manometr",
    "loading": "...",
    "error": "Xato yuz berdi"
  },
  "auth": {
    "signIn": "Kirish",
    "signInPrompt": "Email manzilingizni kiriting",
    "checkEmail": "Elektron pochtangizni tekshiring"
  },
  "admin": {
    "title": "Admin panel",
    "comingSoon": "Tez orada"
  }
}
```

Provide equivalent keys in Russian (`ru.json`) and English (`en.json`). Full copy is expanded in Phase 2+ as components are added.

---

## Shared Patterns

### Pattern A: Translations Sibling Table
**Applies to:** All translatable entity schema files (`categories.ts`, `products.ts`, `manufacturers.ts`, `spec-fields.ts`, `recipes.ts`, `industries.ts`)
**Source:** RESEARCH.md Pattern 3 lines 400–414 (constraint template)

Every `*_translations` table MUST include all three of these in its table callback:
```typescript
(t) => [
  primaryKey({ columns: [t.entityId, t.locale] }),
  uniqueIndex('<entity>_translations_locale_slug').on(t.locale, t.slug),
  check('<entity>_translations_locale_check',
    sql`${t.locale} IN ('uz','ru','en')`),
]
```
No JSONB bags. No per-locale columns on the base table. This is the hardest schema constraint to migrate later.

---

### Pattern B: Locale CHECK + `setRequestLocale` in Every Layout/Page
**Applies to:** `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, all locale-segment pages in Phase 2+
**Source:** RESEARCH.md Pitfall 4 (lines 792–797)

Every layout and page under `[locale]/` must call `setRequestLocale(locale)` before any translation call, AND export `generateStaticParams()` returning all three locales. Omitting this forces dynamic rendering and wastes Vercel budget.

```typescript
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
// Inside the component:
setRequestLocale(locale);
```

---

### Pattern C: Edge / Node Runtime Split for Auth
**Applies to:** `middleware.ts` (edge), `src/lib/auth.ts` (node), `src/lib/auth.config.ts` (both)
**Source:** RESEARCH.md Pattern 5 + Pitfall 1 (lines 774–778)

| File | Import | Runtime |
|------|--------|---------|
| `middleware.ts` | `auth.config.ts` only | Edge |
| API routes, Server Actions, RSC | `auth.ts` | Node |
| `auth.config.ts` | No DB/Neon imports | Edge-safe |
| `auth.ts` | `DrizzleAdapter` + `db` | Node-only |

Violating this (importing `auth.ts` in `middleware.ts`) crashes the Edge runtime with `"The edge runtime does not support Node.js 'net' module"`.

---

### Pattern D: `requireAdmin()` Guard
**Applies to:** All admin-gated pages and Server Actions
**Source:** RESEARCH.md Pattern 5, lines 541–548

```typescript
import { requireAdmin } from '@/lib/auth';
// In any admin Server Component or Server Action:
const session = await requireAdmin();
```

Phase 1 ships the stub implementation. Phase 2 hardens it to also verify `role === 'admin'` against the `admin_user` table for RBAC readiness (D-11).

---

### Pattern E: `onConflictDoNothing()` for Idempotent Inserts
**Applies to:** `bootstrapAdmin()` and any future seed/idempotent logic
**Source:** RESEARCH.md Pitfall 8 (lines 817–819)

Use `db.insert(...).values(...).onConflictDoNothing()` for all bootstrap/seed inserts. Prevents unique constraint violations under concurrent cold starts.

---

### Pattern F: Env Import Discipline
**Applies to:** All server-side files that need environment variables
**Source:** RESEARCH.md Pattern 7

Always import from `@/env` (the Zod-validated boundary), never read `process.env` directly in application code. This ensures missing vars fail fast at build time with a clear error, not at request time with a cryptic `undefined` value.

```typescript
import { env } from '@/env';
// Then: env.DATABASE_URL, env.CLOUDINARY_API_SECRET, etc.
```

---

## No Analog Found

All 40 Phase 1 files are new — no in-repo analogs exist. The RESEARCH.md patterns are the definitive implementation references.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| All files listed above | various | various | Repository contains only planning artifacts; Phase 1 seeds every pattern |

---

## Metadata

**Analog search scope:** Entire repository (`.planning/`, `CLAUDE.md`, `.claude/`)
**Source files scanned:** 2 (01-CONTEXT.md, 01-RESEARCH.md) — no source code files exist yet
**Pattern extraction date:** 2026-04-21
**Research verification:** All patterns verified against npm registry and official docs on 2026-04-21 per RESEARCH.md header
