// D-07 Phase 2 dep: logoPublicId stores Cloudinary public_id (DB never
// stores raw image bytes — admin uploads direct to Cloudinary).
// Sibling translations table follows Pattern 3.
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const manufacturers = pgTable('manufacturer', {
  id: uuid().primaryKey().defaultRandom(),
  logoPublicId: text('logo_public_id'), // Cloudinary public_id (D-07)
  websiteUrl: text('website_url'),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  // Phase 3 D-11: drives the "Authorized representative" badge on the
  // manufacturer landing page (D-10) and on the product detail page
  // (D-01 sketch 003 trust strip). Additive, default false — existing
  // rows are unaffected.
  isOfficialRep: boolean('is_official_rep').notNull().default(false),
});

export const manufacturerTranslations = pgTable(
  'manufacturer_translations',
  {
    manufacturerId: uuid('manufacturer_id')
      .notNull()
      .references(() => manufacturers.id, { onDelete: 'cascade' }),
    locale: text().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    description: text(),
    // Phase 3 D-11: per-locale "relationship note" rendered next to the
    // official-rep badge (e.g. ru: "Официальный представитель WIKA в
    // Узбекистане с 2019 г."). Nullable — manufacturers without a written
    // relationship statement render nothing.
    relationshipNote: text('relationship_note'),
  },
  (t) => [
    primaryKey({ columns: [t.manufacturerId, t.locale] }),
    uniqueIndex('manufacturer_translations_locale_slug').on(
      t.locale,
      t.slug,
    ),
    index('manufacturer_translations_locale_idx').on(t.locale),
    check(
      'manufacturer_translations_locale_check',
      sql`${t.locale} IN ('uz','ru','en')`,
    ),
  ],
);
