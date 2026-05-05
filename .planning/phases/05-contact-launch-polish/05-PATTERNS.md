# Phase 05: Contact and Launch Polish — Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 26 (NEW + MODIFY + APPEND across Waves 0-3)
**Analogs found:** 26 / 26 (every Phase-5 surface has a strong Phase-1..4 analog — no greenfield-without-precedent)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/schema/contact-rate-limit.ts` (or extend `contact.ts`) | schema (table export) | persistence | `src/db/schema/contact.ts` | exact |
| `drizzle/0004_phase5_contact_rate_limit.sql` | migration (drizzle-kit generated) | persistence | `drizzle/0003_phase4_content_features.sql` | exact |
| `scripts/verify-05-01-migration.ts` | script (post-migration verifier) | one-shot CLI | `scripts/verify-02-01-migration.ts` | exact |
| `src/lib/audit.ts` (MODIFY) | lib helper (extend AUDIT_ACTIONS tuple) | const tuple addition | `src/lib/audit.ts` (self) | exact |
| `src/lib/server-action.ts` (MODIFY: add `withPublicAction`) | lib helper (Server Action wrapper) | request-response middleware | `src/lib/server-action.ts` (`withAdminAction`) | exact |
| `src/lib/turnstile.ts` | lib helper (external API client) | server-to-API request-response | `src/lib/auth.ts` (Resend client + `verifyTurnstile`-style fetch) | role-match |
| `src/lib/rate-limit.ts` | lib helper (HMAC + atomic UPSERT) | DB transactional + crypto | `src/actions/recipes.ts` (`dbTx.transaction` shape) + `src/lib/audit.ts` (Tx pattern) | role-match |
| `src/lib/zod/contact.ts` | lib helper (Zod schema, visitor input) | input validation | `src/lib/zod/recipe.ts` + `src/lib/zod/submission.ts` | exact |
| `src/actions/contact.ts` | Server Action (anonymous visitor) | request-response + atomic-tx + fire-and-forget email | `src/actions/recipes.ts` `saveRecipe` | role-match (admin→public swap) |
| `emails/ContactSubmissionAdminEmail.tsx` (English-only) | email template (React Email) | server-side render to HTML | `src/emails/admin-invite.tsx` | exact |
| `emails/ContactSubmissionAutoReply.tsx` (locale-parameterized) | email template (React Email) | server-side render to HTML | `src/emails/magic-link.tsx` + `src/emails/admin-invite.tsx` (COPY map) | exact |
| `messages/{uz,ru,en}.json` (MODIFY: `public.contact.*`) | messages namespace (i18n) | static JSON | `messages/uz.json` (`public.header.*`, `public.product.*`) | exact |
| `src/components/public/contact-form.tsx` | React component (`'use client'` form) | RHF + Zod + Turnstile widget + useActionState | `src/components/admin/recipe-form.tsx` (RHF+Zod shape; not the W7 freeze) | role-match |
| `src/components/public/contact-button.tsx` | React component (`'use client'` Dialog trigger) | local state + shadcn Dialog | `src/components/admin/confirm-dialog.tsx` | role-match (AlertDialog→Dialog swap) |
| `src/components/public/site-header.tsx` (MODIFY) | React component (mount point) | RSC composition | `src/components/public/site-header.tsx` (self) | exact |
| `src/components/public/sticky-cta-rail.tsx` (MODIFY) | React component (wire #contact → Dialog) | onClick lift to shared state | `src/components/public/sticky-cta-rail.tsx` (self) | exact |
| `src/app/[locale]/contact/page.tsx` | RSC page (canonical SEO) | `setRequestLocale` + `generateMetadata` + `buildAlternates` | `src/app/[locale]/recipes/page.tsx` | exact |
| `src/lib/sitemap.ts` (MODIFY) | lib helper (extend staticPath array) | const array addition | `src/lib/sitemap.ts` (self, lines 74-89) | exact |
| `.lighthouserc.json` (MODIFY) | config (lift warn → error) | static JSON | `.lighthouserc.json` (self) | exact |
| `.github/workflows/lighthouse-preview.yml` (MODIFY) | workflow (expand URLs matrix) | YAML config | `.github/workflows/lighthouse-preview.yml` (self) | exact |
| `scripts/load-test.sh` | script (`ab` runner + p95 gate) | shell + ab + jq | (no existing `.sh` analog — see "No Analog Found") | partial — borrow ENV pattern from `scripts/verify-02-01-migration.ts` |
| `tests/e2e/contact-roundtrip.spec.ts` | e2e spec (Playwright, Vercel preview) | preview + DB fixtures + magic-link DB-direct | `tests/e2e/admin-edit-revalidates.spec.ts` | exact |
| `tests/e2e/cloudinary-widget-smoke.spec.ts` | e2e spec (smoke-only) | DOM assertion + signed endpoint | `tests/e2e/admin-edit-revalidates.spec.ts` (preview gate scaffolding) | role-match |
| `tests/e2e/glyph-render.spec.ts` | e2e spec (visual character + computed font-family) | DOM + getComputedStyle | `tests/e2e/admin-edit-revalidates.spec.ts` (preview gate scaffolding) | role-match |
| `public/google[hash].html`, `public/yandex_[hash].html` | public asset (verification placeholder) | static file | (no existing analog — see "No Analog Found") | none — trivial single-line files |
| `docs/dogfood-protocol.md` | closure doc (markdown) | static doc | `.planning/phases/04-content-features/04-12-PLAN.md` (closure doc shape) | partial |
| `.planning/phases/05-contact-launch-polish/05-VERIFICATION.md` | closure doc | static doc | `.planning/phases/04-content-features/04-VERIFICATION.md` | exact |
| `.planning/RETROSPECTIVE.md` (APPEND) | closure doc | static doc | existing entries | exact |

---

## Pattern Assignments

### `src/db/schema/contact-rate-limit.ts` (or extend `contact.ts`)

**Analog:** `src/db/schema/contact.ts`

**Imports + table-export pattern** (`contact.ts` lines 1-19):
```typescript
import { pgTable, bigserial, text, timestamp } from 'drizzle-orm/pg-core';

export const contactSubmissions = pgTable('contact_submission', {
  id: bigserial({ mode: 'bigint' }).primaryKey(),
  name: text(),
  // ...
  submittedAt: timestamp('submitted_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp('read_at', { withTimezone: true }),
});
```

**Notes:**
- Mirror the same `pgTable` + named-column convention. Phase-5 column names: `ip_hash text NOT NULL`, `window_kind text NOT NULL` (CHECK `('hour','day')`), `window_start timestamptz NOT NULL`, `count int NOT NULL DEFAULT 0`. Composite PK `(ip_hash, window_kind, window_start)` — RESEARCH §Pattern 2 explicitly enriches CONTEXT D-05's PK from `(ip_hash, window_start)` to add `window_kind` because the 2-bucket model needs to disambiguate hour-vs-day rows sharing the same `ip_hash` and `window_start`.
- Add `index('contact_rate_limit_cleanup_idx').on(table.windowStart)` for the opportunistic cleanup `DELETE WHERE window_start < now() - interval '2 days'`.
- The existing `contact.ts` exports `contactSubmissions`; add `contactRateLimit` here OR in a new sibling file. RESEARCH §"Recommended Project Structure" suggests `src/db/schema/contact-rate-limit.ts` (new file) — either works; file-per-table matches Phase-2's `spec-fields.ts` / `spec-field-groups.ts` split precedent. **Recommended: new sibling `contact-rate-limit.ts` and re-export from `src/db/schema/index.ts`.**
- Drizzle column-name casing pattern: explicit snake_case strings (`'ip_hash'`, `'window_kind'`, `'window_start'`) per the `submitted_at`/`source_page` precedent in the analog. Casing helper at runtime is set by `client-ws.ts:20`.

---

### `drizzle/0004_phase5_contact_rate_limit.sql`

**Analog:** `drizzle/0003_phase4_content_features.sql`

**Generation pattern:**
- Run `pnpm drizzle-kit generate` (NOT `push`); the project ships hand-reviewed SQL in `drizzle/`.
- File numbering: 0000, 0001, 0002, 0003 — Phase 5 ships `0004_phase5_contact_rate_limit.sql`.

**Excerpt** (`0003_phase4_content_features.sql` lines 1-7 — table shape pattern):
```sql
CREATE TABLE "product_industries" (
	"product_id" uuid NOT NULL,
	"industry_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_industries_product_id_industry_id_pk" PRIMARY KEY("product_id","industry_id")
);
--> statement-breakpoint
```

**Notes:**
- Phase-4's migration uses CHECK constraints inline (`industry_status_check`); the rate-limit table's `CHECK (window_kind IN ('hour','day'))` follows the same shape.
- `--> statement-breakpoint` separators per drizzle-kit convention.
- Add the cleanup index in the same file: `CREATE INDEX "contact_rate_limit_cleanup_idx" ON "contact_rate_limit" USING btree ("window_start");`.
- No data backfill required (greenfield table).

---

### `scripts/verify-05-01-migration.ts`

**Analog:** `scripts/verify-02-01-migration.ts`

**Imports + env loading pattern** (lines 1-35):
```typescript
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL_DIRECT;
if (!url) {
  console.error("DATABASE_URL_DIRECT not set");
  process.exit(1);
}
const client = neon(url);
const db = drizzle(client);
```

**Check helper + log pattern** (lines 37-44):
```typescript
async function run() {
  const failures: string[] = [];
  const log = (label: string, ok: boolean, detail: string) => {
    const status = ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${label}`);
    console.log(`        ${detail}`);
    if (!ok) failures.push(label);
  };
```

**Notes:**
- Phase-5 checks: (1) `contact_rate_limit` table exists with the 4 columns + composite PK; (2) `contact_rate_limit_cleanup_idx` index exists; (3) CHECK constraint on `window_kind` allows `'hour'` and `'day'`; (4) `drizzle.__drizzle_migrations` has 5 entries (0000–0004); (5) inserting a synthetic row succeeds + ON CONFLICT increments `count`.
- Use `DATABASE_URL_DIRECT` (the unpooled migration connection), not the runtime pool — same as Phase-2 verifier.
- Same `process.exit(0|1)` contract so CI / local runs return a clean exit code.

---

### `src/lib/audit.ts` (MODIFY)

**Analog:** `src/lib/audit.ts` (self)

**AUDIT_ACTIONS tuple** (lines 28-44):
```typescript
export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'publish',
  'unpublish',
  'invite',
  'duplicate_product',
  'rename_spec_field',
  'soft_delete_spec_field',
  'delete_spec_field',
  'login',
  'logout',
  'session_revoked',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
```

**Notes:**
- Append `'spam_detected'` and `'rate_limited'` inside the `as const` tuple (not as separate constants — the type derivation in line 44 reads from the tuple).
- These are the only verbs the visitor-anonymous flow emits (D-04 honeypot → `spam_detected`; rate-limit denial → `rate_limited`).
- Audit-log viewer filter dropdown (Phase-2 plan 02-15 page) iterates `AUDIT_ACTIONS` at runtime so the new verbs appear there automatically — no UI plumbing needed.
- `actorEmail` for visitor flows is the literal string `'visitor'` (not a real admin email) — see RESEARCH §Pattern 1 lines 374, 401.

---

### `src/lib/server-action.ts` (MODIFY: add `withPublicAction`)

**Analog:** `src/lib/server-action.ts` (`withAdminAction`)

**Existing wrapper shape to mirror** (lines 17-64):
```typescript
import { headers } from 'next/headers';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';

export type AdminActionResult<O> =
  | { ok: true; data: O }
  | { ok: false; error: 'validation' | 'unauthorized' | 'unknown' };

export interface AdminActionContext {
  actorEmail: string;
  ip: string;
  userAgent: string;
}

export function withAdminAction<I, O>(
  schema: z.ZodType<I>,
  handler: (input: I, ctx: AdminActionContext) => Promise<O>,
): (raw: unknown) => Promise<AdminActionResult<O>> {
  return async (raw: unknown): Promise<AdminActionResult<O>> => {
    try {
      const session = await requireAdmin();
      const input = schema.parse(raw);
      const h = await headers();
      const data = await handler(input, {
        actorEmail: session.user!.email!,
        ip: h.get('x-forwarded-for') ?? 'unknown',
        userAgent: h.get('user-agent') ?? 'unknown',
      });
      return { ok: true, data };
    } catch (err) {
      if (err instanceof z.ZodError) return { ok: false, error: 'validation' };
      // ...
      return { ok: false, error: 'unknown' };
    }
  };
}
```

**Notes:**
- New `withPublicAction` is a SIBLING export — keep `withAdminAction` unchanged (every existing Phase-2..4 admin Server Action depends on it verbatim).
- Discriminated `PublicActionResult<O>` shape with error union: `'validation' | 'turnstile_failed' | 'rate_limited' | 'spam_detected' | 'unknown'` (RESEARCH §Pattern 1 lines 330-340 verbatim).
- Replace `requireAdmin()` with: (Step C) honeypot check → silent 200 + audit; (Step D) `verifyTurnstile(token, ip)`; (Step E) `checkAndIncrementRateLimit(ipHash)` (throws `RateLimitError` → audit + return).
- IP extraction reuses the EXISTING `h.get('x-forwarded-for') ?? 'unknown'` literal at line 47 — wrap in a shared `parseClientIp(h)` helper (RESEARCH §Pattern 4) and have BOTH wrappers call it for consistency. Optional refactor; alternative is to leave `withAdminAction` unchanged and only `withPublicAction` calls `parseClientIp`.
- `actorEmail` for the public ctx is the literal `'visitor'`; UA stays `h.get('user-agent') ?? 'unknown'`.
- The honeypot + rate-limit audit writes happen INSIDE `withPublicAction` itself (RESEARCH §Pattern 1 lines 372-385, 397-410) — the handler never sees them. This keeps `submitContactForm`'s body lean.
- Pitfall #1: rate-limit + audit must use `dbTx.transaction()` (WebSocket Pool from `src/db/client-ws.ts`), NOT `db` (HTTP driver — single-statement only).

---

### `src/lib/turnstile.ts` (NEW)

**Analog:** `src/lib/auth.ts` (Resend client init pattern + external-service fetch posture)

**External-service helper pattern** (`auth.ts` lines 1-23, generalized):
- Single `env`-imported const for the secret.
- Module-scoped helper that returns a typed result discriminator.
- `fetch` with `cache: 'no-store'` so Next never caches the call.
- Caught errors return a discriminated failure shape (no thrown errors that leak to the caller).

**Excerpt to write** (RESEARCH §Pattern 5 lines 547-585 — verbatim transplant):
```typescript
import { env } from '@/env';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  success: boolean;
  errorCodes?: string[];
}

export async function verifyTurnstile(token: string, ip: string): Promise<TurnstileResult> {
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
    remoteip: ip,
  });

  const res = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    body,
    cache: 'no-store',
  });

  if (!res.ok) {
    return { success: false, errorCodes: ['siteverify-http-error'] };
  }

  const json = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
  return { success: json.success === true, errorCodes: json['error-codes'] };
}
```

**Notes:**
- No SDK — Cloudflare Turnstile siteverify is a single REST call.
- Token TTL is 5 minutes; single-use (RESEARCH §Pitfall 2). Caller must handle widget reset on `success: false`.
- Add `TURNSTILE_SECRET_KEY` to `src/env.ts` (server-side `z.string().min(1)`) AND `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client-side, RESEARCH §Pitfall 8).

---

### `src/lib/rate-limit.ts` (NEW)

**Analog:** `src/actions/recipes.ts` (`dbTx.transaction` shape) + `src/lib/audit.ts` (Tx type pattern)

**Atomic-tx pattern from `recipes.ts` lines 116-199** (transaction lambda discipline):
```typescript
const result = await dbTx.transaction(async (tx) => {
  // multi-statement work — if anything throws, full rollback
  await tx.insert(...).onConflictDoUpdate({ ... });
  // ...
  await logAudit(tx, { /* atomic with the row mutation */ });
  return row;
});
```

**Excerpt to write** (RESEARCH §Pattern 2 lines 460-493 + §Pattern 3 lines 511-516):
```typescript
import { createHmac } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { dbTx } from '@/db/client-ws';
import { env } from '@/env';

const HOUR_LIMIT = 5;
const DAY_LIMIT = 20;

export class RateLimitError extends Error {
  constructor(public hourCount: number, public dayCount: number) {
    super('RATE_LIMITED');
  }
}

export function hashIp(ip: string): string {
  return createHmac('sha256', env.RATE_LIMIT_IP_SALT).update(ip).digest('hex');
}

export function parseClientIp(h: Headers): string {
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xri = h.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

export async function checkAndIncrementRateLimit(ipHash: string): Promise<void> {
  const now = new Date();
  const hourBucket = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
  const dayBucket = new Date(Math.floor(now.getTime() / 86_400_000) * 86_400_000);

  await dbTx.transaction(async (tx) => {
    await tx.execute(sql`
      DELETE FROM contact_rate_limit WHERE window_start < now() - interval '2 days'
    `);

    const hourRes = await tx.execute<{ count: number }>(sql`
      INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
      VALUES (${ipHash}, 'hour', ${hourBucket}, 1)
      ON CONFLICT (ip_hash, window_kind, window_start)
        DO UPDATE SET count = contact_rate_limit.count + 1
      RETURNING count
    `);
    const dayRes = await tx.execute<{ count: number }>(sql`
      INSERT INTO contact_rate_limit (ip_hash, window_kind, window_start, count)
      VALUES (${ipHash}, 'day', ${dayBucket}, 1)
      ON CONFLICT (ip_hash, window_kind, window_start)
        DO UPDATE SET count = contact_rate_limit.count + 1
      RETURNING count
    `);

    const hourCount = hourRes.rows[0]?.count ?? 0;
    const dayCount = dayRes.rows[0]?.count ?? 0;

    if (hourCount > HOUR_LIMIT || dayCount > DAY_LIMIT) {
      throw new RateLimitError(hourCount, dayCount);
    }
  });
}
```

**Notes:**
- **Critical: `dbTx` (WebSocket Pool from `src/db/client-ws.ts`), NEVER `db` (HTTP driver).** `client-ws.ts:1-21` documents this constraint — HTTP driver cannot wrap multi-statement transactions atomically.
- `parseClientIp` is the new shared helper that `withPublicAction` (and optionally `withAdminAction`) consumes.
- Throw inside the tx triggers rollback — denied requests don't permanently consume the budget. Alternative model (commit-then-check) is documented in RESEARCH but rejected as the default.
- `hashIp` consumes `env.RATE_LIMIT_IP_SALT`; add to `src/env.ts` server schema as `z.string().min(32)` (matches `openssl rand -hex 32` output length).

---

### `src/lib/zod/contact.ts` (NEW)

**Analog:** `src/lib/zod/recipe.ts` + `src/lib/zod/submission.ts`

**Schema-export shape** (`recipe.ts` lines 22-89):
```typescript
import { z } from 'zod';

const slugSchema = z.string().min(1).max(300).regex(/^[a-z0-9-]+$/);

const localeFields = z.object({
  title: z.string().min(1).max(300),
  slug: slugSchema,
  excerpt: z.string().optional().nullable(),
  body: z.unknown(),
});

export const recipeInsertSchema = z.object({
  id: z.string().uuid().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  // ...
});
export type RecipeInput = z.infer<typeof recipeInsertSchema>;
```

**Wire-vs-server-shape pattern** (`submission.ts` lines 28-46):
```typescript
export const markReadSchema = z.object({
  id: submissionId,
  isRead: z.boolean(),
});
export type MarkReadInput = z.infer<typeof markReadSchema>;
```

**Notes:**
- New `contactInsertSchema` shape per RESEARCH §Pattern 1 `PublicActionInputBase` + visitor-input fields:
  ```typescript
  export const contactInsertSchema = z.object({
    name: z.string().min(1).max(200),
    company: z.string().max(200).optional().nullable(),
    email: z.string().email().max(320),
    phone: z.string().max(60).optional().nullable(), // D-02 nullable
    message: z.string().min(1).max(5000),
    sourcePage: z.string().max(500), // server re-validates + clamps
    locale: z.enum(['uz', 'ru', 'en']),
    field_extra: z.string().max(500).optional(), // honeypot — passes Zod, withPublicAction inspects
    turnstileToken: z.string().min(1),
  });
  export type ContactInsertInput = z.infer<typeof contactInsertSchema>;
  ```
- Phase-5 visitor-input shape is DISTINCT from Phase-2 admin filter shape (`src/lib/zod/submission.ts`) — that file stays unchanged. Two schemas, two consumers (visitor write vs admin read), zero shared types.
- DO NOT validate `sourcePage` regex client-side; the Server Action re-derives + clamps it (RESEARCH §Pitfall 6 + D-03 product-context auto-prepend). Server reads it, validates `/^\/(uz|ru|en)\/[a-z0-9\-\/]*$/`, falls back to `/${locale}` on mismatch.

---

### `src/actions/contact.ts` (NEW)

**Analog:** `src/actions/recipes.ts` (`saveRecipe` 5-step atomic-tx pattern)

**Action shape — full anatomy** (lines 88-217):
```typescript
"use server";

import { eq } from "drizzle-orm";
import { dbTx } from "@/db/client-ws";
import { recipes, recipeTranslations, productRecipes } from "@/db/schema";
import { withAdminAction } from "@/lib/server-action";
import { logAudit } from "@/lib/audit";
import { revalidateRecipe, revalidateUsedIn } from "@/lib/revalidation";
import { recipeInsertSchema /* ... */ } from "@/lib/zod/recipe";

export const saveRecipe = withAdminAction(
  recipeInsertSchema,
  async (input, ctx) => {
    // 1. Pre-tx snapshot reads
    const before = input.id ? /* ... */ : null;

    // 2. Mutation — atomic block
    const result = await dbTx.transaction(async (tx) => {
      const [row] = input.id
        ? await tx.update(recipes).set({...}).returning()
        : await tx.insert(recipes).values({...}).returning();

      // Step 2: translation upserts
      for (const locale of LOCALES) { /* ... */ }

      // Step 4: audit (atomic with the rest)
      await logAudit(tx, {
        actorEmail: ctx.actorEmail,
        action: input.id ? "update" : "create",
        entityType: "recipe",
        entityId: row.id,
        before, after: row,
        ip: ctx.ip, userAgent: ctx.userAgent,
      });
      return row;
    });

    // 3. Cache invalidation AFTER tx.commit
    await revalidateRecipe(result.id);
    return result;
  },
);
```

**Submissions admin-side pre-tx snapshot pattern** (`src/actions/submissions.ts` lines 57-108) — for the bigserial id stringification, reused on insert:
```typescript
function serialiseSubmission(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return { ...row, id: String(row.id) }; // BigInt is not JSON-serializable
}
```

**Notes:**
- Swap `withAdminAction` → `withPublicAction`. The wrapper handles honeypot/Turnstile/rate-limit + audit BEFORE the handler runs (RESEARCH §Pattern 1) — handler body is lean.
- 5-step inside-handler flow per RESEARCH §System Architecture Diagram lines 222-247:
  1. **Sourcepage validation** — `if (!/^\/(uz|ru|en)\//.test(input.sourcePage)) input.sourcePage = '/' + input.locale;`
  2. **Product-context auto-prepend** — `if (/^\/(uz|ru|en)\/products\/(.+)$/.test(input.sourcePage))` → look up product via `findProductBySlug` (single-statement, can use `db` HTTP driver) → `message = \`Inquiry about: ${name} (${sku})\\n\\n\` + message`
  3. **`dbTx.transaction`**: `INSERT contact_submission RETURNING id` only (NO `logAudit` here — audit_log is admin-actor-scoped per the comment in `audit.ts:13-15`; visitor inserts don't write audit. `spam_detected` + `rate_limited` audit rows are written inside `withPublicAction` itself, not here.)
  4. **Fire-and-forget emails** OUTSIDE the tx (D-10): `void sendAdminNotification(row).catch(e => Sentry.captureException(e));` and `void sendVisitorAutoReply(row, locale).catch(...)`. Visitor never waits on Resend.
  5. **Return** `{ id: String(row.id) }` (bigserial → string, per `serialiseSubmission` precedent in submissions.ts).
- Resend client init pattern: lazy import + dynamic `render()` — see `src/lib/auth.ts` Resend usage (and AdminInviteEmail path through `inviteAdmin` Server Action). React Email `render()` is Node-only — leave the action on the default Node runtime (do NOT mark `export const runtime = 'edge'`).
- Cache invalidation after commit: there's NO public tag for `contact_submission` (admin-only consumer). `revalidateSubmissionsCollection` is a no-op per the comment in `submissions.ts:104-106`. Phase-5 also skips revalidation here.
- `ADMIN_NOTIFY_EMAILS` parsing pattern (RESEARCH §Pitfall 5):
  ```typescript
  const recipients = (env.ADMIN_NOTIFY_EMAILS ?? '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (recipients.length === 0) return; // skip admin notify, no Sentry noise
  ```

---

### `emails/ContactSubmissionAdminEmail.tsx` (NEW — English only)

**Analog:** `src/emails/admin-invite.tsx`

**Full template shape** (lines 1-75 — copy structure, swap content):
```tsx
import {
  Html, Head, Body, Container, Text, Link, Preview,
} from '@react-email/components';

interface AdminInviteEmailProps {
  acceptUrl: string;
  invitedBy?: string;
  locale?: 'uz' | 'ru' | 'en';
}

const COPY = {
  uz: { preview: 'Manometr admin paneliga taklif', body: '...', cta: 'Taklifni qabul qilish' },
  ru: { preview: 'Приглашение в админ-панель Manometr', body: '...', cta: 'Принять приглашение' },
  en: { preview: 'Invitation to Manometr admin panel', body: '...', cta: 'Accept invitation' },
} as const;

export default function AdminInviteEmail({ acceptUrl, locale = 'uz' }: AdminInviteEmailProps) {
  const copy = COPY[locale];
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={{ fontFamily: 'sans-serif', padding: '24px' }}>
        <Container>
          <Text>{copy.body}</Text>
          <Link href={acceptUrl} style={button}>{copy.cta}</Link>
        </Container>
      </Body>
    </Html>
  );
}
```

**Notes:**
- D-09: admin email is **English-only** — DROP the `COPY` map entirely. Inline strings in `<Text>` work.
- Props: `name, company, email, phone?, message, sourcePage, locale, submittedAt` (all from the inserted row).
- File path: per `<files_to_read>` block the prompt expects `emails/` (top-level), but the existing analog ships in `src/emails/`. **Recommended: keep the analog convention — `src/emails/contact-admin.tsx`** so dynamic-import paths from the action match (`src/lib/auth.config.ts` imports magic-link from `@/emails/magic-link`). Planner: explicitly pick one in PLAN.md and update RESEARCH §Recommended Project Structure if diverging.
- Render via dynamic import inside the Server Action (mirrors `src/lib/auth.config.ts` Resend `sendVerificationRequest` pattern) so React Email's Node-only `render()` never enters the Edge bundle.

---

### `emails/ContactSubmissionAutoReply.tsx` (NEW — locale-parameterized)

**Analog:** `src/emails/magic-link.tsx` (COPY map shape) + `src/emails/admin-invite.tsx`

**COPY map + locale switch pattern** (`magic-link.tsx` lines 21-66):
```tsx
const COPY = {
  uz: {
    preview: 'Manometr — kirish havolasi',
    body: 'Admin paneliga kirish uchun quyidagi havolani bosing:',
    cta: 'Kirish',
  },
  ru: { /* ... */ },
  en: { /* ... */ },
} as const;

export default function MagicLinkEmail({ url, locale = 'uz' }: MagicLinkEmailProps) {
  const copy = COPY[locale];
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={{ fontFamily: 'sans-serif', padding: '24px' }}>
        <Container>
          <Text>{copy.body}</Text>
          {/* ... */}
        </Container>
      </Body>
    </Html>
  );
}
```

**Notes:**
- Verbatim shape from `magic-link.tsx`. RESEARCH §Pattern 6 lines 594-650 ships the literal Phase-5 COPY map (uz/ru/en greeting + body + productLine + signature) — copy in.
- Subject is locale-parameterized too — `export const SUBJECTS = { uz: '...', ru: '...', en: '...' } as const;` composed at the call site, NOT inside the template (RESEARCH §Pattern 6 lines 628-632).
- Optional `productContext?: string` — pre-resolved by the Server Action to `'Manometr MD-100 (SKU-001)'`-style string; the template renders `<Text>{copy.productLine(productContext)}</Text>` only when present.
- Default locale: `'uz'` (matches `magic-link.tsx:42` and `admin-invite.tsx:55` — the project default per Phase 1 D-01).

---

### `messages/{uz,ru,en}.json` (MODIFY)

**Analog:** `messages/uz.json` `public.header.*`, `public.product.*` namespaces (lines 40-67)

**Namespace nesting pattern** (`uz.json` lines 40-67):
```json
{
  "public": {
    "header": {
      "catalog": "Katalog",
      "manufacturers": "Ishlab chiqaruvchilar",
      "search": "Qidiruv",
      "searchPlaceholder": "Mahsulotlar va SKU bo'yicha qidirish..."
    },
    "product": {
      "applications": "Qo'llanilishi",
      "officialRep": "Rasmiy vakil",
      "verified": "Tasdiqlangan",
      "requestPrice": "Narxni so'rash",
      "downloads": "Hujjatlar"
    }
  }
}
```

**Notes:**
- New top-level child under `public.contact.*` — keys per RESEARCH §Pattern 6 + CONTEXT D-08:
  ```json
  "contact": {
    "cta": "Bog'lanish",        // sticky button + page link (uz)
    "pageTitle": "...",          // /contact page <h1>
    "pageSubtitle": "...",
    "form": {
      "name": "...", "company": "...", "email": "...", "phone": "...", "message": "...",
      "submit": "...", "submitting": "...",
      "successTitle": "...", "successBody": "...",
      "errorValidation": "...", "errorTurnstile": "...", "errorRateLimit": "...", "errorUnknown": "..."
    },
    "productContextPrefix": "Mahsulot bo'yicha so'rov: {name} ({sku})",  // server-side prepend
    "autoReply": {
      "subject": "...", "preview": "...", "greeting": "...", "body": "...", "signature": "..."
    }
  }
  ```
- ALL THREE files (uz/ru/en) get the same key tree — never per-locale key drift (Phase-3 + Phase-4 invariant; verify with `pnpm i18n:verify` if it exists, or visual diff).
- Existing `messages/en.json` line 42 already says `"manufacturers": "Manufacturers"` — Phase-5 adds keys ONLY; never edits existing keys.

---

### `src/components/public/contact-form.tsx` (NEW)

**Analog:** `src/components/admin/recipe-form.tsx` (RHF + Zod resolver + useForm shape)

**Imports + form-init pattern** (lines 1-103):
```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { saveRecipe /* ... */ } from "@/actions/recipes";
import { recipeInsertSchema, type RecipeInput } from "@/lib/zod/recipe";

const EMPTY_INITIAL: RecipeInput = { /* defaults */ };

export function RecipeForm({ /* ... */ }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<RecipeInput>({
    defaultValues: initial ?? EMPTY_INITIAL,
    mode: "onBlur",
  });
  // ...
}
```

**Honeypot field excerpt** (RESEARCH §Code Examples lines 778-797):
```tsx
<input
  type="text"
  {...register('field_extra')}
  tabIndex={-1}
  autoComplete="off"
  aria-hidden="true"
  // Inline style — NOT Tailwind class (purge risk)
  style={{
    position: 'absolute', width: '1px', height: '1px',
    padding: 0, margin: '-1px', overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0,
  }}
/>
```

**Notes:**
- `'use client'` (RHF requires client). Use `useForm({ resolver: zodResolver(contactInsertSchema), mode: 'onBlur' })`.
- React 19 `useActionState` bridge to `submitContactForm`; switch on `result.ok` and `result.error`. Error mapping per RESEARCH §Pattern 1:
  - `'turnstile_failed'` → "Please complete the challenge" + `turnstileRef.current?.reset()` (Pitfall #2)
  - `'rate_limited'` → "Too many submissions, try again in an hour"
  - `'validation'` → field-level errors via RHF
  - `'spam_detected'` → never surfaces (server returns `{ok:true}` shape; honeypot drops silently)
- `<Turnstile>` widget mount via `@marsidev/react-turnstile` ref API; siteKey from `env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Hidden `sourcePage = usePathname()`; hidden `locale` derived from the locale segment.
- `productContext?: string` prop — when set (modal opened from product-detail sticky CTA), pre-fills a visible "Inquiry about: …" prefix client-side; server STILL re-derives from `sourcePage` for trust (RESEARCH §Code Insights line 125).
- W7-style status freeze pattern from RecipeForm is NOT relevant here — visitors aren't admins; nothing to freeze.

---

### `src/components/public/contact-button.tsx` (NEW)

**Analog:** `src/components/admin/confirm-dialog.tsx`

**Dialog wrapper pattern** (lines 30-118):
```tsx
"use client";

import * as React from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmDialog({ trigger, title, description, /* ... */ }: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => { if (!open) setTyped(""); }, [open]);

  async function handleConfirm() {
    if (!matches) return;
    await onConfirm();
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {/* body */}
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Notes:**
- Swap `AlertDialog*` → `Dialog*` (shadcn `Dialog`, not `AlertDialog`). The Phase-5 modal is non-destructive; `Dialog` is the right primitive (Phase-2 `ConfirmDialog` uses `AlertDialog` because confirms are destructive). shadcn `Dialog` is documented as already installed (CONTEXT line 58).
- Component owns `open` state via `React.useState`. The trigger is a styled `<Button>` with localized label `t('public.contact.cta')`.
- Body of the dialog renders `<ContactForm onSuccess={() => setOpen(false)} productContext={productContext} />` — same component as the canonical page mounts.
- Optional `productContext?: string` prop — passed from the product-detail sticky CTA wiring (next file). When unset (header button), no pre-fill.

---

### `src/components/public/site-header.tsx` (MODIFY)

**Analog:** `src/components/public/site-header.tsx` (self)

**Existing mount-point shape** (lines 26-50):
```tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from './locale-switcher';
import { SearchBox } from './search-box';

export async function SiteHeader({ locale }: SiteHeaderProps) {
  const t = await getTranslations({ locale, namespace: 'public.header' });
  return (
    <header className="sticky top-0 z-40 backdrop-blur-[14px] bg-slate-50/80 border-b border-slate-200">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-6 px-6 py-3">
        <Link href={`/${locale}`}>Manometr</Link>
        <nav>...</nav>
        <SearchBox locale={locale} placeholder={t('searchPlaceholder')} />
        <LocaleSwitcher currentLocale={locale} />
      </div>
    </header>
  );
}
```

**Notes:**
- Add one import: `import { ContactButton } from './contact-button';`
- Add one element AFTER `<LocaleSwitcher />`: `<ContactButton locale={locale} label={t('contact.cta')} />` — D-01 says right of LocaleSwitcher.
- Pull the label via the existing `getTranslations({ locale, namespace: 'public.header' })` call (or open a sibling `'public.contact'` translator). Either works; mirror the `LocaleSwitcher` pattern.
- This is the only edit to the existing file. Header layout dimensions (max-width, gap, padding) MUST stay identical to avoid CLS regression on every existing page (Phase-3 SEO-05 budget).

---

### `src/components/public/sticky-cta-rail.tsx` (MODIFY)

**Analog:** `src/components/public/sticky-cta-rail.tsx` (self)

**Existing CTA-button anchor pattern** (lines 68-76):
```tsx
{/* Phase-5 swap: replace #contact href with the live contact-form route. */}
<a
  href="#contact"
  className="block w-full rounded-md bg-blue-700 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-blue-800"
  data-testid="cta-request-price"
>
  {labels.requestPrice}
</a>
```

**Notes:**
- The existing component already has a `Phase-5 swap` comment marker (line 69) flagging this exact substitution.
- **Architecture decision needed:** the rail is currently an RSC. To open a Dialog, the trigger needs client state. Two options:
  1. **Promote to client component** (`'use client'` at top) — simplest, but breaks the RSC posture of every product detail page that mounts it.
  2. **Extract a small `<RequestPriceCtaButton productName productSku />` client island** that the RSC renders in place of the `<a href="#contact">`. This island owns its own `<Dialog>` state and pre-fills `productContext` to `\`${productName} (${sku})\``.
- **Recommended: option 2** (client island) — preserves RSC streaming for the rail markup; only the trigger opt-ins to client JS. The island can reuse the same `<ContactButton>` component if it accepts a `productContext` prop, OR ship a sibling `<ProductContextContactButton>`.
- Phone (`tel:+998…`) and email (`mailto:`) anchors stay unchanged — they don't need the modal.

---

### `src/app/[locale]/contact/page.tsx` (NEW)

**Analog:** `src/app/[locale]/recipes/page.tsx`

**Full RSC page shape** (lines 1-60):
```tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { findPublishedRecipes } from '@/lib/recipes';
import { buildAlternates, type Locale } from '@/lib/metadata';
import { RecipeCard } from '@/components/public/recipe-card';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'public.recipes.index' });
  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: buildAlternates({
      locale: locale as Locale,
      pathPrefix: '/recipes',
    }),
  };
}

export default function RecipesIndexPage({ params }: Props) {
  return (
    <Suspense fallback={/* skeleton */}>
      <RecipesIndexContent params={params} />
    </Suspense>
  );
}

async function RecipesIndexContent({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // ...
}
```

**Notes:**
- Same `params: Promise<{locale: string}>` shape, same `setRequestLocale` + `getTranslations` discipline, same `buildAlternates({ locale, pathPrefix: '/contact' })` for hreflang.
- No DB read needed — the page is static markup wrapping `<ContactForm>`. Skip the `<Suspense>` if there's no async fetch; the recipes-index uses Suspense to wrap the async DB read.
- `pathPrefix: '/contact'` — same path under each locale, no slug map needed (every locale has `/[locale]/contact`).
- Mount the same `<ContactForm />` the modal renders. No `productContext` (canonical page doesn't know which product).
- `generateMetadata` `title` + `description` from `messages/{uz,ru,en}.json` `public.contact.pageTitle` / `public.contact.pageSubtitle`.

---

### `src/lib/sitemap.ts` (MODIFY)

**Analog:** `src/lib/sitemap.ts` (self, lines 71-89)

**Existing static-paths block** (lines 71-89 — verbatim):
```typescript
// ── Static paths ─────────────────────────────────────────────────────────
// Root index, category index, manufacturer index — same path shape across
// all 3 locales so the alternates map is built by simple substitution.
for (const staticPath of [
  '',
  '/categories',
  '/manufacturers',
  '/recipes',
  '/industries',
] as const) {
  const alternates: Partial<Record<Locale, string>> = {};
  for (const l of ALL_LOCALES) {
    alternates[l] = `${HOST}/${l}${staticPath}`;
  }
  entries.push({
    loc: `${HOST}/${locale}${staticPath}`,
    alternates,
  });
}
```

**Notes:**
- One-element addition to the array literal: `'/contact'`.
- The surrounding `for` + `alternates` substitution loop handles per-locale fan-out automatically (existing pattern — every locale has `/[locale]/contact` with no slug variation).
- No DB read needed (the page has no row-backed state).
- The cache-tag fan-out (`'sitemap'`) is already wired by Phase-2 `revalidation.ts`; `revalidateTag('sitemap')` from the Server Action is NOT needed for the contact path (it's static, not row-backed).

---

### `.lighthouserc.json` (MODIFY)

**Analog:** `.lighthouserc.json` (self)

**Current contents** (verbatim):
```json
{
  "ci": {
    "collect": {
      "settings": {
        "preset": "mobile",
        "throttling": { "rttMs": 150, "throughputKbps": 1638.4, "cpuSlowdownMultiplier": 4 },
      },
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }],
        "categories:performance": ["warn", { "minScore": 0.7 }]
      }
    }
  }
}
```

**Notes:**
- RESEARCH §Summary lines 13 confirms throttling is ALREADY at Slow-4G (1638 Kbps / 150ms RTT / 4x CPU slowdown). Phase 5 does NOT need to add a profile.
- Phase 5 modification: lift `"warn"` → `"error"` on the LCP assertion AND `categories:performance`. Optionally tighten `maxNumericValue` from 2500 to 2200 for Slow-4G headroom; planner picks.
- URL expansion happens in the workflow file (`urls:` block), NOT here.

---

### `.github/workflows/lighthouse-preview.yml` (MODIFY)

**Analog:** `.github/workflows/lighthouse-preview.yml` (self)

**Current single-URL block** (lines 64-72):
```yaml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      ${{ steps.preview.outputs.url }}/uz/products/manometr-m-100
    configPath: ./.lighthouserc.json
    uploadArtifacts: true
    temporaryPublicStorage: true
```

**Notes:**
- Expand `urls:` from 1 line to 5 (D-11 + RESEARCH §Pattern: homepage + a hot category + product detail + search + sitemap):
  ```yaml
  urls: |
    ${{ steps.preview.outputs.url }}/uz
    ${{ steps.preview.outputs.url }}/uz/categories/<hot-cat-slug>
    ${{ steps.preview.outputs.url }}/uz/products/manometr-m-100
    ${{ steps.preview.outputs.url }}/uz/search?q=manometr
    ${{ steps.preview.outputs.url }}/sitemap-uz.xml
  ```
- Pitfall #11 Vercel Deployment Protection bypass header (`LHCI_EXTRA_HEADERS`) stays in the env block unchanged.
- The workflow's `paths:` trigger filter (lines 23-29) MAY need expansion if Phase-5 adds files outside `src/**`; review when planning.

---

### `scripts/load-test.sh` (NEW)

**Analog:** None (no existing `.sh` scripts in the repo). Closest precedent: `scripts/verify-02-01-migration.ts` (one-shot script with env loading + structured PASS/FAIL output).

**Pattern to mirror** (verifier env-loading + PASS/FAIL pattern, transposed to bash):
- Load `BASE_URL` and `VERCEL_AUTOMATION_BYPASS_SECRET` from env (CI sets both).
- Run `ab -n 500 -c 50 -H "x-vercel-protection-bypass: $BYPASS" "$BASE_URL/uz/products/<slug>"` for each of the 5 endpoints (homepage + hot category + product detail + search + sitemap — same set the Lighthouse workflow uses).
- Parse `ab` output: extract p95 (line `Percentage of the requests served … 95%   <ms>`) and `Failed requests:` (must be 0).
- Exit 1 if any endpoint exceeds the budget (planner picks: e.g., p95 < 800ms) or has any failed request.
- Use `jq` only if a JSON-shaped report is needed; `awk`/`grep` is enough for `ab` text output.

**Notes:**
- Manual `workflow_dispatch` only (CONTEXT D-11 + RESEARCH §Architectural Responsibility Map line 91); do NOT run on every PR.
- Use `set -euo pipefail` at the top (POSIX safety net — every Phase-1 bash decision was "no shell scripts shipped"; this is the first one).
- Bash on Vercel/GH-Actions is fine (`ubuntu-latest` includes `ab` via `apache2-utils`; install with `sudo apt-get install -y apache2-utils` in the workflow before running).

---

### `tests/e2e/contact-roundtrip.spec.ts` (NEW — Wave 0 RED, Wave 2 GREEN)

**Analog:** `tests/e2e/admin-edit-revalidates.spec.ts`

**Preview-gate scaffolding** (lines 1-73):
```typescript
import { test, expect } from "@playwright/test";
import { sql } from "drizzle-orm";
import { getTestDb, requireTestDatabaseUrl } from "../_fixtures/db";
import { seedProduct } from "../_fixtures/seed-products";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { "x-vercel-protection-bypass": protectionBypass }
  : {};

test.describe.configure({ mode: "serial" });

test.describe("contact form roundtrip", () => {
  test.skip(
    process.env.CI !== "true" && baseURL === "http://localhost:3000",
    "requires a Vercel preview URL (set BASE_URL); local-fallback skip",
  );

  test("visitor submits form → contact_submission row exists in Neon → success state shown", async ({ page }) => {
    requireTestDatabaseUrl();
    const db = await getTestDb();
    // ... open page, fill form, mock Turnstile via test site key (1x00000000000000000000AA), submit, poll DB
  });
});
```

**Notes:**
- Reuse the existing `tests/_fixtures/db.ts` `getTestDb()` helper; reuse `tests/_fixtures/seed-products.ts` for the product-context auto-prepend test case (D-03).
- Cloudflare provides documented test site keys (`1x00000000000000000000AA` always-pass per RESEARCH §Pitfall 8) — set in the test environment so `verifyTurnstile` returns success without a live challenge.
- DB-direct verification: `SELECT COUNT(*) FROM contact_submission WHERE email = $testEmail` after submit; tear down via `DELETE FROM contact_submission WHERE email = $testEmail` in `finally{}`.
- Same `extraHeaders` Vercel Deployment Protection bypass pattern (Pitfall #11) — verbatim copy.
- Same local-fallback `test.skip` gate.

---

### `tests/e2e/cloudinary-widget-smoke.spec.ts` (NEW — DEF-4-12-04 absorption)

**Analog:** `tests/e2e/admin-edit-revalidates.spec.ts` (preview-gate scaffolding only)

**Preview-gate excerpt** (same as contact-roundtrip.spec.ts above).

**Notes:**
- Smoke-only per RESEARCH §Anti-Patterns line 689: assert (a) the widget DOM mounts (button visible) on the admin product editor page, (b) `/api/cloudinary/sign` returns 200 when called directly with a valid admin session.
- Do NOT attempt cross-origin iframe interaction (`frameLocator` doesn't reach into `widget.cloudinary.com`).
- Requires the same magic-link DB-direct login flow as `admin-edit-revalidates.spec.ts` lines 109-153 — copy that block verbatim.

---

### `tests/e2e/glyph-render.spec.ts` (NEW — DEF-4-12-03 absorption)

**Analog:** `tests/e2e/admin-edit-revalidates.spec.ts` (preview-gate scaffolding only)

**Notes:**
- Per RESEARCH §Architectural Responsibility Map line 93: assert SSR HTML contains target characters (`'oʻ'` U+006F U+02BB; `'gʻ'` U+0067 U+02BB; Cyrillic `'я'`, `'ё'`) AND `getComputedStyle(el).fontFamily` includes the next/font className (Inter loaded with cyrillic+latin-ext subsets in Phase 1 SEO-04).
- Test 3 pages per locale: `/uz/products/<slug>` for Uzbek-Latin, `/ru/products/<slug>` for Cyrillic, `/en/products/<slug>` baseline.
- No DB seeding required — assert on real published products (the preview deployment carries Phase-4 seed content).

---

### `public/google[hash].html`, `public/yandex_[hash].html` (NEW — placeholders)

**Analog:** None — no existing top-level `public/` HTML files. Vercel serves files in `public/` directly.

**Notes:**
- Single-line files per RESEARCH §Pattern 7 lines 656-664. Content shape is dictated by Search Console / Yandex Webmaster (typically `google-site-verification: googleabc123.html` or similar).
- Plan ships PLACEHOLDERS with `TODO: replace with verification hash from Search Console` content. The user (D-12) registers the property post-merge, downloads the real verification file, and commits it (1-line replacement; no Claude action required).
- No analog needed — these are trivial single-line files.

---

### `docs/dogfood-protocol.md` (NEW)

**Analog:** Loose match — `.planning/phases/04-content-features/04-12-PLAN.md` (closure-doc shape with timing logs and acceptance criteria).

**Notes:**
- Per RESEARCH §Pattern 8 lines 668-678. Markdown checklist: 10 trilingual products list, per-product timing log template (start / end / actual minutes), acceptance criterion (avg ≤10min, no individual >15min), sign-off line.
- File location: `docs/dogfood-protocol.md` per the prompt; alternatively `.planning/phases/05-contact-launch-polish/05-DOGFOOD-PROTOCOL.md` per RESEARCH §Pattern 8 line 672. Planner picks; recommended `.planning/phases/05-contact-launch-polish/` so it sits with the other phase artifacts.

---

### `.planning/phases/05-contact-launch-polish/05-VERIFICATION.md` (NEW)

**Analog:** `.planning/phases/04-content-features/04-VERIFICATION.md`

**Notes:**
- Same `closed-with-deferred-validation` posture as Phase-2 / Phase-4 (D-14). Planner produces this from the per-plan validation rollups; not a code-pattern question.
- Lists DEF-5-NN-NN entries with explicit owner = user (Search Console registration, Yandex Webmaster registration, real-device Slow-4G QA, content-team dogfood). All other plan IDs MUST be GREEN before phase closes.

---

### `.planning/RETROSPECTIVE.md` (APPEND)

**Analog:** existing entries (Phase-1..4 retrospective shape).

**Notes:**
- Append a Phase-5 entry per the existing convention. Two-state per D-15: "Phase 5 locally complete" (immediate, on PR merge) and "v1 launched" (later, after all DEF-5 entries clear).

---

## Shared Patterns

### Pattern A: `dbTx.transaction(async (tx) => …)` — atomic multi-statement work

**Source:** `src/db/client-ws.ts:1-21` (driver doc) + `src/actions/recipes.ts:116-199` (canonical usage)

**Apply to:** `src/lib/rate-limit.ts` (UPSERT both buckets + check), `src/lib/server-action.ts` `withPublicAction` (audit writes for `spam_detected` + `rate_limited`), `src/actions/contact.ts` (insert `contact_submission`)

```typescript
import { dbTx } from '@/db/client-ws';
await dbTx.transaction(async (tx) => {
  await tx.execute(sql`...`);   // multi-statement
  await tx.insert(...).values(...).onConflictDoUpdate({ ... });
  await logAudit(tx, { ... }); // atomic with the row mutation
});
```

**CRITICAL:** the regular `db` client (`src/db/client.ts`, HTTP driver) is single-statement only. Multi-statement work via `db` silently breaks atomicity (Pitfall #1). Every Phase-5 transactional helper MUST import `dbTx` from `@/db/client-ws`.

---

### Pattern B: discriminated `{ ok, error|data }` Server Action result

**Source:** `src/lib/server-action.ts:21-23`

**Apply to:** `submitContactForm` return shape (via `withPublicAction`); RHF `useActionState` consumer in `<ContactForm>`.

```typescript
export type AdminActionResult<O> =
  | { ok: true; data: O }
  | { ok: false; error: 'validation' | 'unauthorized' | 'unknown' };
```

**Phase-5 extension:** `PublicActionResult<O>` swaps the error union to `'validation' | 'turnstile_failed' | 'rate_limited' | 'spam_detected' | 'unknown'` so the client form can render field-level messages per failure reason (Pitfall #2 widget reset, etc.). Never throw across the Server Action boundary; always return the discriminated shape.

---

### Pattern C: `logAudit(tx, { actorEmail, action, entityType, entityId, before, after, ip, userAgent })` inside a Tx

**Source:** `src/lib/audit.ts:61-72`

**Apply to:** `withPublicAction` honeypot-trip + rate-limit-denial audit writes. Visitor flows use `actorEmail: 'visitor'` (literal string), `entityType: 'contact_submission_attempt'`, `entityId: ipHash`. The `submitContactForm` handler itself does NOT write an audit row for the successful insert — `audit_log` is admin-actor-scoped per the comment in `audit.ts:13-15`.

```typescript
await dbTx.transaction(async (tx) => {
  await logAudit(tx, {
    actorEmail: 'visitor',
    action: 'spam_detected', // OR 'rate_limited'
    entityType: 'contact_submission_attempt',
    entityId: ipHash,
    before: null,
    after: { ipHash, userAgent /* + hourCount/dayCount for rate_limited */ },
    ip, userAgent,
  });
});
```

---

### Pattern D: Vercel preview gate with Deployment Protection bypass + local-fallback skip

**Source:** `tests/e2e/admin-edit-revalidates.spec.ts:44-73`

**Apply to:** all 3 new e2e specs (`contact-roundtrip.spec.ts`, `cloudinary-widget-smoke.spec.ts`, `glyph-render.spec.ts`).

```typescript
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHeaders: Record<string, string> = protectionBypass
  ? { "x-vercel-protection-bypass": protectionBypass }
  : {};

test.describe.configure({ mode: "serial" });

test.skip(
  process.env.CI !== "true" && baseURL === "http://localhost:3000",
  "requires a Vercel preview URL (set BASE_URL); local-fallback skip",
);
```

Wire each new spec into `.github/workflows/e2e-preview.yml` job matrix (or add a sibling job). The DB-direct magic-link consumption pattern from `admin-edit-revalidates.spec.ts:104-153` transplants verbatim into `cloudinary-widget-smoke.spec.ts` (admin login required for the widget surface).

---

### Pattern E: locale-parameterized React Email with COPY map + `default = 'uz'`

**Source:** `src/emails/magic-link.tsx:21-66`, `src/emails/admin-invite.tsx:26-75`

**Apply to:** `ContactSubmissionAutoReply.tsx` (locale-parameterized). The admin-side template (`ContactSubmissionAdminEmail.tsx`) is English-only — drop the COPY map.

Uses inline `style={{...}}` (NOT Tailwind) because email clients strip class-based styling.

---

### Pattern F: `setRequestLocale(locale)` + `getTranslations({ locale, namespace })` + `buildAlternates({ locale, pathPrefix })` for every public RSC page

**Source:** `src/app/[locale]/recipes/page.tsx:31-69`

**Apply to:** `src/app/[locale]/contact/page.tsx`. Mandatory before any `getTranslations()` call to avoid forced dynamic rendering (Phase-3 Pitfall A6 / Phase-4 carry-forward). `buildAlternates` ships `hreflang` for all 3 locales + `x-default` automatically (Phase-3 SEO-01 / SEO-02 wiring).

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| `scripts/load-test.sh` | shell script | First `.sh` script in the repo. Borrow ENV-loading pattern from `scripts/verify-02-01-migration.ts` and shape the bash from RESEARCH §Pattern recommendations. Planner picks: budget for p95 (suggest 800ms), endpoint set (5 from RESEARCH §Architectural Responsibility Map). |
| `public/google<hash>.html`, `public/yandex_<hash>.html` | public asset | No existing top-level HTML in `public/`. Trivial single-line placeholders per Search Console / Yandex Webmaster's HTML-file verification spec. User swaps in real hash post-registration (D-12). |

Both items have NO existing-codebase precedent but are well-specified by external constraints (RESEARCH §Pattern 7 for verification files; standard `ab` invocation for the load test). Planner can ship from RESEARCH excerpts without an analog.

---

## Metadata

**Analog search scope:** `src/db/schema/`, `src/lib/`, `src/lib/zod/`, `src/actions/`, `src/components/public/`, `src/components/admin/`, `src/app/[locale]/`, `src/emails/`, `tests/e2e/`, `scripts/`, `drizzle/`, `messages/`, `.github/workflows/`, root configs (`.lighthouserc.json`).

**Files scanned:** ~40 (representative sample across all 7 above directories; not every file in every directory — early-stopped once 3-5 strong analogs were confirmed per Phase-5 target).

**Pattern extraction date:** 2026-05-05

**Key cross-cutting invariants Phase-5 inherits (non-negotiable):**
1. **Multi-statement transactions ONLY via `dbTx` (WebSocket Pool).** `db` (HTTP driver) silently fails atomicity.
2. **Server Action returns discriminated `{ ok, error|data }`.** Never throws across the boundary.
3. **`logAudit` is called inside `dbTx.transaction(async (tx) => ...)` with the tx-scoped client.** Never with the regular `dbTx` client (would break atomicity).
4. **Email templates are React Email files with inline `style={{...}}`.** Tailwind classes don't survive email client rendering.
5. **Public RSC pages start with `setRequestLocale(locale)` BEFORE any `getTranslations()` call.** Otherwise forced-dynamic rendering breaks ISR.
6. **Resend sends are fire-and-forget (`void send().catch(Sentry.captureException)`)** AFTER the row commits. Never `await` Resend in the visitor's request path (Pitfall #4).
7. **`messages/{uz,ru,en}.json` get the same key tree.** Never per-locale key drift.
8. **Public-anonymous Server Actions go through `withPublicAction`** (the new wrapper); admin Server Actions stay on `withAdminAction`. Honeypot/Turnstile/rate-limit live in the wrapper, not in handler bodies.

## PATTERN MAPPING COMPLETE
