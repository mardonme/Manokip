// Plan 02-10 Task 10.2 — Zod schemas for manufacturers Server Actions.
//
// Manufacturers parallel categories (sibling translations table on
// (manufacturer_id, locale) per CLAUDE.md guardrail), with two extras:
//
//   - logoPublicId on the BASE row (not per-locale) — Cloudinary public_id
//     stored as the SSOT (D-07). Nullable: an admin may save a manufacturer
//     before uploading a logo. Validation: any non-empty string is accepted;
//     Cloudinary's existence check happens at render time via <CldImage>
//     (T-02-10-02 mitigation per the plan threat register).
//
//   - websiteUrl on the BASE row (kept out of the v1 form to avoid scope
//     creep — the editor only manages logo + per-locale name/slug/description.
//     Plan 02-PATTERNS lists websiteUrl as base-row info; we omit from the
//     write path so the column keeps its default until a follow-up plan).
//
// Translation rule (CLAUDE.md): every translatable entity uses sibling
// `*_translations` keyed (entity_id, locale). The `translations` field
// models the three locales as a fixed-shape object with `uz`/`ru`/`en` keys
// (not an array) so the editor's RHF tree maps 1:1 to dotted form paths.
//
// Slug regex `[a-z0-9-]+` matches the post-toSlug() output. localeFields is
// the canonical sibling shape — same shape as src/lib/zod/category.ts but
// duplicated rather than imported so each entity owns its own surface.

import { z } from "zod";

const SLUG_RE = /^[a-z0-9-]+$/;

const localeFields = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(SLUG_RE),
  description: z.string().optional().nullable(),
  // Plan 03-07 (D-11): per-locale "relationship note" rendered next to the
  // Verified pill on the public manufacturer detail page (e.g. ru:
  // "Официальный представитель WIKA в Узбекистане с 2019 г."). Nullable —
  // manufacturers without a written relationship statement render nothing.
  // Cap at 500 chars to keep SEO copy tight (well below the column's TEXT
  // limit; React auto-escapes the rendered output, T-03-07-04).
  relationshipNote: z.string().max(500).optional().nullable(),
});

export type ManufacturerLocaleFields = z.infer<typeof localeFields>;

export const manufacturerInsertSchema = z.object({
  /** UUID — present on update, absent on insert. */
  id: z.string().uuid().optional(),
  /**
   * Cloudinary public_id stored on the manufacturer base row. Nullable so
   * an admin can save the row before uploading the logo (D-07 invariant —
   * never store the full URL or Cloudinary asset_id).
   */
  logoPublicId: z.string().min(1).max(500).nullable().optional(),
  /**
   * Plan 03-07 (D-11): drives the "Authorized representative" Verified pill
   * on both the product detail page (D-01 sketch 003) and the manufacturer
   * landing page (D-10). Defaults to false — existing manufacturers stay
   * unflagged unless an admin explicitly toggles them.
   */
  isOfficialRep: z.boolean().default(false),
  /** Per-locale translations — all three locales required. */
  translations: z.object({
    uz: localeFields,
    ru: localeFields,
    en: localeFields,
  }),
});

export type ManufacturerInput = z.infer<typeof manufacturerInsertSchema>;

export const manufacturerDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type ManufacturerDeleteInput = z.infer<typeof manufacturerDeleteSchema>;
