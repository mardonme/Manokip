// Phase 5 plan 05-02 task 2.3 — visitor-input Zod schema for the contact form.
//
// Distinct from src/lib/zod/submission.ts (which is the admin-side filter +
// mark-read schema). This is the wire shape the public ContactForm sends to
// submitContactForm Server Action.
//
// Honeypot: `field_extra` is intentionally optional + max 500 (D-04).
// Bots that auto-fill every field will populate it; withPublicAction's Step C
// inspects it and silently drops the request with action='spam_detected' audit.
//
// turnstileToken: required string. withPublicAction's Step D verifies it via
// the Cloudflare siteverify wrapper.
//
// sourcePage: stored as-is in Zod (string max 500). The Server Action
// `enrichForInsert` validates it against /^\/(uz|ru|en)\/[a-z0-9\-\/]*$/
// before persistence so visitor-supplied input cannot smuggle '/admin/...'
// into contact_submission.source_page (T-CTA-04 mitigation).

import { z } from 'zod';

export const contactInsertSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional().nullable(),
  email: z.string().email().max(320),
  // D-02 — phone is optional + nullable; the schema column is also nullable.
  phone: z.string().max(60).optional().nullable(),
  message: z.string().min(1).max(5000),
  // Server re-validates against the canonical /<locale>/... regex; client is hint only.
  sourcePage: z.string().max(500),
  locale: z.enum(['uz', 'ru', 'en']),
  // Honeypot: passes Zod (any string up to 500) — withPublicAction inspects.
  field_extra: z.string().max(500).optional(),
  // Cloudflare Turnstile token — required string.
  turnstileToken: z.string().min(1),
});

export type ContactInsertInput = z.infer<typeof contactInsertSchema>;
