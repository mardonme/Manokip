// Plan 02-11 Task 11.2 — Zod schemas for spec_field Server Actions.
//
// spec_field is the catalog of typed spec slots a category exposes (D-16..D-21
// of Phase 1). Phase-2 adds three new write paths atop the canonical CRUD:
//
//   1. Save (insert / update) — creates a new row OR updates an existing one.
//      Type changes (D-08) are blocked once the row exists; the action throws
//      on `dataType` change at the runtime layer too (defense-in-depth).
//
//   2. Rename (D-06) — moves spec_field.key + cascade-renames extra_key in
//      product_spec_values rows that reference this field. Single-step
//      transaction; no separate "preview" write — the impact-preview is a
//      read-only Server Action covered in plan 02-13/02-16.
//
//   3. Soft-delete (D-07) — sets deleted_at; rendering on existing products
//      keeps working until the values are cleaned up. Phase 3 public reads
//      filter via the repository wrapper.
//
//   4. Hard-delete (D-07) — drops the row + cascades product_spec_values via
//      FK ON DELETE CASCADE. Confirm dialog gates the click (UI layer).
//
// Schema alignment (Rule-1 vs. plan literal): the plan's <action> block lists
// SPEC_FIELD_TYPES = ['number','range','enum','bool','text'] but the actual
// Phase-1 spec_data_type pgEnum is ['number','text','enum','bool'] — D-16/17
// explicitly bans 'range' from data_type ("range = two number fields sharing
// filter_group_key"). Alignment with the live schema wins; the form lays
// 'range' out as a UX layer over the filter_kind enum, NOT data_type.

import { z } from "zod";

// Mirror the spec_data_type pgEnum in src/db/schema/spec-fields.ts.
export const SPEC_DATA_TYPES = ["number", "text", "enum", "bool"] as const;
export type SpecDataType = (typeof SPEC_DATA_TYPES)[number];

// Mirror the spec_filter_kind pgEnum. NULL = display-only (no filter).
export const SPEC_FILTER_KINDS = ["range", "select", "toggle"] as const;
export type SpecFilterKind = (typeof SPEC_FILTER_KINDS)[number];

const KEY_RE = /^[a-z0-9_]+$/;

const localeFields = z.object({
  label: z.string().min(1).max(200),
  /** Optional helper text shown next to the field in the editor. */
  helpText: z.string().optional().nullable(),
});

export type SpecFieldLocaleFields = z.infer<typeof localeFields>;

export const specFieldSaveSchema = z.object({
  /** UUID — present on update, absent on insert. */
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  /** Stable internal key, e.g. `pressure_max`. D-19: mutable via renameSpecField only. */
  key: z.string().min(1).max(100).regex(KEY_RE),
  dataType: z.enum(SPEC_DATA_TYPES),
  /** Canonical unit (e.g. 'bar', 'mm', '°C'); nullable. */
  unit: z.string().max(40).optional().nullable(),
  required: z.boolean().default(false),
  /** NULL = display-only field (D-17). 'range' lives here, NOT in dataType. */
  filterKind: z.enum(SPEC_FILTER_KINDS).optional().nullable(),
  /** Shared by range min/max pair (D-17). */
  filterGroupKey: z.string().max(100).optional().nullable(),
  /** Optional FK to spec_field_group; null = ungrouped (D-09). */
  groupId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
  translations: z.object({
    uz: localeFields,
    ru: localeFields,
    en: localeFields,
  }),
});

export type SpecFieldInput = z.infer<typeof specFieldSaveSchema>;

export const specFieldRenameSchema = z.object({
  id: z.string().uuid(),
  /** The current key — guards against stale-form races (Pitfall #14). */
  oldKey: z.string().min(1),
  newKey: z.string().min(1).max(100).regex(KEY_RE),
});

export type SpecFieldRenameInput = z.infer<typeof specFieldRenameSchema>;

export const specFieldSoftDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type SpecFieldSoftDeleteInput = z.infer<typeof specFieldSoftDeleteSchema>;

export const specFieldHardDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type SpecFieldHardDeleteInput = z.infer<typeof specFieldHardDeleteSchema>;
