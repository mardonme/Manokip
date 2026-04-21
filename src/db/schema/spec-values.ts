// Pattern 4 (D-16..D-21): typed spec long-table. Separate num_value /
// text_value / bool_value / enum_value columns — NEVER an opaque `value TEXT`.
// This is the FOUND-02 guardrail: JSONB spec bags hit a filter performance
// cliff at ~1k products; the long-table shape keeps range queries on
// indexed numeric columns.
import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  index,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products';
import { specFields } from './spec-fields';

export const productSpecValues = pgTable(
  'product_spec_values',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    specFieldId: uuid('spec_field_id').references(() => specFields.id, {
      onDelete: 'set null',
    }),
    isExtra: boolean('is_extra').notNull().default(false),
    extraKey: text('extra_key'),
    numValue: numeric('num_value'),
    textValue: text('text_value'),
    boolValue: boolean('bool_value'),
    enumValue: text('enum_value'), // stores spec_field_enum_option.key (D-18)
    unit: text(), // overrides spec_field.unit (D-21)
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('psv_field_num_idx').on(t.specFieldId, t.numValue),
    index('psv_field_enum_idx').on(t.specFieldId, t.enumValue),
    index('psv_product_idx').on(t.productId),
    check(
      'psv_extra_key_check',
      sql`${t.isExtra} = false OR ${t.extraKey} IS NOT NULL`,
    ),
  ],
);

// D-20: per-locale text for free-form extras AND typed text values.
// One product_spec_values row, three translation rows (uz/ru/en) max.
export const productSpecValueTranslations = pgTable(
  'product_spec_value_translations',
  {
    valueId: bigint('value_id', { mode: 'bigint' })
      .notNull()
      .references(() => productSpecValues.id, { onDelete: 'cascade' }),
    locale: text().notNull(),
    textValue: text('text_value'),
  },
  (t) => [
    primaryKey({ columns: [t.valueId, t.locale] }),
    check('psvt_locale_check', sql`${t.locale} IN ('uz','ru','en')`),
  ],
);
