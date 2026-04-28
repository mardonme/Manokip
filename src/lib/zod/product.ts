// Plan 02-13a Task 13a.1 — Zod schemas for product Server Actions.
//
// Four schemas land in this file; saveProduct + duplicateProduct are wired in
// this plan, publishProduct + deleteProduct are consumed by plan 02-13b
// (lifecycle actions).
//
//   1. productInsertSchema — the "edit content" payload. Validates a full
//      product write: id?, categoryId, manufacturerId?, status, three
//      translations (uz/ru/en) with name+slug+shortDesc?+longDesc?, an array
//      of typed spec values (with optional per-locale text translations),
//      Cloudinary public_id arrays for images + datasheets, and the per-field
//      MT flags map (D-05).
//
//      saveProduct writes status verbatim from this payload BUT enforces a
//      refusal-to-elevate guard at the action body (W7): if the persisted
//      status is 'draft' and input.status is 'published' (or vice versa), the
//      action throws USE_PUBLISH_ACTION — lifecycle transitions go through the
//      dedicated publishProduct/unpublishProduct actions in plan 02-13b.
//
//   2. productDuplicateSchema — `{ sourceId: uuid }` only; duplicateProduct
//      forces status='draft' + publishedAt=null + slug-copy suffix per
//      D-03.
//
//   3. productPublishSchema, productDeleteSchema — `{ id: uuid }` shells
//      consumed by plan 02-13b. Defined here so the lifecycle plan only adds
//      the action body, not the validation shape.
//
// Spec-value shape mirrors the typed long-table (productSpecValues): num /
// text / enum / bool slots are nullable, isExtra=true rows carry an extra_key
// (D-19/20). Per-locale text translations live on a sibling
// productSpecValueTranslations row keyed by valueId — saveProduct accepts them
// inline as `translations: { uz?, ru?, en? }` and the action splits them out.
//
// MT flags shape: per-locale Record<fieldName, boolean>. Replace-on-save
// semantics — saveProduct deletes all flags for the product and re-inserts
// the truthy ones inside the same tx (T-02-13a-06).

import { z } from "zod";

const localeFields = z.object({
  name: z.string().min(1).max(300),
  slug: z
    .string()
    .min(1)
    .max(300)
    .regex(/^[a-z0-9-]+$/),
  shortDesc: z.string().optional().nullable(),
  longDesc: z.string().optional().nullable(),
});

export type ProductLocaleFields = z.infer<typeof localeFields>;

const specValueInput = z.object({
  /** null when isExtra=true (free-form extras have no spec_field FK). */
  specFieldId: z.string().uuid().nullable(),
  isExtra: z.boolean().default(false),
  extraKey: z.string().optional().nullable(),
  numValue: z.number().optional().nullable(),
  textValue: z.string().optional().nullable(),
  enumValue: z.string().optional().nullable(),
  boolValue: z.boolean().optional().nullable(),
  unit: z.string().optional().nullable(),
  sortOrder: z.number().int().nonnegative().default(0),
  /**
   * Optional per-locale text translations. Only meaningful for text-typed
   * values; saveProduct splits these into productSpecValueTranslations rows.
   */
  translations: z
    .object({
      uz: z.string().optional().nullable(),
      ru: z.string().optional().nullable(),
      en: z.string().optional().nullable(),
    })
    .optional(),
});

export type ProductSpecValueInput = z.infer<typeof specValueInput>;

/** Per-locale field-name → MT flag map. Empty / undefined locale = no flags. */
const localeFlags = z.record(z.string(), z.boolean()).optional();

export const productInsertSchema = z.object({
  /** UUID — present on update, absent on insert. */
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  manufacturerId: z.string().uuid().nullable().optional(),
  /**
   * Lifecycle state (D-11 / Open Q §1 Option B). Written verbatim BUT the
   * saveProduct action refuses to elevate (draft↔published) — those
   * transitions go through publishProduct/unpublishProduct (plan 02-13b).
   */
  status: z.enum(["draft", "published"]),
  translations: z.object({
    uz: localeFields,
    ru: localeFields,
    en: localeFields,
  }),
  specValues: z.array(specValueInput).default([]),
  imagePublicIds: z.array(z.string()).default([]),
  datasheetPublicIds: z.array(z.string()).default([]),
  /**
   * D-05 per-field MT flags. Replace-on-save — saveProduct DELETEs all rows
   * for (productId) and re-INSERTs only the truthy entries inside the tx.
   */
  mtFlags: z
    .object({
      uz: localeFlags,
      ru: localeFlags,
      en: localeFlags,
    })
    .default({}),
});

export type ProductInput = z.infer<typeof productInsertSchema>;

export const productDuplicateSchema = z.object({
  sourceId: z.string().uuid(),
});

export type ProductDuplicateInput = z.infer<typeof productDuplicateSchema>;

export const productPublishSchema = z.object({
  id: z.string().uuid(),
});

export type ProductPublishInput = z.infer<typeof productPublishSchema>;

export const productDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type ProductDeleteInput = z.infer<typeof productDeleteSchema>;
