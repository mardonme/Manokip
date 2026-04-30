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
