// Plan 03-01 Task 1.2 + Plan 03-02 Task 2.3 — seedPublicFixture()
// deterministic public-side seed.
//
// Purpose: every Phase-3 downstream plan (02–08) un-skips test stubs that
// expect a stable public-side fixture: 3 manufacturers (WIKA, BD Sensors,
// Метран), 6 published products spread across 2 categories (manometers +
// pressure transmitters), all 3 locales each. Deterministic UUIDs let
// Playwright e2e specs hardcode slugs and IDs without coupling to runtime
// state — the same seed produces the same rows every test run.
//
// Plan 02 (this plan) extends the fixture to populate the columns added by
// the additive migration 0002_phase3_media_search_manufacturer:
//   - product.image_public_ids — gallery hero + side per product
//   - product.datasheet_public_ids — one datasheet per product
//   - manufacturer.is_official_rep — true for WIKA only (per D-11)
//   - manufacturer_translations.relationship_note — per-locale text on WIKA
//
// product_search rows: NOT written here. saveProduct()/duplicateProduct()
// own the rebuild path (rebuildProductSearch helper, Phase 3 Step 6). Tests
// that exercise search call saveProduct() after seeding to trigger the
// rebuild — keeps the fixture decoupled from FTS shape.
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
//
// Plan 03-04 Rule 1 fix: original Plan-01 IDs used non-hex letters (m/p/s)
// in the suffix, which Postgres uuid type rejects with code 22P02. Replaced
// with hex-only ranges:
//   - 0x0c00..0x0cff for categories
//   - 0x0d00..0x0dff for manufacturers (d = dispatcher)
//   - 0x0e00..0x0eff for products (e = entity)
//   - 0x0fa0..0x0fff for spec_field rows (f = field)
//   - 0xea00..0xeaff for enum_option rows
const ID = {
  categoryManometers: '00000000-0000-4000-8000-000000000c01',
  categoryTransmitters: '00000000-0000-4000-8000-000000000c02',
  manufacturerWika: '00000000-0000-4000-8000-000000000d01',
  manufacturerBd: '00000000-0000-4000-8000-000000000d02',
  manufacturerMetran: '00000000-0000-4000-8000-000000000d03',
  productM100: '00000000-0000-4000-8000-000000000e01',
  productM200: '00000000-0000-4000-8000-000000000e02',
  productM300: '00000000-0000-4000-8000-000000000e03',
  productT100: '00000000-0000-4000-8000-000000000e04',
  productT200: '00000000-0000-4000-8000-000000000e05',
  productT300: '00000000-0000-4000-8000-000000000e06',
  specPressureMax: '00000000-0000-4000-8000-000000000fa1',
  specMaterial: '00000000-0000-4000-8000-000000000fa2',
  specCertified: '00000000-0000-4000-8000-000000000fa3',
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

// Plan 03-02 Task 2.3: per-manufacturer translation rows now carry the
// nullable per-locale relationship_note column (D-11). Only WIKA has a
// populated relationship note in the fixture — the other two manufacturers
// pass null, exercising the nullable-text shape end-to-end.
const MANUFACTURER_TRANSLATIONS: Record<
  'wika' | 'bd' | 'metran',
  Record<
    Locale,
    {
      name: string;
      slug: string;
      description: string;
      relationshipNote: string | null;
    }
  >
> = {
  wika: {
    uz: {
      name: 'WIKA',
      slug: 'wika',
      description: 'WIKA — bosim oʻlchash uskunalari ishlab chiqaruvchi.',
      relationshipNote:
        'Manometr — WIKA ning Oʻzbekistondagi rasmiy vakili 2019-yildan beri.',
    },
    ru: {
      name: 'WIKA',
      slug: 'wika-ru',
      description: 'WIKA — производитель приборов измерения давления.',
      relationshipNote:
        'Официальный представитель WIKA в Узбекистане с 2019 г.',
    },
    en: {
      name: 'WIKA',
      slug: 'wika-en',
      description: 'WIKA — manufacturer of pressure measurement instruments.',
      relationshipNote:
        'Authorized WIKA representative in Uzbekistan since 2019.',
    },
  },
  bd: {
    uz: {
      name: 'BD Sensors',
      slug: 'bd-sensors',
      description: 'BD Sensors — sanoat datchiklari ishlab chiqaruvchi.',
      relationshipNote: null,
    },
    ru: {
      name: 'BD Sensors',
      slug: 'bd-sensors-ru',
      description: 'BD Sensors — производитель промышленных датчиков.',
      relationshipNote: null,
    },
    en: {
      name: 'BD Sensors',
      slug: 'bd-sensors-en',
      description: 'BD Sensors — manufacturer of industrial sensors.',
      relationshipNote: null,
    },
  },
  metran: {
    uz: {
      name: 'Метран',
      slug: 'metran',
      description: 'Метран — Rossiya bosim oʻlchash kompaniyasi.',
      relationshipNote: null,
    },
    ru: {
      name: 'Метран',
      slug: 'metran-ru',
      description: 'Метран — российская компания по измерению давления.',
      relationshipNote: null,
    },
    en: {
      name: 'Metran',
      slug: 'metran-en',
      description: 'Metran — Russian pressure measurement company.',
      relationshipNote: null,
    },
  },
};

export async function seedPublicFixture(): Promise<PublicFixtureIds> {
  const db = await getTestDb();

  // Plan 03-04 Rule 1 fix: defensive pre-cleanup so re-runs after a partial
  // seed/teardown failure don't blow up on PK conflicts. Order respects FK
  // dependencies (children before parents).
  await db.execute(
    sql`DELETE FROM product_search WHERE product_id IN (
        ${ID.productM100}::uuid, ${ID.productM200}::uuid, ${ID.productM300}::uuid,
        ${ID.productT100}::uuid, ${ID.productT200}::uuid, ${ID.productT300}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM product_spec_value_translations WHERE value_id IN (
        SELECT id FROM product_spec_values WHERE product_id IN (
        ${ID.productM100}::uuid, ${ID.productM200}::uuid, ${ID.productM300}::uuid,
        ${ID.productT100}::uuid, ${ID.productT200}::uuid, ${ID.productT300}::uuid))`,
  );
  await db.execute(
    sql`DELETE FROM product_spec_values WHERE product_id IN (
        ${ID.productM100}::uuid, ${ID.productM200}::uuid, ${ID.productM300}::uuid,
        ${ID.productT100}::uuid, ${ID.productT200}::uuid, ${ID.productT300}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM product_translations WHERE product_id IN (
        ${ID.productM100}::uuid, ${ID.productM200}::uuid, ${ID.productM300}::uuid,
        ${ID.productT100}::uuid, ${ID.productT200}::uuid, ${ID.productT300}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM product WHERE id IN (
        ${ID.productM100}::uuid, ${ID.productM200}::uuid, ${ID.productM300}::uuid,
        ${ID.productT100}::uuid, ${ID.productT200}::uuid, ${ID.productT300}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM spec_field WHERE id IN (
        ${ID.specPressureMax}::uuid, ${ID.specMaterial}::uuid, ${ID.specCertified}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM manufacturer WHERE id IN (
        ${ID.manufacturerWika}::uuid, ${ID.manufacturerBd}::uuid, ${ID.manufacturerMetran}::uuid)`,
  );
  await db.execute(
    sql`DELETE FROM category WHERE id IN (
        ${ID.categoryManometers}::uuid, ${ID.categoryTransmitters}::uuid)`,
  );

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

  // 3. Manufacturers (3 rows). WIKA has is_official_rep=true (D-11) — the
  //    other two are explicitly false. Default would be false but we set
  //    explicitly so re-seeding doesn't drift if defaults change.
  await db.execute(
    sql`INSERT INTO manufacturer (id, logo_public_id, website_url, is_official_rep) VALUES
        (${ID.manufacturerWika}::uuid, NULL, 'https://www.wika.com', true),
        (${ID.manufacturerBd}::uuid, NULL, 'https://www.bdsensors.de', false),
        (${ID.manufacturerMetran}::uuid, NULL, 'https://www.metran.ru', false)`,
  );

  // 4. Manufacturer translations (3 locales × 3 manufacturers = 9 rows).
  //    Plan 02 Task 2.3: relationship_note populated for WIKA (per-locale)
  //    and NULL for the other two manufacturers — exercises both halves of
  //    the nullable column.
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
        sql`INSERT INTO manufacturer_translations (manufacturer_id, locale, name, slug, description, relationship_note)
            VALUES (${mfgId}::uuid, ${loc}, ${tr.name}, ${tr.slug}, ${tr.description}, ${tr.relationshipNote})`,
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
    steel: '00000000-0000-4000-8000-00000000ea01',
    brass: '00000000-0000-4000-8000-00000000ea02',
    inox: '00000000-0000-4000-8000-00000000ea03',
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
  //    Plan 02 Task 2.3: image_public_ids + datasheet_public_ids arrays
  //    populated per product. Each product gets a hero + side image and a
  //    datasheet PDF stored under the deterministic prefix
  //    `manometr/seed/<sku>/...`. Pure fixture data — no actual Cloudinary
  //    asset is required for unit tests; e2e tests that hit Cloudinary
  //    use a real upload sequence (out of scope here).
  // Plan 03-04 Rule 1 fix: Drizzle's sql`` interpolates a JS array as a
  // tuple ($1, $2), not as a Postgres ARRAY literal. Use ARRAY[...] explicitly
  // (or a literal '{...}' string cast) so text[] columns receive the correct
  // shape. We build the ARRAY expression with sql.join + sql.raw so each
  // element is still parameterized.
  for (const p of MANOMETER_PRODUCTS) {
    const heroId = `manometr/seed/${p.sku}/hero`;
    const sideId = `manometr/seed/${p.sku}/side`;
    const dsId = `manometr/seed/${p.sku}/datasheet`;
    await db.execute(
      sql`INSERT INTO product (id, category_id, manufacturer_id, sku, status, published_at, image_public_ids, datasheet_public_ids)
          VALUES (${p.id}::uuid, ${ID.categoryManometers}::uuid, ${p.manufacturerId}::uuid, ${p.sku}, 'published', now(),
                  ARRAY[${heroId}, ${sideId}]::text[],
                  ARRAY[${dsId}]::text[])`,
    );
  }
  for (const p of TRANSMITTER_PRODUCTS) {
    const heroId = `manometr/seed/${p.sku}/hero`;
    const sideId = `manometr/seed/${p.sku}/side`;
    const dsId = `manometr/seed/${p.sku}/datasheet`;
    await db.execute(
      sql`INSERT INTO product (id, category_id, manufacturer_id, sku, status, published_at, image_public_ids, datasheet_public_ids)
          VALUES (${p.id}::uuid, ${ID.categoryTransmitters}::uuid, ${p.manufacturerId}::uuid, ${p.sku}, 'published', now(),
                  ARRAY[${heroId}, ${sideId}]::text[],
                  ARRAY[${dsId}]::text[])`,
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
  // Plan 02 Task 2.3: also drop product_search rows that downstream tests
  // may have populated by calling saveProduct() against the seeded
  // products.
  for (const pid of allProductIds) {
    await db.execute(
      sql`DELETE FROM product_search WHERE product_id = ${pid}::uuid`,
    );
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
