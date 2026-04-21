// Recipe = how-to / application article (Phase 4). body stored as jsonb
// to hold a Tiptap ProseMirror document. Sibling translations table carries
// title/slug/excerpt/body per locale with the standard constraint template.
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

export const recipes = pgTable('recipe', {
  id: uuid().primaryKey().defaultRandom(),
  featuredImagePublicId: text('featured_image_public_id'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

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
    body: jsonb(), // Tiptap JSON doc
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
