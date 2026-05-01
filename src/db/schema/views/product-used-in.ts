// Phase 4 plan 04-01: pgView surfacing the "Used in" reverse query for a
// product detail page in a single round-trip.
//
// UNION ALL of the two junction tables, each joined to its base + translations
// row, filtered to PUBLISHED content only (T-04-01-02 mitigation —
// defense-in-depth so a public RSC cannot leak draft content via this view).
//
// Mirrors the pattern in src/db/schema/views/product-translation-completeness.ts:
//   pgView('<name>', { columns }).as(sql`...`)
//
// Position is text-cast on both halves so the union column types align (the
// recipe + industry junctions share the same shape but pgView's column type
// declarations must match exactly after UNION ALL).
import { pgView, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const productUsedInView = pgView(
  'product_used_in_v',
  {
    productId: uuid('product_id').notNull(),
    contentType: text('content_type').notNull(), // 'recipe' | 'industry'
    contentId: uuid('content_id').notNull(),
    locale: text('locale').notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt'),
    featuredImagePublicId: text('featured_image_public_id'),
    position: text('position').notNull(),
  },
).as(sql`
  SELECT pr.product_id,
         'recipe'::text AS content_type,
         r.id AS content_id,
         rt.locale,
         rt.title,
         rt.slug,
         rt.excerpt,
         r.featured_image_public_id,
         pr.position::text AS position
    FROM product_recipes pr
    JOIN recipe r ON r.id = pr.recipe_id
    JOIN recipe_translations rt ON rt.recipe_id = r.id
   WHERE r.status = 'published'
  UNION ALL
  SELECT pi.product_id,
         'industry'::text,
         i.id,
         it.locale,
         it.title,
         it.slug,
         it.excerpt,
         i.featured_image_public_id,
         pi.position::text
    FROM product_industries pi
    JOIN industry i ON i.id = pi.industry_id
    JOIN industry_translations it ON it.industry_id = i.id
   WHERE i.status = 'published'
`);
