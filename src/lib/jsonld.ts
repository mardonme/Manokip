// Plan 03-03 Task 3.1 — Typed JSON-LD helpers (CAT-08, D-08, D-09).
//
// Four schema-dts-typed factory functions emitted as <script type="application/ld+json">
// by RSC pages. Per Phase 3 D-08 the Product helper deliberately omits `offers` and
// `aggregateRating` — Manometr is informational, not transactional. Per D-09 the
// Phase-3 set is exactly Product + Organization + BreadcrumbList + CollectionPage.
//
// Cloudinary URL: image is built from NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and the
// product hero `public_id`. Uses f_auto,q_auto,w_800 — same transformation that
// downstream <CldImage> uses for the hero LCP, so crawlers and renderers agree.

import type {
  Product,
  Organization,
  BreadcrumbList,
  CollectionPage,
  TechArticle,
  WithContext,
  ListItem,
} from 'schema-dts';

const HOST = 'https://manometr.uz';
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

export interface ProductJsonLdInput {
  name: string;
  sku?: string | null;
  shortDesc?: string | null;
  heroPublicId?: string | null;
  manufacturerName?: string | null;
}

export function productJsonLd(p: ProductJsonLdInput): WithContext<Product> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    ...(p.sku ? { sku: p.sku } : {}),
    ...(p.shortDesc ? { description: p.shortDesc } : {}),
    ...(p.heroPublicId
      ? {
          image: `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,w_800/${p.heroPublicId}`,
        }
      : {}),
    ...(p.manufacturerName
      ? { brand: { '@type': 'Organization', name: p.manufacturerName } }
      : {}),
  };
}

export function organizationJsonLd(): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Manometr',
    url: HOST,
  };
}

export interface Breadcrumb {
  name: string;
  url: string;
}

export function breadcrumbJsonLd(
  crumbs: Breadcrumb[],
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(
      (c, i): ListItem => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: c.url,
      }),
    ),
  };
}

export function collectionPageJsonLd(
  name: string,
  urls: string[],
): WithContext<CollectionPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    hasPart: urls.map((u) => ({ '@type': 'WebPage', url: u })),
  };
}

// Plan 04-03 Task 3.1 — TechArticle helper for recipes + industry pages
// (CONT-06 / D-10).
//
// Field set per RESEARCH §TechArticle JSON-LD field set (lines 547-583): every
// recommended Article-subtype property Google's Rich Results Test scores. Author
// = publisher = Manometr Organization (single-author posture for v1). Optional
// fields conditional-spread so a minimal input renders compact JSON.
//
// Hero image uses w_1200 (vs w_800 in productJsonLd) — recipe / industry hero
// images render at a wider crop than product gallery thumbnails. Same f_auto,q_auto
// tuple as Phase 3 productJsonLd at jsonld.ts:41 so crawlers + the public
// <CldImage> hero render agree on the URL.
//
// `mentions` array references linked products as Product sub-objects with
// `{name, url}` only — NO `offers` field (Phase 3 D-08 stance carries forward;
// Manometr is informational, not transactional). Empty / undefined mentions
// omits the field entirely rather than emitting an empty array.
//
// Caveat (D-10): Schema.org scopes TechArticle to how-to / step-by-step / specs;
// industry vertical landing pages would technically fit `Article` better. We
// emit TechArticle for both per locked decision; the manual Yandex gate in
// plan 04-12 validates whether Yandex parses cleanly. Switching industries to
// `Article` is a 1-line `@type` change in a v1.1 follow-up if Yandex flags it.
export interface TechArticleJsonLdInput {
  headline: string;
  excerpt?: string | null;
  featuredImagePublicId?: string | null;
  /** ISO 8601 — recipe.publishedAt / industry.publishedAt. */
  datePublished: string;
  /** ISO 8601 — recipe.updatedAt / industry.updatedAt. */
  dateModified: string;
  inLanguage: 'uz' | 'ru' | 'en';
  /** Per-locale canonical URL (matches Phase 3 SEO-02 hreflang shape). */
  canonicalUrl: string;
  /**
   * Optional linked-products mentions (D-10). Each entry becomes a
   * `{ '@type': 'Product', name, url }` sub-object — NO `offers` (Phase 3
   * D-08 stance).
   */
  mentions?: Array<{ name: string; url: string }>;
}

export function techArticleJsonLd(
  input: TechArticleJsonLdInput,
): WithContext<TechArticle> {
  const publisher: Organization = {
    '@type': 'Organization',
    name: 'Manometr',
    url: HOST,
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: input.headline,
    inLanguage: input.inLanguage,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: publisher,
    publisher,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.canonicalUrl },
    ...(input.excerpt ? { description: input.excerpt } : {}),
    ...(input.featuredImagePublicId
      ? {
          image: `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,w_1200/${input.featuredImagePublicId}`,
        }
      : {}),
    ...(input.mentions && input.mentions.length > 0
      ? {
          mentions: input.mentions.map((m) => ({
            '@type': 'Product',
            name: m.name,
            url: m.url,
          })),
        }
      : {}),
  };
}
