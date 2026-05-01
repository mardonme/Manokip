// Plan 03-03 Task 3.1 — GREEN spec for CAT-08 (JSON-LD helpers).
//
// Validates D-08 (no offers on Product) and D-09 (4 helpers: Product,
// Organization, BreadcrumbList, CollectionPage). Closed by Plan 03.
//
// Plan 04-03 Task 3.1 — extends with techArticleJsonLd (CONT-06 / D-10).
// 3 specs added: minimal recipe input (no description/image/mentions);
// full input with featuredImagePublicId (Cloudinary URL with f_auto,q_auto,w_1200);
// with mentions=[{name,url}] (Product sub-objects, no offers per Phase 3 D-08).

import { describe, it, expect } from 'vitest';

import {
  productJsonLd,
  organizationJsonLd,
  breadcrumbJsonLd,
  collectionPageJsonLd,
  techArticleJsonLd,
} from '@/lib/jsonld';

describe('jsonld helpers (CAT-08, closed by plan 03)', () => {
  it('productJsonLd returns @type=Product without offers (D-08)', () => {
    const json = productJsonLd({
      name: 'WIKA EN 837-1 Gauge',
      sku: 'WIKA-100',
      shortDesc: 'Bourdon tube manometer',
      heroPublicId: 'manometr/products/hero',
      manufacturerName: 'WIKA',
    });
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('Product');
    expect(json.name).toBe('WIKA EN 837-1 Gauge');
    expect(json.sku).toBe('WIKA-100');
    expect(json.description).toBe('Bourdon tube manometer');
    expect(typeof json.image).toBe('string');
    expect(json.image as string).toContain(
      '/image/upload/f_auto,q_auto,w_800/manometr/products/hero',
    );
    expect(json.brand).toEqual({ '@type': 'Organization', name: 'WIKA' });
    // D-08: no offers, no aggregateRating
    expect(Object.prototype.hasOwnProperty.call(json, 'offers')).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(json, 'aggregateRating'),
    ).toBe(false);
  });

  it('productJsonLd omits optional fields when not provided', () => {
    const json = productJsonLd({ name: 'Bare Product' });
    expect(json['@type']).toBe('Product');
    expect(json.name).toBe('Bare Product');
    expect(Object.prototype.hasOwnProperty.call(json, 'sku')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(json, 'description')).toBe(
      false,
    );
    expect(Object.prototype.hasOwnProperty.call(json, 'image')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(json, 'brand')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(json, 'offers')).toBe(false);
  });

  it('organizationJsonLd returns @type=Organization with name=Manometr', () => {
    // schema-dts types Organization as a union (string | OrganizationLeaf);
    // cast to a structural shape for runtime assertion.
    const json = organizationJsonLd() as unknown as {
      '@context': string;
      '@type': string;
      name: string;
      url: string;
    };
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('Organization');
    expect(json.name).toBe('Manometr');
    expect(json.url).toBe('https://manometr.uz');
  });

  it('breadcrumbJsonLd returns @type=BreadcrumbList with positioned items', () => {
    const json = breadcrumbJsonLd([
      { name: 'Home', url: 'https://manometr.uz/uz' },
      { name: 'Catalog', url: 'https://manometr.uz/uz/categories' },
      {
        name: 'Manometers',
        url: 'https://manometr.uz/uz/categories/manometers',
      },
    ]);
    expect(json['@type']).toBe('BreadcrumbList');
    expect(Array.isArray(json.itemListElement)).toBe(true);
    expect((json.itemListElement as unknown[]).length).toBe(3);
    const items = json.itemListElement as Array<{
      '@type': string;
      position: number;
      name: string;
      item: string;
    }>;
    expect(items[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://manometr.uz/uz',
    });
    expect(items[1]?.position).toBe(2);
    expect(items[2]?.position).toBe(3);
  });

  it('techArticleJsonLd returns minimal TechArticle without optional fields (recipe minimal input)', () => {
    const json = techArticleJsonLd({
      headline: 'How to choose a manometer for steam systems',
      datePublished: '2026-04-15T10:00:00.000Z',
      dateModified: '2026-04-20T14:30:00.000Z',
      inLanguage: 'uz',
      canonicalUrl:
        'https://manometr.uz/uz/recipes/how-to-choose-manometer-steam',
    });
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('TechArticle');
    // schema-dts types many fields as unions; cast to a structural shape.
    const j = json as unknown as Record<string, unknown>;
    expect(j.headline).toBe('How to choose a manometer for steam systems');
    expect(j.datePublished).toBe('2026-04-15T10:00:00.000Z');
    expect(j.dateModified).toBe('2026-04-20T14:30:00.000Z');
    expect(j.inLanguage).toBe('uz');
    expect(j.author).toEqual({
      '@type': 'Organization',
      name: 'Manometr',
      url: 'https://manometr.uz',
    });
    expect(j.publisher).toEqual({
      '@type': 'Organization',
      name: 'Manometr',
      url: 'https://manometr.uz',
    });
    expect(j.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id':
        'https://manometr.uz/uz/recipes/how-to-choose-manometer-steam',
    });
    // No optional fields when their inputs are absent (conditional spreading).
    expect(Object.prototype.hasOwnProperty.call(j, 'description')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(j, 'image')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(j, 'mentions')).toBe(false);
  });

  it('techArticleJsonLd builds Cloudinary w_1200 image URL when featuredImagePublicId present', () => {
    const json = techArticleJsonLd({
      headline: 'Calibration intervals for pressure transmitters',
      excerpt: 'Recommended calibration cadence for food processing.',
      featuredImagePublicId: 'manometr/recipes/calibration-hero',
      datePublished: '2026-04-10T08:00:00.000Z',
      dateModified: '2026-04-12T11:00:00.000Z',
      inLanguage: 'ru',
      canonicalUrl: 'https://manometr.uz/ru/recipes/calibration-intervals',
    });
    const j = json as unknown as Record<string, unknown>;
    expect(j.description).toBe(
      'Recommended calibration cadence for food processing.',
    );
    expect(typeof j.image).toBe('string');
    expect(j.image as string).toContain(
      '/image/upload/f_auto,q_auto,w_1200/manometr/recipes/calibration-hero',
    );
    expect(j.image as string).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  });

  it('techArticleJsonLd emits mentions array as Product sub-objects without offers (D-10 + Phase 3 D-08 stance)', () => {
    const json = techArticleJsonLd({
      headline: 'Wetted-parts compatibility chart',
      datePublished: '2026-04-01T00:00:00.000Z',
      dateModified: '2026-04-05T00:00:00.000Z',
      inLanguage: 'en',
      canonicalUrl:
        'https://manometr.uz/en/recipes/wetted-parts-compatibility',
      mentions: [
        {
          name: 'Manometer X',
          url: 'https://manometr.uz/uz/products/manometer-x',
        },
        {
          name: 'Pressure Transmitter Y',
          url: 'https://manometr.uz/uz/products/pressure-transmitter-y',
        },
      ],
    });
    const j = json as unknown as Record<string, unknown>;
    expect(Array.isArray(j.mentions)).toBe(true);
    const mentions = j.mentions as Array<Record<string, unknown>>;
    expect(mentions.length).toBe(2);
    expect(mentions[0]).toEqual({
      '@type': 'Product',
      name: 'Manometer X',
      url: 'https://manometr.uz/uz/products/manometer-x',
    });
    expect(mentions[1]).toEqual({
      '@type': 'Product',
      name: 'Pressure Transmitter Y',
      url: 'https://manometr.uz/uz/products/pressure-transmitter-y',
    });
    // Phase 3 D-08 carry-forward: NO offers on Product mentions.
    expect(
      Object.prototype.hasOwnProperty.call(mentions[0]!, 'offers'),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(mentions[1]!, 'offers'),
    ).toBe(false);
  });

  it('collectionPageJsonLd returns @type=CollectionPage with hasPart', () => {
    const json = collectionPageJsonLd('Manometers', [
      'https://manometr.uz/uz/products/a',
      'https://manometr.uz/uz/products/b',
    ]);
    expect(json['@type']).toBe('CollectionPage');
    expect(json.name).toBe('Manometers');
    expect(Array.isArray(json.hasPart)).toBe(true);
    const parts = json.hasPart as Array<{ '@type': string; url: string }>;
    expect(parts.length).toBe(2);
    expect(parts[0]).toEqual({
      '@type': 'WebPage',
      url: 'https://manometr.uz/uz/products/a',
    });
    expect(parts[1]?.url).toBe('https://manometr.uz/uz/products/b');
  });
});
