// Plan 03-08 Task 8.1 — shared sitemap helpers (SEO-03).
//
// Three exports consumed by the per-locale sitemap route handlers
// (sitemap-uz.xml / sitemap-ru.xml / sitemap-en.xml):
//
//   1. buildLocaleSitemapEntries(locale)
//        Returns every URL the per-locale sitemap should advertise:
//        - 3 static paths: /<locale>, /<locale>/categories, /<locale>/manufacturers
//        - every published product (status='published') with its current-locale slug
//        - every category with its current-locale slug
//        - every manufacturer with its current-locale slug
//        Each entry carries `alternates` — the per-locale slug map so the
//        XML renderer can emit <xhtml:link rel="alternate" hreflang="..."> tags
//        for all 3 locales (Search Console hreflang signal — closes SEO-03 +
//        feeds the Phase-5 International Targeting validation gate).
//
//   2. renderUrlsetXml(entries)
//        Pure XML renderer — no DB access. Builds the <urlset> envelope
//        with sitemaps + xhtml schemas, emits one <url> per entry with
//        <loc>, optional <lastmod>, and one <xhtml:link rel="alternate"
//        hreflang="..."> per non-null alternate locale. Adds an x-default
//        alternate pointing to the uz variant (project's default locale per
//        proxy.ts).
//
//   3. escapeXml(s)
//        Injection-safe escaper for &, <, >, ", '. Applied to every dynamic
//        value (loc URLs and href attributes) — defense in depth on top of
//        slug normalization in src/lib/slug.ts (which already strips XML
//        special characters at write-time). T-03-08-01 mitigation.
//
// Cache + invalidation contract:
//   - 'use cache' wraps buildLocaleSitemapEntries so DB queries hit the cache
//     and only re-run when revalidateTag('sitemap', 'max') fires.
//   - cacheTag('sitemap') is the single tag — Phase 2 helpers
//     (revalidateProduct / revalidateCategory / revalidateManufacturer in
//     src/lib/revalidation.ts) already fan out 'sitemap' on every mutation.
//
// Pitfall #2 (only primitives cross the cache boundary): the helper takes
// a single `locale` primitive; everything else is resolved internally.

import { sql } from 'drizzle-orm';
import { cacheTag } from 'next/cache';
import { db } from '@/db/client';

export type Locale = 'uz' | 'ru' | 'en';

const HOST = 'https://manometr.uz';
const ALL_LOCALES: Locale[] = ['uz', 'ru', 'en'];

export interface SitemapEntry {
  /** Absolute URL for the current locale variant. */
  loc: string;
  /** ISO-8601 timestamp; omitted on static paths that have no DB row. */
  lastmod?: string;
  /** Per-locale slug map → absolute URLs. Drives <xhtml:link rel="alternate" hreflang="..."> emission. */
  alternates: Partial<Record<Locale, string>>;
}

/* -----------------------------------------------------------------------------
 * Per-locale entry builder (SEO-03)
 * ---------------------------------------------------------------------------*/

export async function buildLocaleSitemapEntries(
  locale: Locale,
): Promise<SitemapEntry[]> {
  'use cache';
  cacheTag('sitemap');

  const entries: SitemapEntry[] = [];

  // ── Static paths ─────────────────────────────────────────────────────────
  // Root index, category index, manufacturer index — same path shape across
  // all 3 locales so the alternates map is built by simple substitution.
  for (const staticPath of [
    '',
    '/categories',
    '/manufacturers',
    '/recipes',
  ] as const) {
    const alternates: Partial<Record<Locale, string>> = {};
    for (const l of ALL_LOCALES) {
      alternates[l] = `${HOST}/${l}${staticPath}`;
    }
    entries.push({
      loc: `${HOST}/${locale}${staticPath}`,
      alternates,
    });
  }

  // ── Products (T-03-08-02 — only published rows) ─────────────────────────
  // GROUP BY product to collect all 3 locale slugs in one row so we can
  // emit alternates without a second round-trip per product.
  const productRows = await db.execute<{
    id: string;
    updated_at: Date | string;
    slug_uz: string | null;
    slug_ru: string | null;
    slug_en: string | null;
  }>(sql`
    SELECT p.id, p.updated_at,
           MAX(CASE WHEN t.locale='uz' THEN t.slug END) AS slug_uz,
           MAX(CASE WHEN t.locale='ru' THEN t.slug END) AS slug_ru,
           MAX(CASE WHEN t.locale='en' THEN t.slug END) AS slug_en
    FROM product p
    JOIN product_translations t ON t.product_id = p.id
    WHERE p.status = 'published'
    GROUP BY p.id, p.updated_at
  `);
  for (const r of productRows.rows) {
    const localeSlug = pickSlug(r, locale);
    if (!localeSlug) continue; // skip if current-locale translation missing
    entries.push({
      loc: `${HOST}/${locale}/products/${localeSlug}`,
      lastmod: toIso(r.updated_at),
      alternates: buildAlternates(r, '/products'),
    });
  }

  // ── Categories ──────────────────────────────────────────────────────────
  const categoryRows = await db.execute<{
    id: string;
    updated_at: Date | string;
    slug_uz: string | null;
    slug_ru: string | null;
    slug_en: string | null;
  }>(sql`
    SELECT c.id, c.updated_at,
           MAX(CASE WHEN ct.locale='uz' THEN ct.slug END) AS slug_uz,
           MAX(CASE WHEN ct.locale='ru' THEN ct.slug END) AS slug_ru,
           MAX(CASE WHEN ct.locale='en' THEN ct.slug END) AS slug_en
    FROM category c
    JOIN category_translations ct ON ct.category_id = c.id
    GROUP BY c.id, c.updated_at
  `);
  for (const r of categoryRows.rows) {
    const localeSlug = pickSlug(r, locale);
    if (!localeSlug) continue;
    entries.push({
      loc: `${HOST}/${locale}/categories/${localeSlug}`,
      lastmod: toIso(r.updated_at),
      alternates: buildAlternates(r, '/categories'),
    });
  }

  // ── Manufacturers ───────────────────────────────────────────────────────
  const mfgRows = await db.execute<{
    id: string;
    updated_at: Date | string;
    slug_uz: string | null;
    slug_ru: string | null;
    slug_en: string | null;
  }>(sql`
    SELECT m.id, m.updated_at,
           MAX(CASE WHEN mt.locale='uz' THEN mt.slug END) AS slug_uz,
           MAX(CASE WHEN mt.locale='ru' THEN mt.slug END) AS slug_ru,
           MAX(CASE WHEN mt.locale='en' THEN mt.slug END) AS slug_en
    FROM manufacturer m
    JOIN manufacturer_translations mt ON mt.manufacturer_id = m.id
    GROUP BY m.id, m.updated_at
  `);
  for (const r of mfgRows.rows) {
    const localeSlug = pickSlug(r, locale);
    if (!localeSlug) continue;
    entries.push({
      loc: `${HOST}/${locale}/manufacturers/${localeSlug}`,
      lastmod: toIso(r.updated_at),
      alternates: buildAlternates(r, '/manufacturers'),
    });
  }

  // ── Recipes (Plan 04-09; T-04-INFO-01 — only published rows) ────────────
  // Same GROUP BY pattern as products: collect all 3 locale slugs in one row
  // so alternates emit without a second round-trip.
  const recipeRows = await db.execute<{
    id: string;
    updated_at: Date | string;
    slug_uz: string | null;
    slug_ru: string | null;
    slug_en: string | null;
  }>(sql`
    SELECT r.id, r.updated_at,
           MAX(CASE WHEN rt.locale='uz' THEN rt.slug END) AS slug_uz,
           MAX(CASE WHEN rt.locale='ru' THEN rt.slug END) AS slug_ru,
           MAX(CASE WHEN rt.locale='en' THEN rt.slug END) AS slug_en
    FROM recipe r
    JOIN recipe_translations rt ON rt.recipe_id = r.id
    WHERE r.status = 'published'
    GROUP BY r.id, r.updated_at
  `);
  for (const r of recipeRows.rows) {
    const localeSlug = pickSlug(r, locale);
    if (!localeSlug) continue; // skip if current-locale translation missing
    entries.push({
      loc: `${HOST}/${locale}/recipes/${localeSlug}`,
      lastmod: toIso(r.updated_at),
      alternates: buildAlternates(r, '/recipes'),
    });
  }

  return entries;
}

/* -----------------------------------------------------------------------------
 * XML rendering (pure)
 * ---------------------------------------------------------------------------*/

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderUrlsetXml(entries: SitemapEntry[]): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  );
  for (const e of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(e.loc)}</loc>`);
    if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
    for (const l of ALL_LOCALES) {
      const url = e.alternates[l];
      if (url) {
        lines.push(
          `    <xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(url)}"/>`,
        );
      }
    }
    // x-default points to the uz variant (project default locale per proxy.ts).
    if (e.alternates.uz) {
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(e.alternates.uz)}"/>`,
      );
    }
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return lines.join('\n');
}

/* -----------------------------------------------------------------------------
 * Internal helpers
 * ---------------------------------------------------------------------------*/

function pickSlug(
  row: { slug_uz: string | null; slug_ru: string | null; slug_en: string | null },
  locale: Locale,
): string | null {
  if (locale === 'uz') return row.slug_uz;
  if (locale === 'ru') return row.slug_ru;
  return row.slug_en;
}

function buildAlternates(
  row: { slug_uz: string | null; slug_ru: string | null; slug_en: string | null },
  pathPrefix: string,
): Partial<Record<Locale, string>> {
  const alternates: Partial<Record<Locale, string>> = {};
  for (const l of ALL_LOCALES) {
    const s = pickSlug(row, l);
    if (s) alternates[l] = `${HOST}/${l}${pathPrefix}/${s}`;
  }
  return alternates;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  // Drizzle's neon-http driver typically returns timestamps as strings — try
  // to parse so the emitted lastmod is a clean ISO-8601 value.
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return undefined;
}
