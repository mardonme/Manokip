// D-09: spec_field_group + spec_field_group_translations.
// Mirrors src/db/schema/categories.ts (base + sibling translations).
// Open Q §7: partial-unique index on (category_id, key) WHERE deleted_at IS NULL
// so a soft-deleted group key may be re-created.
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
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { categories } from './categories';

export const specFieldGroups = pgTable(
  'spec_field_group',
  {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('spec_field_group_category_key_idx')
      .on(t.categoryId, t.key)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

export const specFieldGroupTranslations = pgTable(
  'spec_field_group_translations',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => specFieldGroups.id, { onDelete: 'cascade' }),
    locale: text().notNull(),
    label: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.locale] }),
    index('spec_field_group_translations_locale_idx').on(t.locale),
    check(
      'spec_field_group_translations_locale_check',
      sql`${t.locale} IN ('uz','ru','en')`,
    ),
  ],
);
