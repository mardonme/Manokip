// Plan 02-15 Task 15.2 — Zod schemas for submissions Server Actions.
//
// The contact_submission table (Phase 1, src/db/schema/contact.ts) keys
// rows by `bigserial` id (BIGINT in Postgres). Drizzle returns the value
// as a JS bigint, so the wire shape uses `z.coerce.bigint()` to accept
// either a JS number, a numeric string, or a BigInt. Most call-sites
// stringify the id when passing it through Server Action boundaries
// (FormData / fetch can't carry BigInt natively), so the schema coerces
// from string by default.
//
// Read-state model: the schema column is `read_at` (timestamp, nullable),
// not `is_read` (boolean). Two writes:
//   - markSubmissionRead({ id, isRead: true })  → SET read_at = now()
//   - markSubmissionRead({ id, isRead: false }) → SET read_at = null
// The `isRead` boolean in the wire schema is a UX convenience; the server
// translates it into the timestamp write. The audit row carries before/
// after for the read_at column so reviewers can reconstruct exactly when
// a submission was first marked read (T-02-15-05).
//
// exportSchema enumerates the only filters the inbox surface offers
// (T-02-15-03 mass-assignment guard — Zod allowlist drops anything else).

import { z } from "zod";

/** id arrives as a numeric string from the client; coerce to BigInt for Drizzle. */
const submissionId = z.coerce.bigint();

export const markReadSchema = z.object({
  id: submissionId,
  isRead: z.boolean(),
});

export type MarkReadInput = z.infer<typeof markReadSchema>;

export const exportSchema = z.object({
  /** ISO-8601 datetime; lower bound on submitted_at (inclusive). */
  from: z.string().datetime().optional(),
  /** ISO-8601 datetime; upper bound on submitted_at (inclusive). */
  to: z.string().datetime().optional(),
  /**
   * `true`  → only rows with read_at IS NOT NULL.
   * `false` → only rows with read_at IS NULL (unread).
   * `undefined` → no filter.
   */
  isRead: z.boolean().optional(),
});

export type ExportInput = z.infer<typeof exportSchema>;
