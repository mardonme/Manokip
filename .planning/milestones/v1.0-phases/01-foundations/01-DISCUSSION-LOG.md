# Phase 1: Foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 01-foundations
**Areas discussed:** Locale codes + default locale, Translation fallback policy, Auth session model, spec_field shape details

---

## Locale codes + default locale

### Q1: Locale code string format

| Option | Description | Selected |
|--------|-------------|----------|
| `'uz'` (simple) | Bare ISO 639-1. Shorter URLs. Risk: future uz-Cyrl migration. | ✓ |
| `'uz-Latn'` (BCP-47) | Future-proof. PITFALLS.md recommendation. | |
| `'uz'` in URL, `'uz-Latn'` in DB | Thin mapping layer both sides. | |

**User's choice:** `'uz'` bare code in both URL and DB.
**Notes:** Accepted the future migration cost for `uz-Cyrl`; v1 keeps URLs clean.

### Q2: Default locale when no signal

| Option | Description | Selected |
|--------|-------------|----------|
| `'ru'` | CIS default; research assumption. | |
| `'uz'` (Recommended) | `.uz` domain + Uzbek-first audience. Matches PITFALLS warning against RU-first assumption. | ✓ |
| `'en'` | Neutral; smallest audience segment. | |

**User's choice:** `'uz'`.
**Notes:** Reinforces the Uzbek-first product posture.

### Q3: Root `/` detection chain

| Option | Description | Selected |
|--------|-------------|----------|
| Cookie → Accept-Language → default `uz` (Recommended) | Returning visitor remembered via cookie; standard pattern. | ✓ |
| Accept-Language → default `uz` (no cookie) | Simpler; loses returning-visitor memory. | |
| Always default `uz` (no detection) | Strongest Uzbek-first brand signal. | |
| Geo-IP → cookie → Accept-Language → `uz` | Overkill for v1. | |

**User's choice:** Cookie → Accept-Language → default `uz`.

---

## Translation fallback policy

### Q4: What happens at `/<locale>/products/<slug>` when translation is missing

| Option | Description | Selected |
|--------|-------------|----------|
| Render fallback + banner (Recommended) | Preserves SEO + deep links; clear banner; JSON-LD declares actual inLanguage. | ✓ |
| Hide from listings/search, direct URL with banner | Cleaner in-locale listings but can feel empty early. | |
| Redirect to a locale that has it | Abrupt; breaks URL stability. | |
| 404 — does not exist in this locale | Hurts SEO; doesn't match "graceful fallback" language. | |

**User's choice:** Render fallback + banner.

### Q5: Fallback locale priority chain

| Option | Description | Selected |
|--------|-------------|----------|
| `ru → en → uz` (Recommended) | RU likely most complete earliest. | |
| `uz → ru → en` | Matches Uzbek-first default; reinforces brand. | ✓ |
| Per-entity configurable | Most flexible but pitfall #12 cautions against mixing policies. | |
| Fixed render fallback, strict listings | Hybrid: detail relaxed, listings strict. | |

**User's choice:** `uz → ru → en`.
**Notes:** Chose consistency with default locale over "likely most complete" pragmatism.

### Q6: Listings + search inclusion policy

| Option | Description | Selected |
|--------|-------------|----------|
| Include via fallback (Recommended) | Consistent with detail-page policy; small badge indicates fallback. | ✓ |
| Hide strictly, show only via direct URL | Locale-pure listings but risks empty catalogs early. | |
| Include only when at least name is translated | Middle ground; needs completeness metadata. | |

**User's choice:** Include via fallback.

---

## Auth session model

### Q7: Session storage strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Database sessions (Recommended) | True server-enforced 24h idle; revocable; `sessions` table in Phase 1 schema. | ✓ |
| JWT with refresh-on-activity | No DB table; idle-timeout requires iat refresh; can't revoke without denylist. | |
| JWT + refresh token in DB | Hybrid; overkill for 2–5 admins. | |

**User's choice:** Database sessions.
**Notes:** True 24h idle enforcement is a business requirement; JWT-only cannot satisfy it faithfully.

### Q8: admin_user table relationship to Auth.js users

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `admin_user` keyed by email (Recommended) | Clean boundary; matches research; simple invite semantics. | ✓ |
| Single users table + `is_admin` column | Couples app schema to Auth.js internals. | |
| Separate `admin_user` keyed by auth user UUID | Resilient to email changes but breaks invite-by-email simplicity. | |

**User's choice:** Separate `admin_user` keyed by email.

### Q9: Role column in admin_user

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, `role TEXT default 'admin'` (Recommended) | Zero cost now; v2 RBAC ships without migration. | ✓ |
| No, add when v2 RBAC lands | Schema minimal; cheap migration later. | |

**User's choice:** Yes, role column now.

### Q10: First admin bootstrap mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| `BOOTSTRAP_ADMIN_EMAIL` env var, idempotent seed on boot (Recommended) | Runs once then no-ops; safe to leave set. | ✓ |
| `pnpm db:seed` script | Cleaner separation; manual per-env step. | |
| Manual SQL INSERT documented in README | Zero code; error-prone. | |

**User's choice:** `BOOTSTRAP_ADMIN_EMAIL` env-var idempotent seed.

### Q11: audit_log table declaration timing

| Option | Description | Selected |
|--------|-------------|----------|
| Declare in Phase 1 schema, writes start in Phase 2 (Recommended) | Preserves "schema locked early" guarantee. | ✓ |
| Defer entirely to Phase 2 | ADMIN-11 is Phase 2; weakens schema-locked guarantee. | |

**User's choice:** Declare in Phase 1.

---

## spec_field shape details

### Q12: How to model `range`

| Option | Description | Selected |
|--------|-------------|----------|
| Two `number` spec_fields + `filter_kind='range'` (Recommended) | Single filtering query shape; matches PITFALLS #2 example. | ✓ |
| Distinct `range` data_type with num_min + num_max columns | Extra columns; two query paths. | |
| `range` stored as JSONB `{min, max}` | Reintroduces JSONB filter cliff (PITFALLS #10). | |

**User's choice:** Two number fields + `filter_kind='range'`. No `range` data_type.

### Q13: Enum option storage

| Option | Description | Selected |
|--------|-------------|----------|
| Child `spec_field_enum_option` + translations (Recommended) | Matches project translation pattern; queryable; referable. | ✓ |
| JSONB `enum_options` on spec_field | Violates JSONB-translations guardrail. | |
| Unstructured: `enum_value` stores raw label | Breaks filtering (pitfall #2 failure). | |

**User's choice:** Child tables with translation sibling.

### Q14: spec_field.key mutability

| Option | Description | Selected |
|--------|-------------|----------|
| Mutable with migration awareness (Recommended) | Transaction-safe rename; PITFALLS #14 aligned. | ✓ |
| Immutable after first product_spec_value written | Simple rule; awkward for typo fixes. | |

**User's choice:** Mutable with migration awareness.

### Q15: Extras translation storage

| Option | Description | Selected |
|--------|-------------|----------|
| Sibling `product_spec_value_translations` table (Recommended) | Consistent with universal translation pattern. | ✓ |
| Three rows in `product_spec_values` (one per locale) | Breaks pattern; awkward to query. | |

**User's choice:** Sibling translation table.

---

## Claude's Discretion

Items the user delegated to Claude (documented in CONTEXT.md D-items and Claude's Discretion section):

- Migration workflow: direct URL for `drizzle-kit migrate` in Vercel build step; pooled URL at runtime.
- Neon-Vercel preview-branch integration.
- `@t3-oss/env-nextjs` + Zod env boundary.
- Sentry: default sample rates (100% error / 10% perf), PII scrubbing on.
- `src/lib/slug.ts` stub — full slug UX deferred to Phase 2.
- `next/font` subset setup `['latin','latin-ext','cyrillic']`; actual typeface is Phase 3 design.
- Minimal Phase 1 homepage + admin placeholder pages (prove routing; no real UX).
- Cloudinary sign endpoint returns signature with 15-minute TTL + folder allowlist.

---

## Deferred Ideas (summary)

See `01-CONTEXT.md` `<deferred>` section for full list. Key items pushed out:

- LocaleSwitcher UI, admin shell, invite flow → Phase 2
- Slug admin UX, `spec_field.key` rename migration UI → Phase 2
- `product_search` tsvector population, hreflang/canonical emission, JSON-LD → Phase 3
- Typography choice → Phase 3
- `uz-Cyrl` support, Editor/Admin RBAC → v2
