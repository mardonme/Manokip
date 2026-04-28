// Plan 02-09 Task 9.2 — Zod schemas for categories Server Actions.
//
// Per CLAUDE.md guardrails:
//   - Translation rule: every translatable entity uses sibling
//     `*_translations` tables keyed (entity_id, locale). The `translations`
//     field models the three locales as a fixed-shape object with `uz`/`ru`/
//     `en` keys (not an array) so the editor's RHF tree maps 1:1 to the
//     dotted form paths (`translations.uz.name`, `translations.uz.slug`, …).
//
// Per-locale `localeFields` is the canonical sibling shape — name + slug +
// optional description. Slug regex is `[a-z0-9-]+` post-normalization; the
// `toSlug()` helper from src/lib/slug.ts produces only allowed characters
// from any human input (Uzbek Latin oʻ/gʻ -> U+02BB plus ASCII-stripping).
//
// `id` is optional on the insert/update schema: present means update,
// absent means insert. Same shape used downstream by 02-10 / 02-13b.

import { z } from "zod";

const SLUG_RE = /^[a-z0-9-]+$/;

const localeFields = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(SLUG_RE),
  description: z.string().optional().nullable(),
});

export type CategoryLocaleFields = z.infer<typeof localeFields>;

export const categoryInsertSchema = z.object({
  /** UUID — present on update, absent on insert. */
  id: z.string().uuid().optional(),
  /** Self-referential parent. `null` for top-level. */
  parentId: z.string().uuid().nullable().optional(),
  /** Sort order within the parent's children list. */
  sortOrder: z.number().int().nonnegative().default(0),
  /** Per-locale translations — all three locales required. */
  translations: z.object({
    uz: localeFields,
    ru: localeFields,
    en: localeFields,
  }),
});

export type CategoryInput = z.infer<typeof categoryInsertSchema>;

export const categoryDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type CategoryDeleteInput = z.infer<typeof categoryDeleteSchema>;
