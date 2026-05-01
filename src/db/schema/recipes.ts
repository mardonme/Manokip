// Recipe = how-to / application article (Phase 4). body stored as jsonb
// to hold a Tiptap ProseMirror document. Sibling translations table carries
// title/slug/excerpt/body per locale with the standard constraint template.
//
// Phase 4 plan 04-01 extensions:
//   - recipe.status: text NOT NULL DEFAULT 'draft' + CHECK ('draft','published')
//     mirrors product.status from Phase 2 D-11 / migration 0001. Plain text + CHECK
//     keeps schema homogeneous (no publication_status pgEnum).
//
// Phase 4 plan 04-02 narrowing:
//   - recipe_translations.body now narrowed to jsonb().$type<JSONContent>() so
//     downstream Server Actions and read sites get a typed Tiptap doc shape
//     rather than `unknown`. DDL is unchanged (still jsonb at the PG layer);
//     the narrowing is purely TypeScript metadata.
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

export const recipes = pgTable(
  'recipe',
  {
    id: uuid().primaryKey().defaultRandom(),
    featuredImagePublicId: text('featured_image_public_id'),
    status: text('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('recipe_status_check', sql`${t.status} IN ('draft','published')`),
  ],
);

export const recipeTranslations = pgTable(
  'recipe_translations',
  {
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    locale: text().notNull(),
    title: text().notNull(),
    slug: text().notNull(),
    excerpt: text(),
    body: jsonb().$type<JSONContent>(), // Tiptap ProseMirror doc — narrowed in plan 04-02
  },
  (t) => [
    primaryKey({ columns: [t.recipeId, t.locale] }),
    uniqueIndex('recipe_translations_locale_slug').on(t.locale, t.slug),
    index('recipe_translations_locale_idx').on(t.locale),
    check(
      'recipe_translations_locale_check',
      sql`${t.locale} IN ('uz','ru','en')`,
    ),
  ],
);
