// Industry = vertical landing page (oil & gas, chemicals, HVAC, etc.) with
// cross-links to product categories. Mirrors the recipe shape: base entity
// + per-locale sibling with Tiptap jsonb body.
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

export const industries = pgTable('industry', {
  id: uuid().primaryKey().defaultRandom(),
  featuredImagePublicId: text('featured_image_public_id'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

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
    body: jsonb(),
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
