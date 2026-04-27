// D-05 / Open Q §2 Option A: sibling MT-flag table for product_translations.
// Compound FK (product_id, locale) -> product_translations(product_id, locale)
// with ON DELETE CASCADE so flags drop when their translation is removed.
// Phase 2 ships flags only for productTranslations; category/manufacturer/
// spec_field/group translation field flags are deferred to v2.
import {
  pgTable,
  uuid,
  text,
  boolean,
  primaryKey,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { productTranslations } from './products';

export const productTranslationFieldFlags = pgTable(
  'product_translation_field_flags',
  {
    productId: uuid('product_id').notNull(),
    locale: text().notNull(),
    fieldName: text('field_name').notNull(),
    machineTranslated: boolean('machine_translated').notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.locale, t.fieldName] }),
    foreignKey({
      columns: [t.productId, t.locale],
      foreignColumns: [
        productTranslations.productId,
        productTranslations.locale,
      ],
    }).onDelete('cascade'),
  ],
);
