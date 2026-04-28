// Plan 02-11 Task 11.3 — Zod schemas for spec_field_group Server Actions.
//
// spec_field_group is the D-09 grouping layer for the fiztech-style table-
// per-group product detail rendering (Phase 3). Phase 2 ships the CRUD
// scaffolding only; the public renderer lives in Phase 3.
//
// Three actions:
//   1. saveSpecFieldGroup — insert / update with 3-locale labels.
//   2. reorderGroups — batch update sortOrder for a category's groups.
//   3. deleteSpecFieldGroup — soft-delete (sets deleted_at). Fields with
//      this group_id retain their FK and render as ungrouped on Phase 3
//      detail pages until reassigned.
//
// Mirrors src/lib/zod/manufacturer.ts + src/lib/zod/category.ts shape.

import { z } from "zod";

const KEY_RE = /^[a-z0-9_]+$/;

const localeFields = z.object({
  label: z.string().min(1).max(200),
});

export type SpecFieldGroupLocaleFields = z.infer<typeof localeFields>;

export const specFieldGroupSaveSchema = z.object({
  /** UUID — present on update, absent on insert. */
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  /** Stable internal key, e.g. `dimensions`. */
  key: z.string().min(1).max(100).regex(KEY_RE),
  sortOrder: z.number().int().nonnegative().default(0),
  translations: z.object({
    uz: localeFields,
    ru: localeFields,
    en: localeFields,
  }),
});

export type SpecFieldGroupInput = z.infer<typeof specFieldGroupSaveSchema>;

export const specFieldGroupReorderSchema = z.object({
  categoryId: z.string().uuid(),
  ordering: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export type SpecFieldGroupReorderInput = z.infer<
  typeof specFieldGroupReorderSchema
>;

export const specFieldGroupDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type SpecFieldGroupDeleteInput = z.infer<
  typeof specFieldGroupDeleteSchema
>;
