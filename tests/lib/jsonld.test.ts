// Plan 03-03 Task 3.1 — GREEN spec for CAT-08 (JSON-LD helpers).
//
// Validates D-08 (no offers on Product) and D-09 (4 helpers: Product,
// Organization, BreadcrumbList, CollectionPage). Closed by Plan 03.

import { describe, it, expect } from 'vitest';

import {
  productJsonLd,
  organizationJsonLd,
  breadcrumbJsonLd,
  collectionPageJsonLd,
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
