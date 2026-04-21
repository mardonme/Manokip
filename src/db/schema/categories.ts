// D-01 + Pattern 3: self-referential category tree + sibling translations
// table with composite PK (category_id, locale), UNIQUE(locale, slug),
// and CHECK(locale IN ('uz','ru','en')).
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const categories = pgTable(
  'category',
  {
    id: uuid().primaryKey().defaultRandom(),
    parentId: uuid('parent_id').references(
      (): AnyPgColumn => categories.id,
      { onDelete: 'restrict' },
    ),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('category_parent_idx').on(t.parentId)],
);

export const categoryTranslations = pgTable(
  'category_translations',
  {
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    locale: text().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    description: text(),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.locale] }),
    uniqueIndex('category_translations_locale_slug').on(t.locale, t.slug),
    index('category_translations_locale_idx').on(t.locale),
    check(
      'category_translations_locale_check',
      sql`${t.locale} IN ('uz','ru','en')`,
    ),
  ],
);
