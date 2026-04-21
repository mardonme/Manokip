// product_search — per-locale tsvector with GIN index. Declared in Phase 1,
// populated in Phase 3 via write-path transaction (rebuilds all three
// locale rows for a product whenever its content changes).
// tsvector is not a built-in Drizzle type — use customType per Assumption A5.
import {
  pgTable,
  uuid,
  text,
  index,
  customType,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const productSearch = pgTable(
  'product_search',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    searchTsv: tsvector('search_tsv').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.locale] }),
    index('product_search_tsv_gin').using('gin', t.searchTsv),
    index('product_search_locale_idx').on(t.locale),
    check(
      'product_search_locale_check',
      sql`${t.locale} IN ('uz','ru','en')`,
    ),
  ],
);
