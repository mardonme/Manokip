# Phase 4: Content Features — Research

**Researched:** 2026-04-30
**Domain:** Trilingual rich-text content (Tiptap v3) + M:N product cross-links + TechArticle JSON-LD
**Confidence:** HIGH (Tiptap packages probed at the registry + dist; integration sites read at file:line; JSON-LD pattern carries forward verbatim from Phase 3)

## Summary

Phase 4 layers a content tier on top of Phases 1–3: admin Tiptap editor (recipes + industries), public RSC pages (Tiptap → HTML via `@tiptap/static-renderer` — no client ProseMirror bundle), M:N product cross-links (two junction tables + a pgView), and TechArticle JSON-LD reusing the Phase-3 escape pattern. **Schema substrate is already 90% in place** — `recipes.ts` + `industries.ts` shipped in Phase 1 with `jsonb` body, sibling translations, locale check constraint, and `published_at`. Phase 4's additive migration is small: 2 status text columns (mirroring product), 2 junction tables, 1 optional `pgView`.

The only NEW dependency is the Tiptap stack (8 packages, all `3.22.5`, peer-aligned). Phase 1 STACK.md said "Tiptap v2" — **v2 is now superseded by v3 (current `3.22.5`, published 2026-04-27)**. v3 is what gets installed; the migration story is documented and aligns with our extension list. The static-renderer is the marquee win: `@tiptap/static-renderer/pm/html-string` exports `renderToHTMLString({ extensions, content }): string` — pure synchronous, no React, no DOM, RSC-safe. Built-in HTML-escapes all text and attribute values (`&`, `<`, `>`, `"`); throws on unknown node types when `unhandledNode` option is unset (this *is* our XSS allow-list).

**Primary recommendation:** Pin every Tiptap package to `3.22.5` (peer-locked). Use plain `text` columns + CHECK constraint for `recipe.status` / `industry.status` (mirroring `product.status` from migration `0001_overrated_shiva.sql`) — do NOT introduce a `publication_status` pgEnum. Junction tables follow Phase-1 conventions (composite PK + cascade FKs both directions + per-FK index). Tiptap image node stores Cloudinary `data-public-id`; the **public RSC reads the JSON directly and renders `<CldImage>` per image node** instead of letting static-renderer emit `<img>` (gives us `f_auto,q_auto,w_auto` consistency with Phase 3 `<CldImage>`). Linked-products picker uses shadcn Combobox (Command + Popover) — at v1 scale (≤200 published products) client-side filter is sufficient and reuses the Phase-2 spec-values-editor select primitive. **TechArticle for industry pages is acceptable** but worth flagging: schema.org defines TechArticle for "how-to / step-by-step / specs"; industries are vertical landing pages. Google's Rich Results Test will validate either way (TechArticle inherits Article's recommended set), but `Article` is a more honest type for industries. Locked at user level by D-10 — proceed with TechArticle for both.

## Project Constraints (from CLAUDE.md)

The following directives from `./CLAUDE.md` constrain Phase 4 implementation:

- **Translations:** Every translatable entity uses sibling `*_translations` table keyed `(entity_id, locale)`. No `_ru`/`_en`/`_uz` columns. No JSONB translation bags. → Phase 4 already complies (Phase 1 schema).
- **Locale routing:** Subpath `/[locale]/...` (uz, ru, en). Per-locale canonical + hreflang for all 3 + `x-default` on every page. → Phase 4 must call `buildAlternates({ slugByLocale })` from `src/lib/metadata.ts` for both recipe and industry detail pages.
- **Cache invalidation:** Every Server Action mutation MUST call `revalidateTag` for the affected public pages. Edit-then-refresh must be e2e-tested on Vercel preview (not `next dev`). → Pitfall #2 (post-tx revalidation) carries forward; junction-table mutations on either side fire `revalidateUsedIn(productId)` for each linked product.
- **Cloudinary:** Admin uploads go directly to Cloudinary via signed upload (bypassing Vercel). DB stores only `public_id`. Never round-trip large files through `/api/`. → Tiptap inline images reuse `/api/cloudinary/sign` widget paramsToSign protocol from plan 02-14 verbatim. DB-stored Tiptap JSON contains `{ type: 'image', attrs: { publicId } }` (NOT a Cloudinary URL).
- **Admin auth:** Magic-link only. Session expires on 24h idle / 7d absolute. `requireAdmin()` wrapper on every Server Action. Every mutation writes to `audit_log`. → Wrap every saveRecipe / saveIndustry / publish / unpublish / delete / link / unlink action with `withAdminAction` from `src/lib/server-action.ts`.
- **GSD entry:** All file-changing work goes through a GSD command. → Phase 4 plans drive execution; no direct edits.

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-10)

- **D-01:** Recipe and Industry are separate base tables. Already shipped in Phase 1 (`src/db/schema/recipes.ts`, `src/db/schema/industries.ts`). NO table merge into a unified `article` table.
- **D-02:** Phase-4 additive migration adds: `recipe.status` + `industry.status` text columns + 2 junction tables + optional `pgView`. Reuse existing `publication_status` enum if it exists; otherwise text + CHECK (per project pattern — see Verification below).
- **D-03:** Status + publishedAt dual-column lifecycle (mirrors Phase 2 D-11 / 02-13b). saveRecipe/saveIndustry write status verbatim. Dedicated publishRecipe/unpublishRecipe atomic dual-column writes. deleteRecipe audit-before-delete inside tx; FK cascade drops translations + junction rows. All wrap `withAdminAction`. All call typed `revalidateRecipe(id)` / `revalidateIndustry(id)` AFTER tx.commit.
- **D-04:** M:N junction direction is **author-side only**. Recipe/industry form has linked-products picker. Product form does NOT show reverse "appears in" multi-select. Reverse direction renders read-only on public product detail page as "Used in" section.
- **D-05:** Tiptap extension floor: `@tiptap/starter-kit` (paragraph, headings 1–4, bold, italic, lists, blockquote, code, hard break) + `@tiptap/extension-link` (target=_blank rel=nofollow on external) + `@tiptap/extension-image` + `@tiptap/extension-table` (+ table-row + table-cell + table-header). Headings cap at H4. No code-block syntax highlighting.
- **D-06:** Tiptap image upload uses existing Cloudinary signed direct upload. DB stores public_id (NOT URL). Reuse `/api/cloudinary/sign` from Phase 1 plan 01-06 + paramsToSign protocol from Phase 2 plan 02-14.
- **D-07:** Locale fallback chain: current → uz → ru → en, stop at first non-empty (mirrors Phase 3 D-05). Banner: `"Показано на узбекском — переводу на русский ещё нет"` and equivalents. Same cascade for industry pages.
- **D-08:** Tiptap JSON → HTML on the server via `@tiptap/static-renderer` (RSC, no hydration cost). Locked extension allow-list. Public bodies render inside `prose prose-slate` Tailwind-typography wrapper.
- **D-09:** "Used in" renders as two sections — Recipes (top) + Industries (below) — each a card grid. Up to 6 items per type; "Все примеры применения" link is **deferred to v1.1** (not scoped here). Section hidden when 0 cross-links. Section placement: below spec table, above manufacturer card.
- **D-10:** Both recipes and industries emit TechArticle JSON-LD. Extend `src/lib/jsonld.ts` with `techArticleJsonLd(article, locale)`. Optional `mentions` array referencing linked products' canonical URLs.

### Claude's Discretion

- Cache + revalidation strategy: extend typed-tag helper set with `revalidateRecipe(id)` + `revalidateIndustry(id)` + `revalidateUsedIn(productId)`. Recipe/industry list pages tag with `recipes:list:<locale>` / `industries:list:<locale>`.
- Slug auto-generation: reuse Phase-2 slugify-and-collision-check pattern. Per-locale slugs (existing schema). Collision check against per-locale unique index.
- Translation completeness UI: reuse `<TranslationCompleteness>` + `<TranslationDots>` primitives. Body field counts toward completeness.
- Empty-locale list filter: list pages show entries with at least one published translation in any locale, with per-row dot indicator.

### Deferred Ideas (OUT OF SCOPE)

- Recipe/industry content search → v1.1 backlog. v1 search box scopes to products only.
- Per-product "all examples" page → v1.1 backlog.
- Code-block syntax highlighting → defer.
- Collaborative editing (Yjs + Hocuspocus) → out of scope for v1.
- Reverse "appears in" multi-select on product form → explicitly rejected in D-04.
- Rich-text validation tooling (broken-link detector, missing-alt-image lint) → defer.
- Phase-3 UI-REVIEW.md FIX-1/FIX-2/FIX-3 → tracked as Phase-5 dogfood-gate prerequisites.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | Admin CRUD recipes (Tiptap rich-text, links + images via Cloudinary + tables + headings, trilingual) | §Tiptap admin editor wiring, §Cloudinary integration, §Schema migration sketch (recipes.status), §saveRecipe pattern from 02-13a |
| CONT-02 | Admin CRUD industry-scenario pages (translated content + linked recommended products) | §Tiptap admin editor wiring (mirrored), §Linked-products picker, §Schema migration sketch (industries.status + product_industries junction) |
| CONT-03 | Visitor browse/read recipes + industry pages in current locale | §Tiptap static-renderer call signature, §Locale fallback (D-07 mirrors Phase 3 D-05), §Public RSC integration sites |
| CONT-04 | Product detail "Used in" section listing recipes + industries | §"Used in" reverse query, §pgView product_used_in_v sketch, §Integration site `src/app/[locale]/products/[slug]/page.tsx:130` |
| CONT-05 | Admin assigns M:N product↔recipe + product↔industry | §Junction table shape, §Linked-products picker (shadcn Combobox), §Author-side-only direction (D-04) |
| CONT-06 | Recipes + industry pages emit TechArticle JSON-LD | §TechArticle JSON-LD field set, §Phase 3 escape pattern carry-forward, §techArticleJsonLd helper extending `src/lib/jsonld.ts:32-48` |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Admin Tiptap editor (RHF-bound) | Browser/Client (`'use client'`) | Frontend Server (RSC mounts admin route) | Tiptap useEditor needs DOM + ProseMirror; `immediatelyRender: false` mandatory to avoid hydration mismatch |
| Tiptap image upload | Browser/Client (Cloudinary widget) | API/Backend (`/api/cloudinary/sign` signature mint only) | Bytes never round-trip through Vercel — client → Cloudinary direct (Pitfall #11) |
| saveRecipe / saveIndustry / publish / unpublish / delete | API/Backend (Server Action) | Database (5-step tx) | `withAdminAction` enforces auth + audit; tx ensures atomicity |
| Junction-row insert/update on save | API/Backend (Server Action) | Database (replace-on-save inside tx) | Same pattern as product_spec_values replace-on-save in saveProduct (5-step tx Step 3) |
| Public recipe/industry detail (Tiptap → HTML) | Frontend Server (RSC) | Database (read translations) | `@tiptap/static-renderer` is sync, no React, RSC-safe; emits HTML server-side; zero client ProseMirror bundle |
| Tiptap image node → `<CldImage>` | Frontend Server (RSC) | CDN/Static (Cloudinary delivery) | Public RSC walks JSON tree; emits `<CldImage publicId={attrs.publicId}>` per image node, NOT static-renderer's `<img>` — keeps responsive `sizes` strategy consistent with Phase 3 |
| "Used in" reverse query | Frontend Server (RSC) | Database (pgView OR 2 reads) | Single `'use cache'` tagged read inside product detail RSC; tagged with `used-in:<productId>` |
| TechArticle JSON-LD emission | Frontend Server (RSC) | — | `<script type="application/ld+json">` server-rendered with `\\u003c` XSS escape (Phase 3 D-09 pattern) |
| Cache invalidation | API/Backend (post-tx) | — | revalidateRecipe(id) / revalidateIndustry(id) / revalidateUsedIn(productId) — typed helpers extending `src/lib/revalidation.ts` |

## Standard Stack

### Core (NEW for Phase 4 — pin all to `3.22.5`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tiptap/core` | `3.22.5` | ProseMirror schema + extension framework | Required peer for every Tiptap package |
| `@tiptap/pm` | `3.22.5` | ProseMirror bundle (model, state, view, transform, commands) | Tiptap's curated re-export of `prosemirror-*` packages — single peer dep instead of 12 |
| `@tiptap/react` | `3.22.5` | `useEditor` hook + `<EditorContent>` component | Admin editor only (`'use client'`) |
| `@tiptap/starter-kit` | `3.22.5` | Bundles document, paragraph, text, headings, bold, italic, strike, code, lists, blockquote, hard-break, history, dropcursor, gapcursor, listKeymap, undo/redo | D-05 explicitly locks. Headings cap at H4 enforced via `StarterKit.configure({ heading: { levels: [1,2,3,4] } })` (H1 reserved for page title outside editor) |
| `@tiptap/extension-link` | `3.22.5` | `<a>` mark with autolink, openOnClick=false, target/rel handling | D-05. External link sanitization via `HTMLAttributes: { target: '_blank', rel: 'nofollow noopener noreferrer' }` |
| `@tiptap/extension-image` | `3.22.5` | `<img>` node with `src`, `alt`, `title`, `width`, `height` attrs | D-05. We extend with `publicId` attr + `data-public-id` parseHTML/renderHTML pair (see §Tiptap integration patterns) |
| `@tiptap/extension-table` | `3.22.5` | Table node + `addColumn`/`addRow`/`deleteTable` commands | D-05 |
| `@tiptap/extension-table-row` | `3.22.5` | Table-row node | D-05 (peer of extension-table) |
| `@tiptap/extension-table-cell` | `3.22.5` | Table-cell node | D-05 (peer of extension-table) |
| `@tiptap/extension-table-header` | `3.22.5` | Table-header-cell node | D-05 (peer of extension-table) |
| `@tiptap/static-renderer` | `3.22.5` | Server-side JSON → HTML (RSC) | D-08. Public path. **No React peer; sync; pure string output** |

**Verified versions** [VERIFIED: npm registry, 2026-04-30 via `npm view <pkg> version`]:
- All 11 packages return `3.22.5` (consistent — Tiptap publishes in lockstep)
- `@tiptap/static-renderer@3.22.5`: published 3 days ago; deps: none (peers `@tiptap/core ^3.22.5`, `@tiptap/pm ^3.22.5`, `react ^19.0.0` only for the `*/react` subpath — `*/html-string` has no React import)
- Major upgrade from STACK.md "v2" — v2 is superseded; v3 ships breaking changes (Tiptap 3 unified extension system + `@tiptap/pm` re-export simplifies peers). Project STACK.md is stale; Phase 4 ships v3.

### Already-installed (carry-forward, no install needed)

| Library | Version | Purpose |
|---------|---------|---------|
| `next` | `16.2.4` | App Router + RSC + cacheComponents |
| `react`/`react-dom` | `19.1.0` | RSC + hooks |
| `next-cloudinary` | `6.17.5` | `<CldImage>` + `<CldUploadWidget>` reused for Tiptap image upload (paramsToSign protocol verified in plan 02-14) |
| `cloudinary` | `2.9.0` | Server-side `cloudinary.utils.api_sign_request` for signing endpoint |
| `next-intl` | `4.9.1` | Locale routing + `getTranslations` |
| `react-hook-form` | `7.73.1` | Recipe/industry form state |
| `@hookform/resolvers` | `3.10.0` | Zod resolver |
| `zod` | `4.3.6` | recipeInsertSchema + industryInsertSchema |
| `drizzle-orm` | `0.45.2` | Schema, queries, transactions, pgView |
| `drizzle-kit` | `0.31.10` | Migrations (`generate` + `migrate` — never `push` per Phase 1 D-09) |
| `drizzle-zod` | `0.8.3` | Schema → Zod base |
| `@tanstack/react-table` | `8.21.3` | Recipe/industry list tables (reuses Phase-2 DataTable) |
| `schema-dts` | `^2.0.0` | TypeScript types for JSON-LD (`WithContext<TechArticle>`) |
| `nuqs` | `2.8.9` | List-page filter URL state |
| `sonner` | `1.7.4` | Toast on save/publish/delete |
| `@base-ui/react` | `^1.4.1` | shadcn primitives backend (replaces `@radix-ui/*` per Phase 2 plan 02-02 — Combobox via Popover + Command primitives) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff (why we don't) |
|------------|-----------|-------------------------|
| `@tiptap/static-renderer` | `generateHTML` from `@tiptap/html` | Older path; requires JSDOM at runtime in some configurations; static-renderer is the explicit RSC-safe successor and dep-free [VERIFIED: dist/index.cjs has no jsdom imports] |
| Tiptap | Lexical | Lexical is more modern but has fewer table + image-upload third-party recipes; Tiptap's StarterKit + 6 official extensions match our scope precisely. Phase 1 STACK.md locked Tiptap [CITED: STACK.md:23,47] |
| Custom Tiptap image extension storing publicId | Default Image extension storing full URL | Storing URL in jsonb body would couple stored content to current `cloudinary.com/<account>/...` host — account migration breaks every recipe. Storing publicId means transformations (`f_auto,q_auto,w_auto`) and account moves are runtime concerns [CONTEXT D-06 LOCKED] |
| pgView `product_used_in_v` | Two reads against junctions in product-detail RSC | View saves one round-trip + lets the cacheTag attach to a single read; alternative is two reads tagged separately. **View recommended; planner may opt for two reads if migration friction outweighs** |
| Postgres CHECK constraint on status | New `publication_status` pgEnum | Phase 1 + 2 use plain text + CHECK [VERIFIED: drizzle/0001_overrated_shiva.sql:25-26 — `status text NOT NULL DEFAULT 'draft'` + CHECK constraint]. No `publication_status` pgEnum exists in `src/db/schema/`. Reusing the same pattern keeps schema homogeneous |
| Distinct AUDIT_ACTIONS verbs (`publish_recipe`, `delete_industry`) | Generic `publish` / `unpublish` / `delete` + entity_type discriminator | Phase 2 plan 02-13b shipped lifecycle for products with **generic verbs** [VERIFIED: src/lib/audit.ts:AUDIT_ACTIONS — only `publish`, `unpublish`, `delete`, plus discriminator-style `duplicate_product`/`rename_spec_field`/`soft_delete_spec_field`/`delete_spec_field`]. Following Phase 2 pattern: reuse generic verbs + discriminate via `entity_type: 'recipe' \| 'industry'`. CONTEXT D-03 wording ("`publish_recipe`/`unpublish_recipe`") conflates patterns; flag in §Open Questions |

### Installation Command

```bash
pnpm add @tiptap/core@3.22.5 @tiptap/pm@3.22.5 @tiptap/react@3.22.5 @tiptap/starter-kit@3.22.5 @tiptap/extension-link@3.22.5 @tiptap/extension-image@3.22.5 @tiptap/extension-table@3.22.5 @tiptap/extension-table-row@3.22.5 @tiptap/extension-table-cell@3.22.5 @tiptap/extension-table-header@3.22.5 @tiptap/static-renderer@3.22.5
```

Pin exact versions (no `^`) — Tiptap 3 publishes in lockstep; mismatched minors break extension loading.

## Schema Migration Sketch

**Migration name:** `0003_phase4_content_features.sql` (next free index after `0002_phase3_media_search_manufacturer.sql`)

**Approach:** Drizzle `generate` (NOT `push`) — additive only. Backfill data in same migration file (drizzle-kit generates DDL; data migrations are hand-authored within the migration file, exactly as plan 02-01 did per `drizzle/0001_overrated_shiva.sql:38`).

### Schema additions (Drizzle)

```typescript
// src/db/schema/recipes.ts — extend existing table definition
export const recipes = pgTable('recipe', {
  id: uuid().primaryKey().defaultRandom(),
  featuredImagePublicId: text('featured_image_public_id'),
  // NEW Phase 4: status + CHECK constraint, mirroring product.status (Phase 2 D-11).
  status: text('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('recipe_status_check', sql`${t.status} IN ('draft','published')`),
]);

// src/db/schema/industries.ts — same pattern, mirrored
// (see recipes.ts above with table name 'industry' + check constraint name 'industry_status_check')
```

### Junction tables (NEW files: `src/db/schema/junctions.ts`)

```typescript
import { pgTable, uuid, integer, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { products } from './products';
import { recipes } from './recipes';
import { industries } from './industries';

export const productRecipes = pgTable(
  'product_recipes',
  {
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.recipeId] }),
    index('product_recipes_recipe_idx').on(t.recipeId),    // forward query: recipe → products
    index('product_recipes_product_idx').on(t.productId),  // reverse query: product → recipes (Used in)
  ],
);

export const productIndustries = pgTable(
  'product_industries',
  {
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    industryId: uuid('industry_id').notNull().references(() => industries.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.industryId] }),
    index('product_industries_industry_idx').on(t.industryId),
    index('product_industries_product_idx').on(t.productId),
  ],
);
```

### Optional pgView (`src/db/schema/views/product-used-in.ts`)

```typescript
import { pgView, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const productUsedInView = pgView(
  'product_used_in_v',
  {
    productId: uuid('product_id').notNull(),
    contentType: text('content_type').notNull(),  // 'recipe' | 'industry'
    contentId: uuid('content_id').notNull(),
    locale: text('locale').notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt'),
    featuredImagePublicId: text('featured_image_public_id'),
    position: text('position').notNull(),  // text-cast for stable ORDER BY across content types
  },
).as(sql`
  SELECT pr.product_id,
         'recipe'::text AS content_type,
         r.id AS content_id,
         rt.locale,
         rt.title,
         rt.slug,
         rt.excerpt,
         r.featured_image_public_id,
         pr.position::text AS position
    FROM product_recipes pr
    JOIN recipe r ON r.id = pr.recipe_id
    JOIN recipe_translations rt ON rt.recipe_id = r.id
   WHERE r.status = 'published'
  UNION ALL
  SELECT pi.product_id,
         'industry'::text,
         i.id,
         it.locale,
         it.title,
         it.slug,
         it.excerpt,
         i.featured_image_public_id,
         pi.position::text
    FROM product_industries pi
    JOIN industry i ON i.id = pi.industry_id
    JOIN industry_translations it ON it.industry_id = i.id
   WHERE i.status = 'published'
`);
```

> The view filters at `status='published'` — public RSCs CANNOT leak draft content via this view by construction (defense-in-depth). Same posture as `product_translation_completeness` from plan 02-01 [CITED: src/db/schema/views/product-translation-completeness.ts:16-64].

### Migration SQL (hand-authored body)

```sql
-- 0003_phase4_content_features.sql

-- Status columns + CHECKs (mirrors product.status from migration 0001)
ALTER TABLE "recipe" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
UPDATE "recipe" SET "status" = CASE WHEN published_at IS NOT NULL THEN 'published' ELSE 'draft' END;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_status_check" CHECK ("recipe"."status" IN ('draft','published'));--> statement-breakpoint

ALTER TABLE "industry" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
UPDATE "industry" SET "status" = CASE WHEN published_at IS NOT NULL THEN 'published' ELSE 'draft' END;--> statement-breakpoint
ALTER TABLE "industry" ADD CONSTRAINT "industry_status_check" CHECK ("industry"."status" IN ('draft','published'));--> statement-breakpoint

-- Junction tables
CREATE TABLE "product_recipes" (
  "product_id" uuid NOT NULL,
  "recipe_id" uuid NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_recipes_pk" PRIMARY KEY ("product_id","recipe_id")
);--> statement-breakpoint
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_fk"
  FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_recipe_id_fk"
  FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX "product_recipes_recipe_idx" ON "product_recipes" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "product_recipes_product_idx" ON "product_recipes" USING btree ("product_id");--> statement-breakpoint

CREATE TABLE "product_industries" (
  "product_id" uuid NOT NULL,
  "industry_id" uuid NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_industries_pk" PRIMARY KEY ("product_id","industry_id")
);--> statement-breakpoint
ALTER TABLE "product_industries" ADD CONSTRAINT "product_industries_product_id_fk"
  FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_industries" ADD CONSTRAINT "product_industries_industry_id_fk"
  FOREIGN KEY ("industry_id") REFERENCES "public"."industry"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX "product_industries_industry_idx" ON "product_industries" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX "product_industries_product_idx" ON "product_industries" USING btree ("product_id");--> statement-breakpoint

-- Optional pgView (sketch above)
CREATE VIEW "public"."product_used_in_v" AS (...);
```

**Backfill verbs:** Existing recipe/industry rows have `published_at` set or NULL. Backfill: `published_at IS NOT NULL → 'published'`, else `'draft'`. Same exact CASE expression Phase 2 used.

**Verification harness:** Reuse `scripts/verify-02-01-migration.ts` Drizzle/Neon HTTP `db.execute(sql\`...\`)` pattern from plan 02-01 [CITED: STATE.md:117]. Specs to verify post-migration:
- `recipe.status` column exists, NOT NULL, DEFAULT `'draft'`, CHECK constraint present
- `industry.status` same
- `product_recipes` and `product_industries` tables exist with PK + 2 indices each + 2 FKs each (cascade)
- View `product_used_in_v` exists and is queryable (`SELECT 1 FROM product_used_in_v LIMIT 0`)
- Backfill applied correctly: count of rows with `status='published'` matches count of rows with `published_at IS NOT NULL` pre-migration

## Tiptap Integration Patterns

### Admin editor (client) — canonical wiring

**File:** `src/components/admin/recipe-body-editor.tsx` (mirror for `industry-body-editor.tsx`)

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Controller, useFormContext } from 'react-hook-form';
import { CldUploadWidget } from 'next-cloudinary';
import type { JSONContent } from '@tiptap/core';

// Extend Image to store public_id alongside src.
// parseHTML reads data-public-id from existing rendered HTML; renderHTML
// emits it back. The actual src on stored content is irrelevant — public
// RSC walks the JSON tree directly and renders <CldImage publicId={...}>
// per image node (NOT static-renderer's <img>).
const CloudinaryImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      publicId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-public-id'),
        renderHTML: (attrs: { publicId?: string | null }) =>
          attrs.publicId ? { 'data-public-id': attrs.publicId } : {},
      },
    };
  },
});

const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] }, // D-05: H1 reserved for page title; editor uses H2-H4
    codeBlock: false,                  // D-05 defers code-block syntax highlighting
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { target: '_blank', rel: 'nofollow noopener noreferrer' }, // T-04-XX-01 mitigation
  }),
  CloudinaryImage,
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
];

export function RecipeBodyEditor({ name }: { name: 'body.uz' | 'body.ru' | 'body.en' }) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <RecipeBodyEditorInner
          value={field.value as JSONContent | null}
          onChange={field.onChange}
        />
      )}
    />
  );
}

function RecipeBodyEditorInner({
  value,
  onChange,
}: {
  value: JSONContent | null;
  onChange: (json: JSONContent) => void;
}) {
  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: value ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false, // CRITICAL: avoids RSC hydration mismatch (Pitfall #16)
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });
  if (!editor) return null;
  return (
    <div className="rounded border">
      <BubbleToolbar editor={editor} />
      <EditorContent editor={editor} className="prose prose-slate p-4 min-h-[300px]" />
      <CldUploadWidget
        signatureEndpoint="/api/cloudinary/sign"
        uploadPreset={undefined}
        options={{ folder: 'recipes', resourceType: 'image' }}
        onSuccess={(result) => {
          if (typeof result === 'object' && result.info && typeof result.info === 'object') {
            const info = result.info as { public_id: string };
            editor.chain().focus().insertContent({
              type: 'image',
              attrs: { publicId: info.public_id, alt: '' },
            }).run();
          }
        }}
      >
        {({ open }) => (
          <button type="button" onClick={() => open?.()}>
            Insert image
          </button>
        )}
      </CldUploadWidget>
    </div>
  );
}
```

**Recommendation pattern (a) vs (b):** Pattern (b) — custom Image extension with `publicId` attribute. The CldUploadWidget returns `info.public_id`; we insertContent a node with `attrs.publicId`. The Tiptap `src` attribute can be set to anything (or empty) since the static-renderer is bypassed for image nodes (see public RSC pattern below). Pattern (a) — using full URL — is rejected because it couples stored body to current Cloudinary account host.

### Public path: walk JSON tree, render image nodes via `<CldImage>`

`@tiptap/static-renderer` would emit a plain `<img src="...">` for image nodes — but our jsonb stores `publicId`, not URL. Two options:

1. **Configure static-renderer with custom node mapping** — pass a `nodeMapping` for `image` that emits the Cloudinary URL via `getCldImageUrl({ src: attrs.publicId, width, format: 'auto', quality: 'auto' })`.
2. **Walk the JSON tree manually** — the public RSC traverses the `JSONContent` tree, emits `<CldImage>` for image nodes, calls `renderToHTMLString` only for non-image subtrees.

**Recommendation: option (1).** Cleaner — single render call. Use the renderer's `nodeMapping` override:

```typescript
// src/lib/tiptap-render.ts (NEW)
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string';
import { getCldImageUrl } from 'next-cloudinary';
import type { JSONContent } from '@tiptap/core';
import { TIPTAP_EXTENSIONS } from './tiptap-extensions';

export function renderTiptapToHtml(doc: JSONContent): string {
  return renderToHTMLString({
    extensions: TIPTAP_EXTENSIONS,
    content: doc,
    options: {
      // Built-in fallback for unknown nodes — defense in depth (T-04-XX-01).
      // Renders unknown nodes as empty fragments so a stale doc with a
      // disabled extension doesn't throw at render time.
      unhandledNode: () => '',
      unhandledMark: () => '',
      // Override the image node to emit a Cloudinary URL via getCldImageUrl,
      // not the bare src. Width fixed at 1200; <CldImage> can't be inlined
      // in the HTML string output. Add loading=lazy to avoid LCP impact
      // (the page hero image is the recipe.featuredImagePublicId, not body images).
      nodeMapping: {
        image: ({ node }) => {
          const publicId = node.attrs?.publicId;
          if (!publicId) return '';
          const src = getCldImageUrl({ src: publicId, width: 1200, format: 'auto', quality: 'auto' });
          const alt = String(node.attrs?.alt ?? '');
          // Browser-native escape: getCldImageUrl returns a safe URL; alt is escaped via attribute escape.
          return `<img src="${src}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" />`;
        },
      },
    },
  });
}
```

[CITED: dist/pm/html-string/index.d.ts:103-107 — `renderToHTMLString({ content, extensions, options }): string`]
[CITED: dist/pm/html-string/index.js — `function escapeHTML(value)` and `function escapeHTMLAttribute(value)` already escape `&`, `<`, `>`, `"` for all text and attribute values at render time]

The shared `TIPTAP_EXTENSIONS` array MUST be importable from BOTH the admin client and the public RSC — extract to `src/lib/tiptap-extensions.ts` (no `'use client'` directive — pure data; React-free).

### Static-renderer security model

[VERIFIED: dist/pm/html-string/index.js source-read]:

1. **Built-in HTML escape** — every text node and every attribute value flows through `escapeHTML` (`&`/`<`/`>`) and `escapeHTMLAttribute` (additionally `"`). This is automatic; we get this for free for body content (no DOMPurify needed for body text and attrs).
2. **Allow-list by extension array** — if a node type appears in stored JSON but NOT in `extensions[]`, the renderer **throws** by default. Setting `unhandledNode: () => ''` softens to silent drop. **This IS our XSS allow-list** — there is no way to inject `<script>` because `script` is not a registered node type in our extension list.
3. **Mark renderHTML** controls — a malicious admin token writing a custom `mark` type is dropped (no extension matches). Standard mark types render via the extension's locked `renderHTML` method.
4. **Apostrophe `'` is NOT escaped** — escapeHTMLAttribute escapes `"` only. Adequate when attribute values use double-quote delimiters (always the case in static-renderer output) but worth noting if downstream code re-templates the HTML.

**Conclusion: no DOMPurify needed.** The combination of (1) the locked extension allow-list and (2) Tiptap's built-in attribute/text escaping is the XSS defense. The Phase 3 `\\u003c` escape pattern still applies to JSON-LD scripts — that's a separate sink (script-element-context vs body-context).

### Tiptap image upload — wiring with Phase 2 paramsToSign protocol

The `<CldUploadWidget>` component shipped with `next-cloudinary` 6.17.5 calls `signatureEndpoint` with a POST body of `{ paramsToSign: { folder: 'recipes', timestamp: ..., upload_preset?: ... } }` and reads `result.signature` from the response. **This protocol is identical to plan 02-14's Cloudinary signing fix** [CITED: src/app/api/cloudinary/sign/route.ts widget branch + 02-14-SUMMARY.md]. No new endpoint or new code path needed — pass `options={{ folder: 'recipes' }}` and the widget + endpoint already work end-to-end.

The folder allow-list in `/api/cloudinary/sign` MUST be extended to include `'recipes'` and `'industries'` (currently allows `'manufacturers'`, `'products'`). One-line edit. T-CLD-02 mitigation preserved.

### Drizzle jsonb body field type narrowing

```typescript
// Current shape (Phase 1):
body: jsonb(),  // unknown

// Recommended (Phase 4):
import type { JSONContent } from '@tiptap/core';
body: jsonb().$type<JSONContent>(),  // typed as Tiptap document
```

`drizzle-orm` `jsonb<T>().$type<T>()` is the canonical type-narrowing API [VERIFIED: drizzle-orm 0.45.2 docs]. Apply to both `recipe_translations.body` and `industry_translations.body`.

### Translation completeness for Tiptap doc

The body field counts toward translation completeness (Claude's discretion). Heuristic:

```typescript
function isTiptapDocFilled(doc: JSONContent | null): boolean {
  if (!doc || !doc.content || doc.content.length === 0) return false;
  // A doc with only an empty paragraph is "empty" — Tiptap's default content.
  const onlyEmptyParas = doc.content.every(
    (n) => n.type === 'paragraph' && (!n.content || n.content.length === 0),
  );
  return !onlyEmptyParas;
}
```

The recipe/industry equivalent of `product_translation_completeness` pgView is OUT OF SCOPE for Phase 4 v1 — translation completeness for these tables is computed in JS by the helper above, not as a pgView. Reason: only 5 fields per locale (title, slug, excerpt, body) — denominator is small enough that JS is fine; the existing pgView pattern is an optimization for the larger product schema.

## TechArticle JSON-LD Field Set

[CITED: schema.org/TechArticle inherits from Article → CreativeWork → Thing]

### `techArticleJsonLd(article, locale)` — proposed signature

Extends `src/lib/jsonld.ts` (current 4 helpers shipped at lines 32-91 — Product, Organization, BreadcrumbList, CollectionPage). Add a 5th:

```typescript
import type { TechArticle, WithContext, Organization } from 'schema-dts';

export interface TechArticleJsonLdInput {
  headline: string;
  excerpt?: string | null;
  featuredImagePublicId?: string | null;
  datePublished: string;       // ISO 8601 — recipe.publishedAt
  dateModified: string;        // ISO 8601 — recipe.updatedAt
  inLanguage: 'uz' | 'ru' | 'en';
  canonicalUrl: string;        // e.g. https://manometr.uz/uz/recipes/<slug>
  // Optional: linked products (D-10 mentions array)
  mentions?: Array<{ name: string; url: string }>;
}

export function techArticleJsonLd(input: TechArticleJsonLdInput): WithContext<TechArticle> {
  const publisher: Organization = { '@type': 'Organization', name: 'Manometr', url: HOST };
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: input.headline,
    inLanguage: input.inLanguage,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: publisher,        // Manometr Organization is the author for v1
    publisher,                // and the publisher
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.canonicalUrl },
    ...(input.excerpt ? { description: input.excerpt } : {}),
    ...(input.featuredImagePublicId
      ? { image: `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,w_1200/${input.featuredImagePublicId}` }
      : {}),
    ...(input.mentions && input.mentions.length > 0
      ? {
          mentions: input.mentions.map((m) => ({
            '@type': 'Product',
            name: m.name,
            url: m.url,
          })),
        }
      : {}),
  };
}
```

### Required vs recommended fields

[CITED: developers.google.com/search/docs/appearance/structured-data/article — "There are no required properties; instead, add the properties that apply to your content"]

**Recommended** (Google's Rich Results acceptance criteria for Article + subtypes):

| Property | Used | Source |
|----------|------|--------|
| `headline` | ✓ | recipe_translations.title for current locale (after fallback cascade D-07) |
| `image` | ✓ when featuredImagePublicId set | Cloudinary URL via `f_auto,q_auto,w_1200` (matches Phase 3 productJsonLd at jsonld.ts:41) |
| `datePublished` | ✓ | recipe.publishedAt (always present for status='published'; required gate enforced at saveRecipe lifecycle) |
| `dateModified` | ✓ | recipe.updatedAt (default-on-write) |
| `author` | ✓ | Manometr Organization sub-object (v1 single-author posture) |
| `publisher` | ✓ | Same Organization |
| `inLanguage` | ✓ | Current locale |
| `mainEntityOfPage` | ✓ | Per-locale canonical URL [matches Phase 3 SEO-02] |
| `description` | ✓ when excerpt set | recipe_translations.excerpt |
| `mentions` | optional | D-10 — array of linked products' canonical URLs [TechArticle inherits this from CreativeWork] |

**TechArticle-specific fields** (`dependencies`, `proficiencyLevel`) are NOT used in v1 — would require admin UI surface for capturing them; out of scope.

### Industry as TechArticle vs Article

**[ASSUMED — needs user confirmation]**: Schema.org defines TechArticle as "How-to (task) topics, step-by-step, procedural troubleshooting, specifications, etc." Industry vertical landing pages (oil & gas, food processing, pharma) are **not** how-to content — they are landing pages with cross-links. Strictly speaking, `Article` would be the right type for industries.

**However:**
- Google's Rich Results Test treats TechArticle as a subtype of Article and validates against the same recommended-property set
- Using `TechArticle` for both keeps a single helper, single test surface, single mental model
- D-10 LOCKED at user level: "Both recipes and industries emit TechArticle JSON-LD"

**Risk:** Yandex's structured-data parser (Phase 1 STACK.md notes Yandex matters) MAY scope TechArticle more strictly than Google. If post-launch Yandex Webmaster shows "structured data type mismatch" for industry pages, switching to `Article` is a 1-line `'@type'` change and a docs note. Defer to manual gate post-launch (Rich Results Test for both Google + Yandex Webmaster).

### XSS escape pattern (carry-forward from Phase 3 D-09)

```typescript
// src/app/[locale]/recipes/[slug]/page.tsx (NEW)
const articleLd = techArticleJsonLd({...});
const ldEsc = (obj: unknown) => JSON.stringify(obj).replace(/</g, '\\u003c');
return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: ldEsc(articleLd) }}
    />
    {/* page body */}
  </>
);
```

[VERIFIED: src/app/[locale]/products/[slug]/page.tsx:108 — same pattern shipped Phase 3]

This closes T-04-JSONLD-XSS verbatim. The pattern's strictness comes from JSON.stringify NOT escaping `<` in string values — a recipe headline like `"</script><script>alert(1)</script>"` would otherwise break out of the script element. The replace `</g` (matches all `<`) → `\\u003c` (Unicode-escaped less-than) fixes this; JSON parsers re-decode `\\u003c` to `<` so the structured-data semantics are preserved.

## "Used in" Reverse Query Strategy

### Recommendation: single read against pgView

```typescript
// src/lib/used-in.ts (NEW)
import { eq, and } from 'drizzle-orm';
import { cacheTag, cacheLife } from 'next/cache';
import { db } from '@/db/client';
import { productUsedInView } from '@/db/schema';

export interface UsedInItem {
  type: 'recipe' | 'industry';
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImagePublicId: string | null;
}

export async function getUsedInForProduct(
  productId: string,
  locale: 'uz' | 'ru' | 'en',
): Promise<{ recipes: UsedInItem[]; industries: UsedInItem[] }> {
  'use cache';
  cacheLife('max');
  cacheTag(`used-in:${productId}`);

  const rows = await db
    .select({
      type: productUsedInView.contentType,
      id: productUsedInView.contentId,
      title: productUsedInView.title,
      slug: productUsedInView.slug,
      excerpt: productUsedInView.excerpt,
      featuredImagePublicId: productUsedInView.featuredImagePublicId,
      position: productUsedInView.position,
    })
    .from(productUsedInView)
    .where(
      and(
        eq(productUsedInView.productId, productId),
        eq(productUsedInView.locale, locale),
      ),
    );

  // Apply locale fallback cascade (D-07): if current locale row missing for
  // a given content_id, fall back to uz, then ru, then en. Implementation
  // detail — left to the planner. For v1 ≤200 published items, a 4-query
  // cascade in JS is fine; the optimization is to materialize the cascade
  // in the view itself by using DISTINCT ON (content_type, content_id) over
  // a locale-priority CASE.

  const recipes: UsedInItem[] = [];
  const industries: UsedInItem[] = [];
  for (const r of rows) {
    const item: UsedInItem = {
      type: r.type as 'recipe' | 'industry',
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      featuredImagePublicId: r.featuredImagePublicId,
    };
    if (r.type === 'recipe') recipes.push(item);
    else industries.push(item);
  }
  // D-09: cap at 6 per type
  return { recipes: recipes.slice(0, 6), industries: industries.slice(0, 6) };
}
```

### Cache-tag invalidation strategy

Every mutation that affects `product_recipes` or `product_industries` rows MUST call `revalidateUsedIn(productId)` for EACH affected product after tx.commit. This includes:
- `saveRecipe` (replace-on-save: union of old + new linked productIds)
- `deleteRecipe` (cascade drops junction rows; pre-tx capture of productIds)
- `publishRecipe` / `unpublishRecipe` (changes visibility; affects every product the recipe links to)
- Same 4 mutations on industry side

Extension to `src/lib/revalidation.ts`:

```typescript
/** Recipe mutation — recipe detail + recipes list + sitemap. */
export async function revalidateRecipe(id: string, locales: ('uz' | 'ru' | 'en')[] = ['uz','ru','en']): Promise<void> {
  await tag(`recipe:${id}`);
  for (const l of locales) await tag(`recipes:list:${l}`);
  await tag('sitemap');
}

/** Industry mutation — same shape. */
export async function revalidateIndustry(id: string, locales: ('uz' | 'ru' | 'en')[] = ['uz','ru','en']): Promise<void> {
  await tag(`industry:${id}`);
  for (const l of locales) await tag(`industries:list:${l}`);
  await tag('sitemap');
}

/** Junction-table mutation on either side — invalidates the product's "Used in" cached read. */
export async function revalidateUsedIn(productId: string): Promise<void> {
  await tag(`used-in:${productId}`);
  await tag(`product:${productId}`);  // page-level so the surrounding spec/manufacturer/used-in composes fresh
}
```

## Linked-products Picker

### Recommendation: shadcn Combobox (Popover + Command)

For v1 scale (≤200 published products), client-side filter is sufficient. shadcn/ui's Combobox recipe pairs `<Popover>` with `<Command>` (cmdk-driven). Pattern:

```typescript
// src/components/admin/linked-products-picker.tsx (NEW)
'use client';
import * as React from 'react';
import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { Button } from '@/components/ui/button';

export interface ProductOption { id: string; name: string; sku: string | null; }

export function LinkedProductsPicker({
  options,         // pre-fetched from RSC parent — published products in current locale
}: { options: ProductOption[] }) {
  const { control, watch, setValue } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'linkedProductIds' });
  // ...client-side text filter, multi-select, drag reorder via @dnd-kit (already installed)
}
```

**Why not server-paginated:** at ≤200 products, the products list ships in <5KB. Pagination + URL-state via `nuqs` is over-engineering. If product count grows past ~1000, swap to a server-side `/api/admin/products/search?q=...` endpoint — but that's a v2 concern.

**Reuse pattern:** Phase 2 spec-values-editor at `src/components/admin/spec-values-editor.tsx:155-179` uses a plain `<select>` with `availableSpecFields` pre-fetched in the RSC parent (`/admin/products/[id]/edit/page.tsx`). Linked-products picker follows the same shape — RSC fetches `options`, client component receives via props, RHF controls value array.

**Drag-reorder:** Use `@dnd-kit/core` + `@dnd-kit/sortable` (already installed for `MediaUploader`). Position-aware reorder writes `position: index` on each row at save time.

### Form shape (Zod)

```typescript
// src/lib/zod/recipe.ts (NEW)
export const recipeInsertSchema = z.object({
  id: z.string().uuid().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.string().datetime().nullable().default(null),
  featuredImagePublicId: z.string().nullable().default(null),
  translations: z.object({
    uz: z.object({ title: z.string().min(1), slug: z.string().min(1), excerpt: z.string().nullable(), body: z.unknown() }),
    ru: z.object({ title: z.string().min(1), slug: z.string().min(1), excerpt: z.string().nullable(), body: z.unknown() }),
    en: z.object({ title: z.string().min(1), slug: z.string().min(1), excerpt: z.string().nullable(), body: z.unknown() }),
  }),
  linkedProductIds: z.array(z.object({
    productId: z.string().uuid(),
    position: z.number().int().nonnegative(),
  })).default([]),
});
export type RecipeInput = z.infer<typeof recipeInsertSchema>;
```

(Mirror for `industryInsertSchema`.)

### saveRecipe — 5-step transaction shape (mirrors saveProduct from 02-13a)

[CITED: src/actions/products.ts:1-100 — saveProduct universal shape]

```
withAdminAction(async (input) => {
  const validated = recipeInsertSchema.parse(input);
  // Pre-tx snapshot read for audit before_json + W7 refusal-to-elevate guard
  const before = validated.id ? await db.query.recipes.findFirst({ where: eq(recipes.id, validated.id) }) : null;
  if (before && before.status !== validated.status) throw new Error('USE_PUBLISH_ACTION');

  const result = await dbTx.transaction(async (tx) => {
    // Step 1: INSERT or UPDATE recipe base row (status verbatim from input)
    const [recipe] = await tx.insert(recipes).values({...}).onConflictDoUpdate({...}).returning();
    // Step 2: Loop uz/ru/en — INSERT recipe_translations ON CONFLICT DO UPDATE
    for (const locale of LOCALES) await tx.insert(recipeTranslations).values({...}).onConflictDoUpdate({...});
    // Step 3: DELETE all product_recipes for this recipe, then INSERT new array (replace-on-save)
    await tx.delete(productRecipes).where(eq(productRecipes.recipeId, recipe.id));
    if (validated.linkedProductIds.length > 0) {
      await tx.insert(productRecipes).values(validated.linkedProductIds.map((p) => ({...})));
    }
    // Step 4: logAudit
    await logAudit(tx, { action: 'create' or 'update', entityType: 'recipe', entityId: recipe.id, before, after: ... });
    return recipe;
  });

  // After tx.commit (Pitfall #2):
  await revalidateRecipe(result.id);
  // Capture union of old + new linked productIds for "Used in" invalidation:
  const affectedProductIds = new Set([...oldLinkedProductIds, ...validated.linkedProductIds.map(p => p.productId)]);
  for (const pid of affectedProductIds) await revalidateUsedIn(pid);
  return { ok: true, id: result.id };
});
```

`publishRecipe(id)` and `unpublishRecipe(id)` follow the lifecycle pattern from 02-13b verbatim — atomic dual-column write of `status + publishedAt` in ONE SET clause + audit + revalidate fan-out.

`deleteRecipe(id)` audits BEFORE the DELETE inside tx; FK cascade drops `recipe_translations` + `product_recipes`. After tx.commit: `revalidateRecipe(id)` + iterate captured `productIds` calling `revalidateUsedIn(pid)`.

## Threat Model (STRIDE)

| Threat ID | Category | Component | Severity | Disposition | Mitigation |
|-----------|----------|-----------|----------|-------------|-----------|
| T-04-XSS-01 | XSS | Tiptap body rendered to HTML on public page | HIGH | mitigate | Static-renderer locked extension allow-list + built-in `escapeHTML`/`escapeHTMLAttribute` for text + attrs [VERIFIED: dist/pm/html-string/index.js]; `unhandledNode: () => ''` softens unknown-node throw to silent drop (defense-in-depth — a stale doc with an extension we removed renders empty rather than crashing the page) |
| T-04-XSS-02 | XSS | TechArticle JSON-LD `<script>` substring in headline / excerpt / mentions | HIGH | mitigate | `JSON.stringify(obj).replace(/</g, '\\u003c')` per Phase 3 D-09 [CITED: src/app/[locale]/products/[slug]/page.tsx:108-109] |
| T-04-XSS-03 | XSS | Tiptap link mark with `javascript:` URL | MEDIUM | mitigate | `@tiptap/extension-link` configured with `protocols: ['http','https','mailto','tel']` allow-list (Tiptap default rejects `javascript:`); HTMLAttributes adds `rel='nofollow noopener noreferrer'` to every link |
| T-04-XSS-04 | XSS | Tiptap image extension with `data:` URI src | MEDIUM | mitigate | Custom `CloudinaryImage` extension stores `publicId` (not URL); public RSC emits Cloudinary URL via `getCldImageUrl`. `data:` URIs are never rendered — even if an admin's stored JSON contains a `src: 'data:image/svg+xml...'`, the public path drops it because `nodeMapping.image` reads only `attrs.publicId` |
| T-04-SSRF-01 | SSRF | Tiptap image upload signing endpoint (`/api/cloudinary/sign`) accepting attacker-controlled folder | HIGH | mitigate | FOLDER_ALLOWLIST gate in `/api/cloudinary/sign` (T-CLD-02 from Phase 2) — extend allow-list with `'recipes'` + `'industries'`. `withAdminAction` requires admin session [CITED: src/lib/server-action.ts]; no anonymous signing |
| T-04-AUTH-01 | Spoofing | Unauthenticated saveRecipe / saveIndustry / publish / unpublish / delete / link-product call | HIGH | mitigate | All Server Actions wrap `withAdminAction` (admin session required). Same posture as Phase 2 — verified by structural absence of any actions module not wrapped |
| T-04-INFO-01 | Information Disclosure | Public reads serving draft recipes/industries | HIGH | mitigate | Every public read site enforces `WHERE status = 'published'` — verified at: `getRecipeBySlug`, `getIndustryBySlug`, `findRecipesList`, `findIndustriesList`, `product_used_in_v` view (`WHERE r.status = 'published'` + `WHERE i.status = 'published'` baked into the UNION). Sitemap helpers similarly filter [Phase 3 D-08 carry-forward] |
| T-04-INFO-02 | Information Disclosure | hreflang exposing missing-locale slug returning 404 | MEDIUM | mitigate | `buildAlternates({ slugByLocale })` with null-locale slugs OMITTED [Phase 3 carry-forward — src/lib/i18n.ts buildAlternates] |
| T-04-TAMP-01 | Tampering | Locale param injection on public route `/[locale]/recipes/[slug]` | MEDIUM | mitigate | `if (!hasLocale(routing.locales, locale)) notFound()` at the layout level [Phase 3 carry-forward — src/app/[locale]/layout.tsx:52] |
| T-04-TAMP-02 | Tampering | slug param SQL injection in recipe/industry resolver | MEDIUM | mitigate | Drizzle parameterized eq (no string concatenation); same posture as Phase 3 product-detail [VERIFIED: src/lib/product-detail.ts:168 uses `eq(...)` not `sql\`...\${slug}\``] |
| T-04-TAMP-03 | Tampering | Slug squatting via locale-translation create (admin enters `slug='admin'` for ru — collides with `/ru/admin`) | LOW | mitigate | Per-locale unique index on `recipe_translations(locale, slug)` (already shipped Phase 1); reserved-prefix check in `recipeInsertSchema` (denylist `/admin`, `/api`, `/_next`) — small ZOD refinement, planner adds |
| T-04-TAMP-04 | Tampering | Junction-table cross-tenant linkage | N/A | accept | Manometr is single-tenant per Phase 2 D-15 + Phase 3 T-03-07-03; every admin has full link/unlink rights |
| T-04-DOS-01 | DoS | Tiptap body with thousands of nodes (renderer recursion / output size) | LOW | accept | v1 trust posture: only invited admins author content. Recipe/industry doc size bounded by author intent. Re-evaluate Phase 5 if abuse appears (cap on `JSON.stringify(body).length` at save-time) |
| T-04-DOS-02 | DoS | Cloudinary signing endpoint hammered by stolen admin token | LOW | accept | `withAdminAction` rejects anonymous; admin session expires 24h idle / 7d absolute; audit_log captures every sign request via the wrapping action's audit row. Rate limit deferred to Phase 5 (same disposition as T-03-06-04) |
| T-04-NREP-01 | Repudiation | Admin denies publishing a recipe that contained defamatory content | LOW | mitigate | `audit_log` writes BEFORE state + AFTER state on every publishRecipe / unpublishRecipe / saveRecipe / deleteRecipe call. Includes Tiptap doc snapshots in before_json / after_json (large but bounded by content size) |

### ASVS Categories Applicable

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (admin only) | Auth.js v5 magic-link (Phase 1 + 2) — carry-forward |
| V3 Session Management | yes (admin only) | 24h idle / 7d absolute caps, sessions table — carry-forward |
| V4 Access Control | yes | `withAdminAction` wrapper on every mutation; no per-row ACL (single-tenant per Phase 2 D-15) |
| V5 Input Validation | yes | Zod schemas (`recipeInsertSchema`, `industryInsertSchema`); locale enum at route + API level |
| V6 Cryptography | no (carry-forward) | Cloudinary signature uses `cloudinary.utils.api_sign_request` — never hand-roll [Pitfall #5] |
| V7 Error Handling | yes (carry-forward) | `withAdminAction` returns `{ ok:false, error:'unknown' }` on Postgres errors — no schema leakage |

## Plan Structure Recommendation

### Wave 0 — Test stubs + foundations (BLOCKING for all subsequent waves)

**Plan 04-01 — SCHEMA-MIGRATION (BLOCKING):** Migration 0003. Adds status columns + 2 junction tables + pgView. Hand-authored backfill SQL inside the migration file. Drizzle schema files updated for `recipes` (add status), `industries` (add status), `productRecipes` (NEW), `productIndustries` (NEW), `productUsedInView` (NEW). Verification harness `scripts/verify-04-01-migration.ts` (mirrors plan 02-01). 7-spec test file `tests/db/phase4-migration.test.ts` covering: status backfill correctness, junction PK + indices, FK cascades, view queryability. Exit gate: `pnpm tsc --noEmit` clean + verify script PASS + 7 specs green.

**Plan 04-02 — TIPTAP-DEPS-AND-EXTENSIONS:** Install all 11 Tiptap packages pinned to 3.22.5. Author `src/lib/tiptap-extensions.ts` with the locked extension list (used by both admin + public). Author `src/lib/tiptap-render.ts` with `renderTiptapToHtml()` wrapping static-renderer + nodeMapping override for image. Extend `/api/cloudinary/sign` FOLDER_ALLOWLIST with `'recipes'` + `'industries'`. 1 unit test asserting `renderTiptapToHtml({ type: 'doc', content: [...] })` returns escaped HTML for malicious-text fixture. Exit gate: tsc clean + 1 spec green.

**Plan 04-03 — LIB-HELPERS:**
- Extend `src/lib/jsonld.ts` with `techArticleJsonLd` helper (10-line addition, mirror of `productJsonLd` shape). 3 unit tests (recipe, industry, with mentions array).
- Extend `src/lib/revalidation.ts` with `revalidateRecipe` + `revalidateIndustry` + `revalidateUsedIn` (~20 lines).
- Author `src/lib/used-in.ts` with `getUsedInForProduct()` (50 lines, single read against pgView with cacheTag).
- Author `src/lib/zod/recipe.ts` + `src/lib/zod/industry.ts` (recipeInsertSchema + industryInsertSchema).
- Author `src/lib/recipe-public.ts` + `src/lib/industry-public.ts` (RSC data-fetch helpers — `getRecipeBySlug`, `findPublishedRecipes`, with Phase 3 D-05 fallback cascade). Mirrors `src/lib/product-detail.ts` shape.
- Test stubs (RED) added for every helper.

**Plan 04-04 — SEED-FIXTURES-AND-WAVE-0-TESTS:** Extend `tests/fixtures/seed-public.ts` with seed-recipe + seed-industry helpers + 2 published recipes + 2 published industries + linked products (use existing 6 products from Phase 3 seed). Author Wave-0 e2e test stubs (RED): `tests/e2e/recipe-detail.spec.ts`, `tests/e2e/industry-detail.spec.ts`, `tests/e2e/used-in-section.spec.ts`, `tests/e2e/admin-recipe-form.spec.ts`. All marked `test.fixme` — flipped to live as features land.

### Wave 1 — Server Actions (depends on Wave 0)

**Plan 04-05 — RECIPES-ACTIONS:** `saveRecipe` 5-step transaction + `publishRecipe`/`unpublishRecipe`/`deleteRecipe` lifecycle (mirrors 02-13a + 02-13b). 7-spec test in `tests/actions/recipes.test.ts` (live-Neon).

**Plan 04-06 — INDUSTRIES-ACTIONS:** Same as 04-05 mirrored for industries. 7-spec test.

(These two could merge into one plan if executor velocity demands it; keep separate for tighter test scoping.)

### Wave 2 — Admin UI (depends on Wave 1)

**Plan 04-07 — ADMIN-RECIPES-UI:** `RecipeBodyEditor` client component + `LinkedProductsPicker` + recipe form (3-locale tabs swapping title/slug/excerpt/body/MT-flags) + recipes list page + new/edit pages. Reuses `<LocaleTabs>`, `<SlugInput>`, `<MediaUploader>`, `<TranslationCompleteness>`, `<ConfirmDialog>` verbatim from Phase 2. ~5 admin route files + 2 client primitives.

**Plan 04-08 — ADMIN-INDUSTRIES-UI:** Same shape mirrored.

### Wave 3 — Public RSC (depends on Wave 1)

**Plan 04-09 — PUBLIC-RECIPES-PAGES:** `/[locale]/recipes` (list) + `/[locale]/recipes/[slug]` (detail with Tiptap static-render + TechArticle JSON-LD + locale fallback banner + buildAlternates + breadcrumbs). Sitemap helpers extended.

**Plan 04-10 — PUBLIC-INDUSTRIES-PAGES:** Mirror.

**Plan 04-11 — PRODUCT-DETAIL-USED-IN-INTEGRATION:** Mounts `<UsedInSection>` server component into `src/app/[locale]/products/[slug]/page.tsx` between `<SpecTable>` and `<ManufacturerCard>`. Reads from `getUsedInForProduct(productId, locale)`. Two card grids per D-09. Hidden when 0 cross-links.

### Wave 4 — Closure

**Plan 04-12 — VERIFICATION-AND-RICH-RESULTS-GATE:** Flips Wave-0 e2e stubs from fixme to live. Manual gate: TechArticle Rich Results Test against Vercel preview for one recipe + one industry URL per locale (DEF-4-12-01 closed-with-deferred-validation per Phase 3 SEO closure pattern). Exit gate: full suite green + Vercel-preview e2e green.

### Dependency graph

```
04-01 SCHEMA (BLOCKING)
  └─ 04-02 TIPTAP-DEPS
       └─ 04-03 LIB-HELPERS
            └─ 04-04 SEED-FIXTURES
                 ├─ 04-05 RECIPES-ACTIONS ──┐
                 ├─ 04-06 INDUSTRIES-ACTIONS ┤
                 │                            ├─ 04-07 ADMIN-RECIPES-UI
                 │                            ├─ 04-08 ADMIN-INDUSTRIES-UI
                 │                            ├─ 04-09 PUBLIC-RECIPES
                 │                            ├─ 04-10 PUBLIC-INDUSTRIES
                 │                            └─ 04-11 USED-IN-INTEGRATION
                 │                                 └─ 04-12 VERIFICATION
```

**BLOCKING plan: 04-01 SCHEMA-MIGRATION** — every other plan reads from columns/tables that don't exist until 04-01 ships. No work parallelizable upstream of it.

## Pitfalls

### Phase 4-specific

**P4-1 — RSC hydration mismatch on Tiptap admin editor.** Tiptap's `useEditor` with default config tries to render on the server during SSR, mismatches client hydration. Fix: pass `immediatelyRender: false` to `useEditor()`. **Warning sign:** React hydration errors in console mentioning ProseMirror DOM. **Source:** [CITED: Tiptap Next.js docs — "Setting `immediatelyRender: false` prevents the editor from rendering on the server"]

**P4-2 — Tiptap image src vs publicId divergence.** If body JSON contains both `attrs.src` (from a copy-pasted upload) AND `attrs.publicId`, the public RSC must use ONLY `publicId`. Author the `nodeMapping.image` override to ignore `src` entirely. Otherwise an admin pasting an image URL from another site bypasses Cloudinary and embeds a hot-linked image.

**P4-3 — Static-renderer extension drift between admin and public.** The admin editor and public renderer MUST receive the SAME extension array. If admin adds an extension (e.g., enables code-block) but public renderer doesn't, the renderer throws on saved content. Mitigation: single export `TIPTAP_EXTENSIONS` from `src/lib/tiptap-extensions.ts` consumed by both sides + Wave-0 test asserting extension parity.

**P4-4 — TechArticle vs Article schema mismatch for industry pages.** Schema.org defines TechArticle for how-to/specs. Industries are landing pages. Google accepts; Yandex may flag. Mitigation: ship as TechArticle per D-10; manual gate post-launch via Yandex Webmaster Structured Data report; switch to `Article` is a 1-line change if needed.

**P4-5 — pgView staleness on junction-table mutations.** A pgView is recomputed on every read — but the surrounding `'use cache'` boundary on `getUsedInForProduct` caches the result. Junction mutations MUST call `revalidateUsedIn(productId)` for EVERY affected product (union of old + new). Pitfall: forgetting one direction (e.g., `unpublishRecipe` doesn't enumerate the recipe's linked products before tx). Mitigation: pre-tx capture of `oldLinkedProductIds` mandatory; iterate after commit.

**P4-6 — Tiptap doc translation completeness false-positive.** A Tiptap doc with one empty paragraph (`{ type: 'doc', content: [{ type: 'paragraph' }] }`) is "structurally non-empty" but visually empty. `<TranslationCompleteness>` would incorrectly mark it 100%. Fix: `isTiptapDocFilled()` heuristic — recurse and count non-paragraph nodes OR text-bearing leaves.

**P4-7 — Slug collision across recipe + industry namespace.** Recipe `slug='oil-gas'` and industry `slug='oil-gas'` could co-exist (different tables, separate unique indices). They'd resolve to `/uz/recipes/oil-gas` vs `/uz/industries/oil-gas` — different routes, no collision. But if both routes were unified under `/uz/articles/oil-gas` in v2, the collision would surface. Mitigation: keep separate route prefixes per D-01 (separate tables); add a Wave-0 test asserting no cross-table slug check is needed.

### Carry-forward (Phase 1/2/3 applicable)

**P1 (Pitfall #1, Russian-first schema):** Already mitigated by Phase 1 sibling translations. Phase 4 inherits — no `_ru`/`_en`/`_uz` columns, no JSONB translation bags.

**P2 (Pitfall #2, post-tx revalidation):** EVERY revalidateRecipe / revalidateIndustry / revalidateUsedIn call lives OUTSIDE the dbTx.transaction lambda. Structural mitigation — same shape as plan 02-13a (saveProduct's `revalidateProduct` is at line 27 of products.ts comment header — AFTER tx.commit).

**P3 (Pitfall #3, hreflang):** Phase 4 pages MUST emit hreflang for all 3 locales + x-default via `buildAlternates({ slugByLocale })`. Carry-forward from Phase 3 SEO-01.

**P5 (Pitfall #5, Cloudinary signing):** Reuse paramsToSign protocol verbatim — Tiptap image upload calls the same `/api/cloudinary/sign` endpoint with the same widget shape. ONE-line change: extend FOLDER_ALLOWLIST.

**P5'(Pitfall on caching):** Edit-then-refresh test on Vercel preview is mandatory. Same e2e gate from OPS-01 generalizes — Phase 4 plan 04-12 can extend `tests/e2e/admin-edit-revalidates.spec.ts` to also test recipe edit propagation.

**P9 (Pitfall #9, Cyrillic + Uzbek-Latin font):** Inter is locked Phase 1; Tiptap content rendering inside `prose prose-slate` inherits font stack. No new concerns. The `oʻ` / `gʻ` Uzbek Latin glyphs in body content render via Inter Latin Extended subset (already loaded).

**P11 (Pitfall #11, Cloudinary bandwidth):** Tiptap inline images go through `<CldImage>`-equivalent (`getCldImageUrl` with `f_auto,q_auto,w_1200`) — same f_auto/q_auto as Phase 3 product images. Inline image LCP is not a concern (body images are below the fold; the page hero is `recipe.featuredImagePublicId` which uses `<CldImage priority>`).

**P12 (Pitfall #12, locale fallback leaks):** Phase 4 follows Phase 3 D-05 cascade (current → uz → ru → en). Banner displayed when fallback locale used. Same shape — recipe / industry mirror product behavior.

**P13 (Pitfall #13, structured data):** TechArticle JSON-LD on recipe + industry pages closes this for content tier; v1 launch posture stays compliant with Rich Results Test. Manual gate post-deploy per Phase 3 DEF-3-09-02 pattern.

**Pitfall #16 (NEW — Tiptap RSC hydration):** Documented as P4-1.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (node + jsdom projects) + Playwright 1.59.1 (e2e against Vercel preview) — same setup as Phase 3 |
| Config file | `vitest.config.ts` (root) + `playwright.config.ts` (root) |
| Quick run command | `pnpm vitest run` |
| Full suite command | `pnpm vitest run && pnpm playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | saveRecipe 5-step tx + publish/unpublish/delete lifecycle | integration (live Neon) | `pnpm vitest run tests/actions/recipes.test.ts` | Wave 0 |
| CONT-01 (UI) | Admin recipe form renders Tiptap editor + accepts content | jsdom + playwright e2e | `pnpm vitest run tests/components/recipe-form.test.tsx` + `pnpm playwright test tests/e2e/admin-recipe-form.spec.ts` | Wave 0 |
| CONT-02 | saveIndustry tx + lifecycle | integration | `pnpm vitest run tests/actions/industries.test.ts` | Wave 0 |
| CONT-02 (UI) | Admin industry form + linked-products picker | jsdom + e2e | `pnpm vitest run tests/components/industry-form.test.tsx` + `pnpm playwright test tests/e2e/admin-industry-form.spec.ts` | Wave 0 |
| CONT-03 | Visitor reads recipe in current locale (Tiptap → HTML server-rendered) | e2e | `pnpm playwright test tests/e2e/recipe-detail.spec.ts` | Wave 0 |
| CONT-03 (fallback) | Locale fallback banner shown on missing-translation | e2e | `pnpm playwright test tests/e2e/recipe-detail.spec.ts` (fixture: ru-only translation, request /uz/...) | Wave 0 |
| CONT-04 | Product detail "Used in" section lists 1+ recipe + 1+ industry | e2e | `pnpm playwright test tests/e2e/used-in-section.spec.ts` | Wave 0 |
| CONT-04 (hidden) | Section hidden when product has 0 cross-links | e2e | same file, separate spec | Wave 0 |
| CONT-05 | M:N admin assignment writes both junction tables | integration | `pnpm vitest run tests/actions/recipes.test.ts` (linked-products replace-on-save spec) | Wave 0 |
| CONT-06 | TechArticle JSON-LD shape | unit + e2e | `pnpm vitest run tests/lib/jsonld.test.ts::techArticle` (unit) + `pnpm playwright test tests/e2e/recipe-detail.spec.ts` (script-tag presence + JSON.parse + `@type === 'TechArticle'`) | Wave 0 |
| CONT-06 (Rich Results) | Google Rich Results Test passes | manual gate | DEF-4-12-01 — paste preview URL into search.google.com/test/rich-results | (manual) |

### Sampling Rate

- **Per task commit:** `pnpm vitest run` (~3 min)
- **Per wave merge:** `pnpm vitest run && pnpm playwright test` (~4 min including Vercel preview wait)
- **Phase gate:** Full suite green + Wave 4 verification commits + DEF-4-12-01 manual gate logged

### Wave 0 Gaps

- [ ] `tests/db/phase4-migration.test.ts` — covers schema migration (BLOCKING; landed in 04-01)
- [ ] `tests/lib/tiptap-render.test.ts` — covers static-renderer + escape (Wave 0; landed in 04-02)
- [ ] `tests/lib/jsonld.test.ts` — extend with techArticle specs (Wave 0; landed in 04-03)
- [ ] `tests/lib/used-in.test.ts` — covers getUsedInForProduct + cache tag wiring (Wave 0; landed in 04-03)
- [ ] `tests/actions/recipes.test.ts` — 7 specs locking recipe lifecycle (Wave 1; landed in 04-05)
- [ ] `tests/actions/industries.test.ts` — 7 specs (Wave 1; landed in 04-06)
- [ ] `tests/components/recipe-form.test.tsx` + `industry-form.test.tsx` — jsdom (Wave 2)
- [ ] `tests/e2e/recipe-detail.spec.ts` + `industry-detail.spec.ts` + `used-in-section.spec.ts` + `admin-recipe-form.spec.ts` + `admin-industry-form.spec.ts` (Wave 0 stubs as `test.fixme`; flipped Wave 4)
- [ ] `tests/fixtures/seed-public.ts` — extend with seed-recipes + seed-industries + linked products (Wave 0; landed in 04-04)

## Runtime State Inventory

> Phase 4 is purely additive — no rename / refactor / migration of existing identifiers. Brief audit:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 4 is greenfield content tier; recipe/industry tables already exist with 0 rows | None |
| Live service config | None — no n8n / external service references; deployment config (Vercel env) unchanged | None |
| OS-registered state | None — no scheduled tasks / pm2 / systemd | None |
| Secrets/env vars | None new — Cloudinary + Resend + Postgres env vars already wired | None |
| Build artifacts | Tiptap install will populate `node_modules/@tiptap/*` (11 packages) — no stale artifacts to clean | Run `pnpm install` after package.json edit |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Tiptap install + tests | ✓ (project running) | per project | — |
| pnpm | Package install | ✓ | 10.33.0 | — |
| Postgres (Neon dev branch) | Migration 0003 + live-Neon tests | ✓ (Phase 1–3 active) | 16.x | — |
| Cloudinary account | Tiptap inline image upload | ✓ (Phase 1+ active) | n/a | — |
| Vercel preview | e2e tests + Rich Results manual gate | ✓ (Phase 2+ active) | n/a | — |
| `@tiptap/static-renderer@3.22.5` | Public RSC | ✓ (npm registry verified) | 3.22.5 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Code Examples

### Tiptap doc fixture for testing (malicious-text body)

```typescript
// tests/fixtures/tiptap-malicious.ts
import type { JSONContent } from '@tiptap/core';

export const MALICIOUS_TIPTAP_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '<script>alert(1)</script>' },
        { type: 'text', marks: [{ type: 'bold' }], text: '</p><img src=x onerror=alert(2)>' },
      ],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Normal text after.' }],
    },
  ],
};

// tests/lib/tiptap-render.test.ts
import { describe, it, expect } from 'vitest';
import { renderTiptapToHtml } from '@/lib/tiptap-render';
import { MALICIOUS_TIPTAP_DOC } from '../fixtures/tiptap-malicious';

describe('renderTiptapToHtml', () => {
  it('escapes < > & in text content (T-04-XSS-01)', () => {
    const html = renderTiptapToHtml(MALICIOUS_TIPTAP_DOC);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;/p&gt;&lt;img');
    // Normal text survives intact
    expect(html).toContain('Normal text after.');
  });
});
```

### Recipe Server Action structural shape

See §saveRecipe sketch above. Mirror saveProduct from `src/actions/products.ts:1-100` verbatim — change table names, drop the FTS-rebuild step (recipe content is not search-indexed in v1 per CONTEXT deferred), keep everything else.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tiptap v2 | Tiptap v3 (`3.22.5`) | 2025-Q4 (v3 stable) | STACK.md says v2; install v3. Migration story is ~9 packages, peer-locked, 0 breaking change for our extension list |
| `@tiptap/html` (`generateHTML`) | `@tiptap/static-renderer` | 2025 (v3-era) | static-renderer is RSC-safe (no JSDOM), zero React imports at the html-string subpath |
| Tiptap on client only (rehydrate from HTML) | Tiptap JSON in DB + static-render on RSC + admin client editor | This phase | Zero client ProseMirror bundle on public pages — Slow-4G LCP budget per SEO-05 preserved |
| Article JSON-LD for everything | TechArticle for recipes (canonical fit) + TechArticle for industries (D-10 lock; semantically Article would fit better) | This phase | Single helper, single test surface; flag as P4-4 for post-launch Yandex review |
| Server-paginated linked-products picker | Pre-fetched + client-side filter (≤200 v1 scale) | This phase | Smaller code surface; defer pagination to v2 if list grows |

**Deprecated/outdated:**
- `@tiptap/html` `generateHTML` — replaced by `@tiptap/static-renderer/pm/html-string`
- `useEditor` without `immediatelyRender: false` — required in Next.js App Router
- Tiptap v2 docs — version-1 / version-2 paths on tiptap.dev are archived; current docs target v3

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TechArticle JSON-LD is acceptable for industry vertical landing pages (Yandex parses cleanly) | TechArticle field set, P4-4 | Yandex Structured Data report flags type mismatch; switch to `Article` is 1-line change |
| A2 | `@tiptap/static-renderer` `unhandledNode: () => ''` is a stable softening pattern for unknown nodes (won't change in patch releases) | Tiptap integration patterns | If v3 patch release tightens the option semantics, set during plan-checking |
| A3 | shadcn Combobox / Command + Popover pattern works at ≤200-product scale without server pagination | Linked-products picker | If product count grows past ~1000 v1 launch, virtualization or server-paginated picker added in v2 |
| A4 | A pgView with UNION ALL of two junctions performs adequately at v1 scale (≤500 products × ≤200 recipes/industries × 3 locales = ≤300k rows worst case) | Used-in reverse query | If query latency exceeds ~50ms p95, materialize as a real table refreshed on junction mutations (v2 concern) |
| A5 | Drizzle's `pgView` API supports the UNION ALL shape with non-trivial ORDER BY (we use position::text cast) | Schema migration sketch | If pgView fails to materialize, fall back to two reads against junctions with two cacheTags |
| A6 | The existing FOLDER_ALLOWLIST extension to support `'recipes'` + `'industries'` is forwards-compatible with the Phase-2 widget protocol | Tiptap image upload wiring | If FOLDER_ALLOWLIST mechanism is more constrained than expected, plan 04-02 widens it |
| A7 | recipe / industry translation completeness can be JS-side computed without a pgView (small denominator) | Translation completeness for Tiptap doc | If product-style pgView is preferred for consistency, planner adds in 04-01 (cheap) |

## Open Questions

1. **D-03 distinct-AUDIT_ACTIONS-verbs vs Phase-2-pattern of generic verbs.**
   - What we know: CONTEXT D-03 phrases lifecycle audit verbs as `publish_recipe` / `unpublish_recipe` / `delete_recipe` (etc.). Phase 2 plan 02-13b shipped product lifecycle using GENERIC verbs (`publish` / `unpublish` / `delete`) with `entity_type: 'product'` discriminator. The current `AUDIT_ACTIONS` enum in `src/lib/audit.ts` has `publish` / `unpublish` / `delete` (generic) PLUS some discriminator-style entries like `duplicate_product`.
   - What's unclear: Does Phase 4 add NEW enum entries (`publish_recipe`, `delete_industry`, etc.) or REUSE generic `publish` / `unpublish` / `delete` with `entity_type` discrimination?
   - Recommendation: **Reuse generic verbs + entity_type discriminator** (Phase 2 lifecycle pattern). This requires NO change to `AUDIT_ACTIONS`. Note this in Phase 4 context as a refinement of D-03 wording. Planner can add `duplicate_recipe` / `duplicate_industry` IF a recipe/industry duplicate flow is added (CONTEXT mentions duplicate_product but Phase 4 has no parallel — probably not needed in v1; deferred).

2. **`mentions` array on TechArticle JSON-LD — `@type: Product` with no `offers` (Phase 3 D-08 stance).**
   - What we know: The Phase 3 productJsonLd helper omits `offers`. The TechArticle `mentions` array could reference linked products as `{ '@type': 'Product', name, url }`. Google does NOT require `offers` on a Product *referenced* via mentions (only on a primary Product entity that's the page's `mainEntityOfPage`).
   - What's unclear: Whether Yandex's structured-data parser similarly tolerates Product-without-offers in a mentions array.
   - Recommendation: Ship as-designed — `{ '@type': 'Product', name, url }` per linked product. Manual gate post-launch via Yandex Structured Data report.

3. **pgView vs two reads for Used-in — is the view worth the migration complexity?**
   - What we know: A pgView is one round-trip + one cacheTag. Two reads is two round-trips + two cacheTags. Drizzle's pgView API supports UNION ALL.
   - What's unclear: Whether the planner finds the view's complexity (DDL, schema barrel export, type-level row alignment) worth saving one round-trip at v1 scale.
   - Recommendation: Researcher recommends the view (single tag, single read, pgView pattern is established Phase-2). If planner chooses two reads, the cacheTag set becomes `recipes-linked-to:<productId>` + `industries-linked-to:<productId>` — and `revalidateUsedIn(productId)` fires both. Either path is acceptable.

4. **Slug squatting reserved-prefix denylist — admin enters `slug='admin'`.**
   - What we know: An admin entering `slug='admin'` for `/uz/recipes/admin` would shadow `/uz/admin` only if the admin route used `/uz/admin/<slug>` (it doesn't — admin routes are `/uz/admin/recipes/<id>`). No actual collision.
   - What's unclear: Whether the planner wants a defense-in-depth denylist (`/admin`, `/api`, `/_next`) anyway.
   - Recommendation: Add a 5-element denylist in `recipeInsertSchema` / `industryInsertSchema` Zod refinement. Cheap, no false-positives. Defense in depth.

5. **Body field in `recipe_translations` is currently `jsonb()` (untyped) in `src/db/schema/recipes.ts:35`. Switch to `jsonb().$type<JSONContent>()`?**
   - What we know: Drizzle's `.$type<T>()` is purely a TypeScript narrowing — no runtime / migration impact.
   - What's unclear: Whether the planner wants the type narrowing as part of the Phase 4 schema diff or as a no-op TypeScript-only edit.
   - Recommendation: Apply `$type<JSONContent>()` in Wave 0 (plan 04-01). Catches drift at compile time when the body shape changes.

## Sources

### Primary (HIGH confidence)

- `npm view @tiptap/static-renderer 3.22.5` (2026-04-30 — registry)
- `npm view @tiptap/{core,react,starter-kit,extension-image,extension-link,extension-table,extension-table-row,extension-table-cell,extension-table-header,pm} version` — all 3.22.5
- Probed dist files at `/tmp/tiptap-probe/node_modules/@tiptap/static-renderer/dist/{pm,json}/html-string/index.{d.ts,js}` — verified `renderToHTMLString({ content, extensions, options }): string` signature, `escapeHTML` + `escapeHTMLAttribute` built-in escape, `unhandledNode` option behavior, throw-on-unknown-node-by-default
- Probed `Image.extend` API in `@tiptap/extension-image` — verified `addAttributes() { return { ...this.parent?.(), ... } }` pattern works
- `src/db/schema/products.ts:30,53-56` — verified plain text + CHECK pattern (no pgEnum) for `product.status`
- `drizzle/0001_overrated_shiva.sql:25-26,38` — verified migration shape: ALTER ADD COLUMN + UPDATE backfill + ADD CONSTRAINT CHECK
- `src/db/schema/views/product-translation-completeness.ts:16-64` — verified pgView pattern with `pgView('name', shape).as(sql\`...\`)`
- `src/lib/jsonld.ts:32-91` — verified existing 4 helpers; mirror for `techArticleJsonLd`
- `src/lib/revalidation.ts:37-112` — verified extension shape for `revalidateRecipe` / `revalidateIndustry` / `revalidateUsedIn`
- `src/app/[locale]/products/[slug]/page.tsx:108-109` — verified `\\u003c` JSON-LD escape pattern
- `src/lib/product-detail.ts:1-30` — verified data-fetch helper shape with `'use cache'` + `cacheTag`
- `src/components/admin/spec-values-editor.tsx:155-179` — verified pre-fetched options + select primitive pattern (template for linked-products picker)
- `src/lib/audit.ts` AUDIT_ACTIONS — verified generic verb pattern
- `package.json` — verified all carry-forward dependency versions
- `.planning/research/PITFALLS.md` — Pitfall #2, #5, #11, #12, #13 directly applicable
- `.planning/phases/03-public-rendering-search-seo/03-CONTEXT.md` D-05 (locale fallback), D-08 (Product no-offers), D-09 (jsonld helper set)
- `.planning/phases/03-public-rendering-search-seo/03-SECURITY.md:32-39` — JSON-LD escape, draft-isolation, locale validation patterns

### Secondary (MEDIUM confidence)

- `developers.google.com/search/docs/appearance/structured-data/article` — Article JSON-LD recommended fields (TechArticle inherits)
- `schema.org/TechArticle` — type hierarchy + scope ("how-to / step-by-step / specs"); flagged as A1 assumption for industry pages
- `tiptap.dev/docs/editor/getting-started/install/nextjs` — v3 install + `'use client'` + `immediatelyRender: false`

### Tertiary (LOW confidence)

- None — every claim in this research is either verified at file:line or registry-probed or built-in-source-read.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all 11 Tiptap packages registry-probed; peer compatibility verified by reading `static-renderer/package.json` peer block
- Architecture: HIGH — pattern inheritance from Phase 2 (saveProduct 5-step) and Phase 3 (D-05 fallback, D-08 JSON-LD, D-09 helper set) is mechanical
- Pitfalls: HIGH — Tiptap RSC hydration mismatch is documented Tiptap v3 + Next.js App Router gotcha; static-renderer security model verified by source read
- Schema migration: HIGH — Phase 1 + 2 migration files probed; pgView shape verified

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (Tiptap v3 is stable; static-renderer last published 3 days ago — patch releases unlikely to change the renderToHTMLString signature within the 30-day window)

---

*Phase: 04-content-features*
*Research date: 2026-04-30*
