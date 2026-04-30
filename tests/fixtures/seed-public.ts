// Plan 03-01 Task 1.2 — seedPublicFixture() Wave-0 deterministic seed.
//
// Purpose: every Phase-3 downstream plan (02–08) un-skips test stubs that
// expect a stable public-side fixture: 3 manufacturers (WIKA, BD Sensors,
// Метран), 6 published products spread across 2 categories (manometers +
// pressure transmitters), all 3 locales each. Deterministic UUIDs let
// Playwright e2e specs hardcode slugs and IDs without coupling to runtime
// state — the same seed produces the same rows every test run.
//
// Wave-0 column boundary (CRITICAL):
//   The fixture writes ONLY columns that exist in the Wave-0 schema. Plan
//   02 lands the additive migration for: product media arrays, the
//   manufacturer official-rep flag, and the per-locale relationship note
//   on manufacturer_translations. The Plan-02 seed extension fills those
//   after the migration runs. This file MUST NOT reference any of those
//   columns by their literal names — the verify step asserts with grep.
//
// product_search rows: NOT written here. Plan 02 Task 2.3 adds the
// tsvector rebuild to saveProduct() — tests that exercise search will call
// saveProduct() on each product after seeding, which populates the FTS
// index in the same transaction. Pre-populating product_search here would
// duplicate that contract and drift on column shape.
//
// Closest analog: tests/_fixtures/seed-products.ts (Phase 2 Plan 13a).
// Same shape: { ids } returned + cleanup() function. teardownPublicFixture
// is exposed as a separate named export per the plan's interface contract
// (downstream plans expect both `seedPublicFixture` and
// `teardownPublicFixture`); cleanup() is wired through teardown so tests
// can use either pattern.
//
// REQUIRES: live Neon test branch. tests/_fixtures/db.ts requireTestDatabaseUrl()
// must pass before any test that imports this fixture runs.

import { sql } from 'drizzle-orm';
import { getTestDb } from '../_fixtures/db';

const LOCALES = ['uz', 'ru', 'en'] as const;
type Locale = (typeof LOCALES)[number];

export interface PublicFixtureIds {
  categoryIds: { manometers: string; transmitters: string };
  manufacturerIds: { wika: string; bd: string; metran: string };
  /** 6 products. First 3 are in manometers (M-100/M-200/M-300), last 3 in transmitters (T-100/T-200/T-300). */
  productIds: string[];
  specFieldIds: {
    pressureMax: string;
    material: string;
    certified: string;
  };
}

// Deterministic UUIDs — RFC 4122 v4 shape (random version+variant nibbles)
// using a stable namespace prefix so e2e tests can hardcode IDs across runs.
// Zero-padded sequence numbers so a debugger query (`SELECT id FROM ...`)
// shows the row's role at a glance.
const ID = {
  categoryManometers: '00000000-0000-4000-8000-000000000c01',
  categoryTransmitters: '00000000-0000-4000-8000-000000000c02',
  manufacturerWika: '00000000-0000-4000-8000-00000000m001',
  manufacturerBd: '00000000-0000-4000-8000-00000000m002',
  manufacturerMetran: '00000000-0000-4000-8000-00000000m003',
  productM100: '00000000-0000-4000-8000-00000000p001',
  productM200: '00000000-0000-4000-8000-00000000p002',
  productM300: '00000000-0000-4000-8000-00000000p003',
  productT100: '00000000-0000-4000-8000-00000000p004',
  productT200: '00000000-0000-4000-8000-00000000p005',
  productT300: '00000000-0000-4000-8000-00000000p006',
  specPressureMax: '00000000-0000-4000-8000-00000000s001',
  specMaterial: '00000000-0000-4000-8000-00000000s002',
  specCertified: '00000000-0000-4000-8000-00000000s003',
} as const;

// Per-product translations: name + slug + short_desc + long_desc per locale.
interface ProductCopy {
  name: string;
  slug: string;
  shortDesc: string;
  longDesc: string;
}

const MANOMETER_PRODUCTS: Array<{
  id: string;
  sku: string;
  manufacturerId: string;
  pressureMax: number;
  material: 'steel' | 'brass' | 'inox';
  certified: boolean;
  copy: Record<Locale, ProductCopy>;
}> = [
  {
    id: ID.productM100,
    sku: 'M-100',
    manufacturerId: ID.manufacturerWika,
    pressureMax: 100,
    material: 'steel',
    certified: true,
    copy: {
      uz: {
        name: 'Manometr M-100',
        slug: 'manometr-m-100',
        shortDesc: 'Sanoat manometri 100 bar gacha',
        longDesc: 'Yuqori sifatli manometr neft-gaz sohasi uchun.',
      },
      ru: {
        name: 'Манометр M-100',
        slug: 'manometr-m-100-ru',
        shortDesc: 'Промышленный манометр до 100 бар',
        longDesc: 'Высококачественный манометр для нефтегазовой отрасли.',
      },
      en: {
        name: 'Manometer M-100',
        slug: 'manometer-m-100',
        shortDesc: 'Industrial manometer up to 100 bar',
        longDesc: 'High-quality manometer for oil and gas industry.',
      },
    },
  },
  {
    id: ID.productM200,
    sku: 'M-200',
    manufacturerId: ID.manufacturerBd,
    pressureMax: 250,
    material: 'brass',
    certified: false,
    copy: {
      uz: {
        name: 'Manometr M-200',
        slug: 'manometr-m-200',
        shortDesc: 'Sanoat manometri 250 bar gacha',
        longDesc: 'Yuqori bosim uchun manometr.',
      },
      ru: {
        name: 'Манометр M-200',
        slug: 'manometr-m-200-ru',
        shortDesc: 'Промышленный манометр до 250 бар',
        longDesc: 'Манометр для высокого давления.',
      },
      en: {
        name: 'Manometer M-200',
        slug: 'manometer-m-200',
        shortDesc: 'Industrial manometer up to 250 bar',
        longDesc: 'Manometer for high pressure applications.',
      },
    },
  },
  {
    id: ID.productM300,
    sku: 'M-300',
    manufacturerId: ID.manufacturerMetran,
    pressureMax: 600,
    material: 'inox',
    certified: true,
    copy: {
      uz: {
        name: 'Manometr M-300',
        slug: 'manometr-m-300',
        shortDesc: 'Sanoat manometri 600 bar gacha',
        longDesc: 'Eng yuqori bosim uchun nerjaveyka manometr.',
      },
      ru: {
        name: 'Манометр M-300',
        slug: 'manometr-m-300-ru',
        shortDesc: 'Промышленный манометр до 600 бар',
        longDesc: 'Манометр из нержавеющей стали для экстремального давления.',
      },
      en: {
        name: 'Manometer M-300',
        slug: 'manometer-m-300',
        shortDesc: 'Industrial manometer up to 600 bar',
        longDesc: 'Stainless steel manometer for extreme pressure.',
      },
    },
  },
];

const TRANSMITTER_PRODUCTS: Array<{
  id: string;
  sku: string;
  manufacturerId: string;
  copy: Record<Locale, ProductCopy>;
}> = [
  {
    id: ID.productT100,
    sku: 'T-100',
    manufacturerId: ID.manufacturerWika,
    copy: {
      uz: {
        name: 'Bosim datchigi T-100',
        slug: 'bosim-datchigi-t-100',
        shortDesc: 'Aniq bosim datchigi 4-20mA',
        longDesc: 'Yuqori aniqlikdagi bosim transmitteri.',
      },
      ru: {
        name: 'Датчик давления T-100',
        slug: 'datchik-davleniya-t-100',
        shortDesc: 'Точный датчик давления 4-20мА',
        longDesc: 'Высокоточный преобразователь давления.',
      },
      en: {
        name: 'Pressure Transmitter T-100',
        slug: 'pressure-transmitter-t-100',
        shortDesc: 'Precision pressure transmitter 4-20mA',
        longDesc: 'High-accuracy pressure transmitter.',
      },
    },
  },
  {
    id: ID.productT200,
    sku: 'T-200',
    manufacturerId: ID.manufacturerBd,
    copy: {
      uz: {
        name: 'Bosim datchigi T-200',
        slug: 'bosim-datchigi-t-200',
        shortDesc: 'HART protokolli bosim datchigi',
        longDesc: 'Raqamli HART chiqishi bilan transmitter.',
      },
      ru: {
        name: 'Датчик давления T-200',
        slug: 'datchik-davleniya-t-200',
        shortDesc: 'Датчик давления с HART',
        longDesc: 'Преобразователь с цифровым выходом HART.',
      },
      en: {
        name: 'Pressure Transmitter T-200',
        slug: 'pressure-transmitter-t-200',
        shortDesc: 'HART-protocol pressure transmitter',
        longDesc: 'Transmitter with digital HART output.',
      },
    },
  },
  {
    id: ID.productT300,
    sku: 'T-300',
    manufacturerId: ID.manufacturerMetran,
    copy: {
      uz: {
        name: 'Bosim datchigi T-300',
        slug: 'bosim-datchigi-t-300',
        shortDesc: 'Differensial bosim datchigi',
        longDesc: 'Differensial bosim transmitteri sanoat uchun.',
      },
      ru: {
        name: 'Датчик давления T-300',
        slug: 'datchik-davleniya-t-300',
        shortDesc: 'Дифференциальный датчик давления',
        longDesc: 'Преобразователь дифференциального давления для промышленности.',
      },
      en: {
        name: 'Pressure Transmitter T-300',
        slug: 'pressure-transmitter-t-300',
        shortDesc: 'Differential pressure transmitter',
        longDesc: 'Differential pressure transmitter for industrial use.',
      },
    },
  },
];

const CATEGORY_TRANSLATIONS: Record<
  'manometers' | 'transmitters',
  Record<Locale, { name: string; slug: string }>
> = {
  manometers: {
    uz: { name: 'Manometr', slug: 'manometr' },
    ru: { name: 'Манометры', slug: 'manometry' },
    en: { name: 'Manometers', slug: 'manometers' },
  },
  transmitters: {
    uz: { name: 'Bosim datchigi', slug: 'bosim-datchigi' },
    ru: { name: 'Датчики давления', slug: 'datchiki-davleniya' },
    en: { name: 'Pressure Transmitters', slug: 'pressure-transmitters' },
  },
};

const MANUFACTURER_TRANSLATIONS: Record<
  'wika' | 'bd' | 'metran',
  Record<Locale, { name: string; slug: string; description: string }>
> = {
  wika: {
    uz: {
      name: 'WIKA',
      slug: 'wika',
      description: 'WIKA — bosim oʻlchash uskunalari ishlab chiqaruvchi.',
    },
    ru: {
      name: 'WIKA',
      slug: 'wika-ru',
      description: 'WIKA — производитель приборов измерения давления.',
    },
    en: {
      name: 'WIKA',
      slug: 'wika-en',
      description: 'WIKA — manufacturer of pressure measurement instruments.',
    },
  },
  bd: {
    uz: {
      name: 'BD Sensors',
      slug: 'bd-sensors',
      description: 'BD Sensors — sanoat datchiklari ishlab chiqaruvchi.',
    },
    ru: {
      name: 'BD Sensors',
      slug: 'bd-sensors-ru',
      description: 'BD Sensors — производитель промышленных датчиков.',
    },
    en: {
      name: 'BD Sensors',
      slug: 'bd-sensors-en',
      description: 'BD Sensors — manufacturer of industrial sensors.',
    },
  },
  metran: {
    uz: {
      name: 'Метран',
      slug: 'metran',
      description: 'Метран — Rossiya bosim oʻlchash kompaniyasi.',
    },
    ru: {
      name: 'Метран',
      slug: 'metran-ru',
      description: 'Метран — российская компания по измерению давления.',
    },
    en: {
      name: 'Metran',
      slug: 'metran-en',
      description: 'Metran — Russian pressure measurement company.',
    },
  },
};

export async function seedPublicFixture(): Promise<PublicFixtureIds> {
  const db = await getTestDb();

  // 1. Categories (2 root categories — manometers, transmitters).
  await db.execute(
    sql`INSERT INTO category (id, parent_id, sort_order) VALUES
        (${ID.categoryManometers}::uuid, NULL, 0),
        (${ID.categoryTransmitters}::uuid, NULL, 1)`,
  );

  // 2. Category translations (3 locales × 2 categories = 6 rows).
  for (const cat of ['manometers', 'transmitters'] as const) {
    const catId =
      cat === 'manometers' ? ID.categoryManometers : ID.categoryTransmitters;
    for (const loc of LOCALES) {
      const tr = CATEGORY_TRANSLATIONS[cat][loc];
      await db.execute(
        sql`INSERT INTO category_translations (category_id, locale, name, slug)
            VALUES (${catId}::uuid, ${loc}, ${tr.name}, ${tr.slug})`,
      );
    }
  }

  // 3. Manufacturers (3 rows — Wave-0 columns only; the official-rep flag
  //    lands in the Plan 02 migration).
  await db.execute(
    sql`INSERT INTO manufacturer (id, logo_public_id, website_url) VALUES
        (${ID.manufacturerWika}::uuid, NULL, 'https://www.wika.com'),
        (${ID.manufacturerBd}::uuid, NULL, 'https://www.bdsensors.de'),
        (${ID.manufacturerMetran}::uuid, NULL, 'https://www.metran.ru')`,
  );

  // 4. Manufacturer translations (3 locales × 3 manufacturers = 9 rows).
  //    The per-locale relationship note column lands in Plan 02 — not
  //    written here.
  for (const mfg of ['wika', 'bd', 'metran'] as const) {
    const mfgId =
      mfg === 'wika'
        ? ID.manufacturerWika
        : mfg === 'bd'
          ? ID.manufacturerBd
          : ID.manufacturerMetran;
    for (const loc of LOCALES) {
      const tr = MANUFACTURER_TRANSLATIONS[mfg][loc];
      await db.execute(
        sql`INSERT INTO manufacturer_translations (manufacturer_id, locale, name, slug, description)
            VALUES (${mfgId}::uuid, ${loc}, ${tr.name}, ${tr.slug}, ${tr.description})`,
      );
    }
  }

  // 5. Spec fields under the manometers category.
  //    pressure_max: number, filter_kind=range, unit=bar
  //    material: enum, filter_kind=select
  //    certified: bool, filter_kind=toggle
  await db.execute(
    sql`INSERT INTO spec_field (id, category_id, key, data_type, unit, required, sort_order, filter_kind, filter_group_key)
        VALUES
        (${ID.specPressureMax}::uuid, ${ID.categoryManometers}::uuid, 'pressure_max', 'number', 'bar', false, 0, 'range', 'pressure_max'),
        (${ID.specMaterial}::uuid, ${ID.categoryManometers}::uuid, 'material', 'enum', NULL, false, 1, 'select', NULL),
        (${ID.specCertified}::uuid, ${ID.categoryManometers}::uuid, 'certified', 'bool', NULL, false, 2, 'toggle', NULL)`,
  );

  // 6. Spec field translations (3 locales × 3 fields = 9 rows).
  const specLabels: Record<
    'pressure_max' | 'material' | 'certified',
    Record<Locale, string>
  > = {
    pressure_max: {
      uz: 'Maksimal bosim',
      ru: 'Максимальное давление',
      en: 'Max pressure',
    },
    material: {
      uz: 'Material',
      ru: 'Материал',
      en: 'Material',
    },
    certified: {
      uz: 'Sertifikatlangan',
      ru: 'Сертифицирован',
      en: 'Certified',
    },
  };
  const specFieldKeys: Array<{
    id: string;
    key: 'pressure_max' | 'material' | 'certified';
  }> = [
    { id: ID.specPressureMax, key: 'pressure_max' },
    { id: ID.specMaterial, key: 'material' },
    { id: ID.specCertified, key: 'certified' },
  ];
  for (const sf of specFieldKeys) {
    for (const loc of LOCALES) {
      const label = specLabels[sf.key][loc];
      await db.execute(
        sql`INSERT INTO spec_field_translations (spec_field_id, locale, label)
            VALUES (${sf.id}::uuid, ${loc}, ${label})`,
      );
    }
  }

  // 7. spec_field_enum_option rows for the `material` enum field.
  const enumOptionIds = {
    steel: '00000000-0000-4000-8000-00000000e001',
    brass: '00000000-0000-4000-8000-00000000e002',
    inox: '00000000-0000-4000-8000-00000000e003',
  };
  await db.execute(
    sql`INSERT INTO spec_field_enum_option (id, spec_field_id, key, sort_order) VALUES
        (${enumOptionIds.steel}::uuid, ${ID.specMaterial}::uuid, 'steel', 0),
        (${enumOptionIds.brass}::uuid, ${ID.specMaterial}::uuid, 'brass', 1),
        (${enumOptionIds.inox}::uuid, ${ID.specMaterial}::uuid, 'inox', 2)`,
  );
  const enumLabels: Record<
    'steel' | 'brass' | 'inox',
    Record<Locale, string>
  > = {
    steel: { uz: 'Poʻlat', ru: 'Сталь', en: 'Steel' },
    brass: { uz: 'Latun', ru: 'Латунь', en: 'Brass' },
    inox: {
      uz: 'Nerjaveyka poʻlat',
      ru: 'Нержавеющая сталь',
      en: 'Stainless steel',
    },
  };
  for (const opt of ['steel', 'brass', 'inox'] as const) {
    for (const loc of LOCALES) {
      await db.execute(
        sql`INSERT INTO spec_field_enum_option_translations (option_id, locale, label)
            VALUES (${enumOptionIds[opt]}::uuid, ${loc}, ${enumLabels[opt][loc]})`,
      );
    }
  }

  // 8. Products — 3 manometers + 3 transmitters, status='published'.
  //    Wave-0 columns only — product media array columns land in Plan 02.
  for (const p of MANOMETER_PRODUCTS) {
    await db.execute(
      sql`INSERT INTO product (id, category_id, manufacturer_id, sku, status, published_at)
          VALUES (${p.id}::uuid, ${ID.categoryManometers}::uuid, ${p.manufacturerId}::uuid, ${p.sku}, 'published', now())`,
    );
  }
  for (const p of TRANSMITTER_PRODUCTS) {
    await db.execute(
      sql`INSERT INTO product (id, category_id, manufacturer_id, sku, status, published_at)
          VALUES (${p.id}::uuid, ${ID.categoryTransmitters}::uuid, ${p.manufacturerId}::uuid, ${p.sku}, 'published', now())`,
    );
  }

  // 9. Product translations — 3 locales × 6 products = 18 rows.
  for (const p of [...MANOMETER_PRODUCTS, ...TRANSMITTER_PRODUCTS]) {
    for (const loc of LOCALES) {
      const c = p.copy[loc];
      await db.execute(
        sql`INSERT INTO product_translations (product_id, locale, name, slug, short_desc, long_desc)
            VALUES (${p.id}::uuid, ${loc}, ${c.name}, ${c.slug}, ${c.shortDesc}, ${c.longDesc})`,
      );
    }
  }

  // 10. Product spec values — 3 spec values per manometer (pressure_max +
  //     material + certified). Numeric stored in num_value; enum key
  //     stored in enum_value (references spec_field_enum_option.key);
  //     bool in bool_value.
  for (const p of MANOMETER_PRODUCTS) {
    await db.execute(
      sql`INSERT INTO product_spec_values
            (product_id, spec_field_id, is_extra, num_value, unit, sort_order)
          VALUES
            (${p.id}::uuid, ${ID.specPressureMax}::uuid, false, ${p.pressureMax}, 'bar', 0)`,
    );
    await db.execute(
      sql`INSERT INTO product_spec_values
            (product_id, spec_field_id, is_extra, enum_value, sort_order)
          VALUES
            (${p.id}::uuid, ${ID.specMaterial}::uuid, false, ${p.material}, 1)`,
    );
    await db.execute(
      sql`INSERT INTO product_spec_values
            (product_id, spec_field_id, is_extra, bool_value, sort_order)
          VALUES
            (${p.id}::uuid, ${ID.specCertified}::uuid, false, ${p.certified}, 2)`,
    );
  }

  // product_search rows: NOT written. Plan 02 Task 2.3 adds the tsvector
  // rebuild to saveProduct(); SRCH-* tests will trigger that path
  // explicitly when un-skipped.

  return {
    categoryIds: {
      manometers: ID.categoryManometers,
      transmitters: ID.categoryTransmitters,
    },
    manufacturerIds: {
      wika: ID.manufacturerWika,
      bd: ID.manufacturerBd,
      metran: ID.manufacturerMetran,
    },
    productIds: [
      ID.productM100,
      ID.productM200,
      ID.productM300,
      ID.productT100,
      ID.productT200,
      ID.productT300,
    ],
    specFieldIds: {
      pressureMax: ID.specPressureMax,
      material: ID.specMaterial,
      certified: ID.specCertified,
    },
  };
}

export async function teardownPublicFixture(
  ids: PublicFixtureIds,
): Promise<void> {
  const db = await getTestDb();
  // Reverse-FK order. category/manufacturer/product translations cascade
  // from their parent rows on DELETE; spec values cascade from product;
  // spec_field_enum_option_translations cascade from spec_field_enum_option;
  // spec_field_enum_option cascades from spec_field. Explicit DELETEs are
  // belt-and-braces for partial-failure recovery.

  const allProductIds = ids.productIds;
  // Audit log + product_spec_value_translations (compound FK) — defensive.
  for (const pid of allProductIds) {
    await db.execute(
      sql`DELETE FROM product_spec_value_translations
           WHERE value_id IN (SELECT id FROM product_spec_values WHERE product_id = ${pid}::uuid)`,
    );
    await db.execute(
      sql`DELETE FROM product_spec_values WHERE product_id = ${pid}::uuid`,
    );
    await db.execute(
      sql`DELETE FROM product_translations WHERE product_id = ${pid}::uuid`,
    );
    await db.execute(sql`DELETE FROM product WHERE id = ${pid}::uuid`);
  }

  // Spec fields (cascade their translations + enum options).
  for (const sfId of [
    ids.specFieldIds.pressureMax,
    ids.specFieldIds.material,
    ids.specFieldIds.certified,
  ]) {
    await db.execute(sql`DELETE FROM spec_field WHERE id = ${sfId}::uuid`);
  }

  // Manufacturers (cascade their translations).
  for (const mid of [
    ids.manufacturerIds.wika,
    ids.manufacturerIds.bd,
    ids.manufacturerIds.metran,
  ]) {
    await db.execute(sql`DELETE FROM manufacturer WHERE id = ${mid}::uuid`);
  }

  // Categories (cascade their translations).
  for (const cid of [ids.categoryIds.manometers, ids.categoryIds.transmitters]) {
    await db.execute(sql`DELETE FROM category WHERE id = ${cid}::uuid`);
  }
}
