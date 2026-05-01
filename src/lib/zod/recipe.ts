// Plan 04-03 Task 3.4 — Zod schema for saveRecipe + publishRecipe + deleteRecipe
// Server Actions (Wave 1 plans 04-05 / 04-06).
//
// Mirrors src/lib/zod/product.ts shape:
//   - localeFields per uz/ru/en (title, slug, excerpt nullable, body unknown)
//   - linkedProductIds: array of {productId, position}
//   - status enum 'draft' | 'published' (saveRecipe writes verbatim BUT
//     refuses-to-elevate transitions per Phase-2 02-13b W7 — those go through
//     publishRecipe / unpublishRecipe in 04-05)
//
// Body is typed as JSONContent at the schema-module boundary (z.unknown()
// because Zod has no first-party Tiptap type; downstream Server Action treats
// it as JSONContent). The renderer + admin editor enforce shape via the locked
// TIPTAP_EXTENSIONS allow-list at runtime, NOT via Zod (Zod cannot validate
// arbitrary ProseMirror JSON tree structure efficiently — RESEARCH §Form shape
// lines 778-797).
//
// Reserved-slug refinement: deny slug ∈ {'admin','api','_next','cdn','admin-action'}
// across all 3 locales — defense-in-depth alongside the per-locale unique index
// on (locale, slug). RESEARCH §Open Q §4 + threat T-04-TAMP-03 mitigation.

import { z } from 'zod';

// Reserved slugs — match the route segments + admin verbs that must not be
// hijacked by content authors. Keep in sync with the equivalent denylist in
// src/lib/zod/industry.ts.
const RESERVED_SLUGS = new Set<string>([
  'admin',
  'api',
  '_next',
  'cdn',
  'admin-action',
]);

const slugSchema = z
  .string()
  .min(1)
  .max(300)
  .regex(/^[a-z0-9-]+$/)
  .refine((s) => !RESERVED_SLUGS.has(s), {
    message: 'Slug is reserved',
  });

const localeFields = z.object({
  title: z.string().min(1).max(300),
  slug: slugSchema,
  excerpt: z.string().optional().nullable(),
  /**
   * Tiptap ProseMirror doc. Validated only at the structural level here
   * (any JSON value); the locked TIPTAP_EXTENSIONS allow-list enforces node
   * shape at render time. saveRecipe writes verbatim into recipe_translations.body
   * which is jsonb().$type<JSONContent>() narrowed.
   */
  body: z.unknown(),
});

export type RecipeLocaleFields = z.infer<typeof localeFields>;

const linkedProduct = z.object({
  productId: z.string().uuid(),
  position: z.number().int().nonnegative(),
});

export type RecipeLinkedProductInput = z.infer<typeof linkedProduct>;

export const recipeInsertSchema = z.object({
  /** UUID — present on update, absent on insert. */
  id: z.string().uuid().optional(),
  /**
   * Lifecycle state (D-03 / W7 carry-forward from Phase-2 02-13b). Written
   * verbatim BUT saveRecipe refuses to elevate (draft↔published) — those
   * transitions go through publishRecipe / unpublishRecipe in plan 04-05.
   */
  status: z.enum(['draft', 'published']).default('draft'),
  /** ISO 8601 — only meaningful when status='published'. */
  publishedAt: z.string().datetime().nullable().default(null),
  /** Cloudinary public_id (D-06 — Tiptap inline images use the same flow). */
  featuredImagePublicId: z.string().nullable().default(null),
  translations: z.object({
    uz: localeFields,
    ru: localeFields,
    en: localeFields,
  }),
  /**
   * M:N junction rows — replace-on-save semantics in saveRecipe (DELETE all
   * for recipeId, INSERT new array). position drives DataTable display order.
   */
  linkedProductIds: z.array(linkedProduct).default([]),
});

export type RecipeInput = z.infer<typeof recipeInsertSchema>;

export const recipePublishSchema = z.object({
  id: z.string().uuid(),
});

export type RecipePublishInput = z.infer<typeof recipePublishSchema>;

export const recipeDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type RecipeDeleteInput = z.infer<typeof recipeDeleteSchema>;
