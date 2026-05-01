// Industry = vertical landing page (oil & gas, chemicals, HVAC, etc.) with
// cross-links to product categories. Mirrors the recipe shape: base entity
// + per-locale sibling with Tiptap jsonb body.
//
// Phase 4 plan 04-01 extensions (mirror recipes.ts):
//   - industry.status: text NOT NULL DEFAULT 'draft' + CHECK ('draft','published')
//
// Phase 4 plan 04-02 narrowing:
//   - industry_translations.body narrowed to jsonb().$type<JSONContent>().
//     DDL unchanged; narrowing is purely TypeScript metadata for downstream
//     Server Actions and read sites.
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { JSONContent } from '@tiptap/core';

export const industries = pgTable(
  'industry',
  {
    id: uuid().primaryKey().defaultRandom(),
    featuredImagePublicId: text('featured_image_public_id'),
    status: text('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('industry_status_check', sql`${t.status} IN ('draft','published')`),
  ],
);

export const industryTranslations = pgTable(
  'industry_translations',
  {
    industryId: uuid('industry_id')
      .notNull()
      .references(() => industries.id, { onDelete: 'cascade' }),
    locale: text().notNull(),
    title: text().notNull(),
    slug: text().notNull(),
    excerpt: text(),
    body: jsonb().$type<JSONContent>(), // Tiptap ProseMirror doc — narrowed in plan 04-02
  },
  (t) => [
    primaryKey({ columns: [t.industryId, t.locale] }),
    uniqueIndex('industry_translations_locale_slug').on(t.locale, t.slug),
    index('industry_translations_locale_idx').on(t.locale),
    check(
      'industry_translations_locale_check',
      sql`${t.locale} IN ('uz','ru','en')`,
    ),
  ],
);
