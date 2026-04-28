// Plan 02-11 Task 11.1 — soft-delete repository wrapper for spec_field.
//
// Open Q §4 / D-07: spec_field rows can be soft-deleted (deleted_at != NULL).
// Public reads in Phase 3 must NEVER expose soft-deleted fields. Centralising
// the `WHERE deleted_at IS NULL` filter in this module means callers can't
// forget — they import `findActiveSpecFields(...)` / `findActiveSpecField(...)`
// instead of building the predicate inline.
//
// Phase-5 ESLint rule (deferred): block `db.select(...).from(specFields)`
// outside this module + admin Server Actions, so any future query path is
// forced through the wrapper.
//
// Uses the HTTP client (`@/db/client`) — repository functions are read-only.
// Admin Server Actions that mutate spec_field still use `dbTx` directly.

import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { specFields } from "@/db/schema";

/**
 * All non-soft-deleted spec_fields scoped to a category. Returns rows where
 * `deleted_at IS NULL`. Phase 3 product detail / category page queries call
 * this exclusively.
 */
export async function findActiveSpecFields(categoryId: string) {
  return db
    .select()
    .from(specFields)
    .where(
      and(
        eq(specFields.categoryId, categoryId),
        isNull(specFields.deletedAt),
      ),
    );
}

/**
 * Single spec_field by id, only if not soft-deleted. Returns `null` for both
 * "row does not exist" and "row is soft-deleted" — callers treat both as
 * "not available".
 */
export async function findActiveSpecField(id: string) {
  const rows = await db
    .select()
    .from(specFields)
    .where(and(eq(specFields.id, id), isNull(specFields.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}
