// Pattern 3: product base + product_translations sibling.
// publishedAt NULL = draft; non-NULL = published at that instant.
// Phase 2 D-11 / Open Q §1 Option B: status is the canonical lifecycle state
// ('draft' | 'published'); publishedAt remains as the publish timestamp.
import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { categories } from './categories';
import { manufacturers } from './manufacturers';

export const products = pgTable(
  'product',
  {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    manufacturerId: uuid('manufacturer_id').references(
      () => manufacturers.id,
    ),
    sku: text().unique(),
    status: text('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('product_category_idx').on(t.categoryId),
    index('product_manufacturer_idx').on(t.manufacturerId),
    check(
      'product_status_check',
      sql`${t.status} IN ('draft','published')`,
    ),
  ],
);

export const productTranslations = pgTable(
  'product_translations',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    locale: text().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    shortDesc: text('short_desc'),
    longDesc: text('long_desc'),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.locale] }),
    uniqueIndex('product_translations_locale_slug').on(t.locale, t.slug),
    index('product_translations_locale_idx').on(t.locale),
    check(
      'product_translations_locale_check',
      sql`${t.locale} IN ('uz','ru','en')`,
    ),
  ],
);
