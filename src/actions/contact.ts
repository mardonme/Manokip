'use server';

// Phase 5 plan 05-02 task 2.6 — visitor-facing contact submission Server Action.
//
// Wraps `withPublicAction` (src/lib/server-action.ts) which enforces the
// honeypot → Turnstile → rate-limit triple-gate BEFORE this handler runs.
//
// Flow inside the handler:
//   1. enrichForInsert — server-side sourcePage validation (T-CTA-04 mitigation)
//      + product-context auto-prepend (D-03; fail-open if lookup fails).
//   2. dbTx.transaction — atomic INSERT contact_submission + INSERT audit_log
//      row with action='contact_submission_create' (CLAUDE.md: every mutation
//      writes audit row; checker W-3 path A).
//   3. AFTER tx.commit — fire-and-forget admin notification + visitor auto-reply
//      (D-10; Pitfall 4 — Resend outage never blocks ok:true).
//
// NO `revalidateTag` — `contact_submission` has no public consumer; the admin
// inbox uses Phase 2 02-15 cache wiring. Default Node runtime — React Email
// render is Node-only.
//
// Closest analog: src/actions/recipes.ts (saveRecipe) — same dbTx.transaction
// + atomic-audit shape, with withAdminAction swapped for withPublicAction and
// the admin requireAdmin gate replaced by the triple-gate composite.

import { eq, and } from 'drizzle-orm';
import { dbTx } from '@/db/client-ws';
import { db } from '@/db/client';
import {
  contactSubmissions,
  products,
  productTranslations,
  auditLog,
} from '@/db/schema';
import { withPublicAction } from '@/lib/server-action';
import { contactInsertSchema, type ContactInsertInput } from '@/lib/zod/contact';
import {
  fireAdminNotification,
  fireVisitorAutoReply,
} from '@/lib/email-contact';
import { getTranslations } from 'next-intl/server';

// T-CTA-04 — sourcePage is visitor-supplied; never trust as-is.
// VALID_SOURCE accepts any /(uz|ru|en) path; PRODUCT_PATH narrows to product
// detail pages so the auto-prepend only fires on real product slugs.
const VALID_SOURCE = /^\/(uz|ru|en)\/[a-z0-9\-/]*$/;
const PRODUCT_PATH = /^\/(uz|ru|en)\/products\/([a-z0-9-]+)$/;

interface EnrichedInput {
  safeSource: string;
  message: string;
  productContext: string | undefined;
}

async function enrichForInsert(
  input: ContactInsertInput,
): Promise<EnrichedInput> {
  // Step 1 — server-side sourcePage validation (T-CTA-04). Falls back to
  // /<locale> root on any mismatch so an attacker can't smuggle adversarial
  // values into audit/email surfaces.
  const safeSource = VALID_SOURCE.test(input.sourcePage)
    ? input.sourcePage
    : `/${input.locale}`;

  let message = input.message;
  let productContext: string | undefined;

  // Step 2 — product-context auto-prepend (D-03). Only fires when sourcePage
  // matched the validated product-path regex AND the slug resolves to a
  // PUBLISHED product. Lookup failures fall through (no error to attacker).
  const productMatch = safeSource.match(PRODUCT_PATH);
  if (productMatch) {
    const slug = productMatch[2]!;
    const [row] = await db
      .select({ name: productTranslations.name, sku: products.sku })
      .from(productTranslations)
      .innerJoin(products, eq(products.id, productTranslations.productId))
      .where(
        and(
          eq(productTranslations.slug, slug),
          eq(productTranslations.locale, input.locale),
          eq(products.status, 'published'),
        ),
      )
      .limit(1);

    if (row?.name && row?.sku) {
      // Localized prepend — messages namespace skeleton seeded by plan 05-01;
      // plan 05-03 will fill the literal strings. Until then this returns the
      // placeholder verbatim, which is still a structurally-correct prepend
      // (test asserts behavior, not exact wording).
      const t = await getTranslations({
        locale: input.locale,
        namespace: 'public.contact.productInquiry',
      });
      const prefix = t('inquiryAbout', { name: row.name, sku: row.sku });
      message = `${prefix}\n\n${message}`;
      productContext = `${row.name} (${row.sku})`;
    }
  }

  return { safeSource, message, productContext };
}

export const submitContactForm = withPublicAction(
  contactInsertSchema,
  async (input) => {
    const { safeSource, message, productContext } = await enrichForInsert(input);

    // Step 3 — atomic INSERT contact_submission + audit row (CLAUDE.md
    // compliance per checker W-3 path A — every mutation writes audit_log).
    // bigserial → string at the audit-log boundary (entityId is text).
    const inserted = await dbTx.transaction(async (tx) => {
      const [row] = await tx
        .insert(contactSubmissions)
        .values({
          name: input.name,
          company: input.company ?? null,
          email: input.email,
          phone: input.phone ?? null,
          message,
          sourcePage: safeSource,
          locale: input.locale,
        })
        .returning();

      if (!row) {
        throw new Error('contact_submission insert returned no row');
      }

      await tx.insert(auditLog).values({
        actorEmail: 'visitor',
        action: 'contact_submission_create',
        entityType: 'contact_submission',
        entityId: String(row.id),
        beforeJson: null,
        afterJson: {
          sourcePage: safeSource,
          locale: input.locale,
          hasProductContext: !!productContext,
        },
      });

      return row;
    });

    // Step 4 — fire-and-forget emails OUTSIDE the tx (D-10; Pitfall 4 — visitor
    // never waits on Resend; outages caught + Sentry-reported in the wrappers).
    fireAdminNotification({
      name: input.name,
      company: input.company ?? null,
      email: input.email,
      phone: input.phone ?? null,
      message, // already prefixed with productInquiry line if applicable
      sourcePage: safeSource,
      locale: input.locale,
      submittedAt: inserted.submittedAt,
    });
    fireVisitorAutoReply({
      to: input.email,
      name: input.name,
      productContext,
      locale: input.locale,
    });

    // bigserial → string per serialiseSubmission precedent (Phase 2 02-15).
    return { id: String(inserted.id) };
  },
);
