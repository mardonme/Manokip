// Plan 04-03 Task 3.4 — Zod schema for saveIndustry + publishIndustry +
// deleteIndustry Server Actions (Wave 1 plan 04-06).
//
// Mirror of src/lib/zod/recipe.ts — same shape, swapping recipe → industry.
// See that file for the rationale; this schema only differs in the table name
// it ultimately writes to. Reserved-slug denylist + W7 refusal-to-elevate +
// JSONContent body posture all carry forward.

import { z } from 'zod';

// Reserved slugs — keep in sync with src/lib/zod/recipe.ts.
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
  body: z.unknown(),
});

export type IndustryLocaleFields = z.infer<typeof localeFields>;

const linkedProduct = z.object({
  productId: z.string().uuid(),
  position: z.number().int().nonnegative(),
});

export type IndustryLinkedProductInput = z.infer<typeof linkedProduct>;

export const industryInsertSchema = z.object({
  id: z.string().uuid().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.string().datetime().nullable().default(null),
  featuredImagePublicId: z.string().nullable().default(null),
  translations: z.object({
    uz: localeFields,
    ru: localeFields,
    en: localeFields,
  }),
  linkedProductIds: z.array(linkedProduct).default([]),
});

export type IndustryInput = z.infer<typeof industryInsertSchema>;

export const industryPublishSchema = z.object({
  id: z.string().uuid(),
});

export type IndustryPublishInput = z.infer<typeof industryPublishSchema>;

export const industryDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type IndustryDeleteInput = z.infer<typeof industryDeleteSchema>;
