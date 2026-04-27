// Pattern 4 + D-16/D-17/D-18/D-19: spec_field catalog declares the typed
// slot each product_spec_values row fills. data_type is exactly four values
// (no 'range' — ranges are modeled as TWO number fields sharing
// filter_group_key). filter_kind IS where 'range' lives (D-17).
// Enum options + their translations are siblings per D-18.
// Phase 2 D-07 / D-09 / Open Q §7: deletedAt soft-delete + groupId FK to
// spec_field_group; partial-unique index on (category_id, key) WHERE
// deleted_at IS NULL so a soft-deleted key may be re-created.
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
  primaryKey,
  uniqueIndex,
  index,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { categories } from './categories';
import { specFieldGroups } from './spec-field-groups';

// D-16: four values, no 'range'. Range = two number fields sharing filter_group_key.
export const specDataTypeEnum = pgEnum('spec_data_type', [
  'number',
  'text',
  'enum',
  'bool',
]);

// D-17: filter_kind is distinct from data_type; 'range' lives HERE on the pair,
// not on data_type.
export const specFilterKindEnum = pgEnum('spec_filter_kind', [
  'range',
  'select',
  'toggle',
]);

export const specFields = pgTable(
  'spec_field',
  {
    id: uuid().primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    key: text().notNull(), // D-19: mutable — rename workflow is Phase 2
    dataType: specDataTypeEnum('data_type').notNull(),
    unit: text(), // canonical unit: 'bar', 'mm', '°C'
    required: boolean().notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    filterKind: specFilterKindEnum('filter_kind'), // NULL = display-only field (D-17)
    filterGroupKey: text('filter_group_key'), // shared by range min/max pair
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // D-07 soft-delete
    groupId: uuid('group_id').references(
      (): AnyPgColumn => specFieldGroups.id,
    ), // D-09 optional group FK (NULL allowed)
  },
  (t) => [
    uniqueIndex('spec_field_category_key_idx')
      .on(t.categoryId, t.key)
      .where(sql`${t.deletedAt} IS NULL`),
    index('spec_field_filter_group_idx').on(t.filterGroupKey),
  ],
);

export const specFieldTranslations = pgTable(
  'spec_field_translations',
  {
    specFieldId: uuid('spec_field_id')
      .notNull()
      .references(() => specFields.id, { onDelete: 'cascade' }),
    locale: text().notNull(),
    label: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.specFieldId, t.locale] }),
    index('spec_field_translations_locale_idx').on(t.locale),
    check(
      'spec_field_translations_locale_check',
      sql`${t.locale} IN ('uz','ru','en')`,
    ),
  ],
);

// D-18: enum option catalog — opaque key stored in product_spec_values.enum_value
export const specFieldEnumOptions = pgTable(
  'spec_field_enum_option',
  {
    id: uuid().primaryKey().defaultRandom(),
    specFieldId: uuid('spec_field_id')
      .notNull()
      .references(() => specFields.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    uniqueIndex('spec_field_enum_option_key_idx').on(t.specFieldId, t.key),
  ],
);

// D-18: translated labels for enum options
export const specFieldEnumOptionTranslations = pgTable(
  'spec_field_enum_option_translations',
  {
    optionId: uuid('option_id')
      .notNull()
      .references(() => specFieldEnumOptions.id, { onDelete: 'cascade' }),
    locale: text().notNull(),
    label: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.optionId, t.locale] }),
    index('spec_field_enum_option_translations_locale_idx').on(t.locale),
    check(
      'spec_field_enum_option_translations_locale_check',
      sql`${t.locale} IN ('uz','ru','en')`,
    ),
  ],
);
