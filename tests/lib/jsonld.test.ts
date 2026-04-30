// Plan 03-01 Task 1.3 — RED stub for CAT-08 (JSON-LD helpers).
//
// REQUIRES: tests/fixtures/seed-public.ts seed must run before tests un-skip.
//
// Closed by Plan 03 (Task: src/lib/jsonld.ts) — productJsonLd /
// organizationJsonLd / breadcrumbJsonLd / collectionPageJsonLd shapes
// validated against schema-dts WithContext<T> types, with D-08 honored
// (no `offers` on Product).

import { describe, it } from 'vitest';

describe.skip('jsonld helpers (CAT-08, closed by plan 03)', () => {
  it('productJsonLd returns @type=Product without offers (D-08)', () => {
    // TODO Plan 03: assert shape of productJsonLd({ id, name, sku,
    // shortDesc, manufacturerName, heroPublicId }) — must include
    // @context, @type='Product', name, sku, image (Cloudinary URL),
    // brand.@type='Organization', and MUST NOT include `offers` per D-08.
  });
  it('organizationJsonLd returns @type=Organization', () => {
    // TODO Plan 03: assert shape of organizationJsonLd() — must include
    // @context='https://schema.org', @type='Organization', name='Manometr',
    // url='https://manometr.uz'.
  });
  it('breadcrumbJsonLd returns @type=BreadcrumbList with items', () => {
    // TODO Plan 03: assert breadcrumbJsonLd([{name, url}]) emits
    // BreadcrumbList with itemListElement: ListItem[] (position 1..N).
  });
  it('collectionPageJsonLd returns @type=CollectionPage', () => {
    // TODO Plan 03: assert collectionPageJsonLd(category, items) emits
    // @type='CollectionPage' with name + url + hasPart array.
  });
});
