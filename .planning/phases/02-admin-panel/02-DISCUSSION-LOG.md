# Phase 2: Admin Panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 02-admin-panel
**Areas discussed:** Product CRUD page shape, Spec-schema editor mechanics, Cache invalidation + draft/published semantics, Admin lifecycle + audit log shape

---

## Product CRUD page shape

### Q1: What top-level layout for the product editor?

| Option | Description | Selected |
|--------|-------------|----------|
| Single long page, locale tabs at top (Recommended) | All sections on one scrollable page; tabs swap only translatable fields; typed specs and structural fields shared. | ✓ |
| Wizard: Basics → Translations → Specs → Media → Publish | Stepper for new products; adds friction to repeat edits; loses density. | |
| Two-pane: section nav left, editor right | Left rail with completion dots; main area shows current section. More chrome, less density. | |

**User's choice:** Single long page, locale tabs at top
**Notes:** Aligns with fiztech editing density and the 10-min target. Captured as D-01.

### Q2: How should locale tabs behave when an admin switches between uz/ru/en?

| Option | Description | Selected |
|--------|-------------|----------|
| Local-only tab swap, single Save commits all 3 locales (Recommended) | RHF holds all 3 locales; tabs are pure UI state; single transactional Server Action upserts everything. | ✓ |
| Per-locale Save (each locale saves independently) | Saves on tab switch if dirty; fragile for revalidateTag; partially-saved products possible. | |
| All tabs visible side-by-side (no tabs at all) | Three columns of translation fields next to each other. Pushes specs below the fold. | |

**User's choice:** Local-only tab swap, single Save
**Notes:** Captured as D-02.

### Q3: What about the duplicate-product action (ADMIN-08) — what gets copied?

| Option | Description | Selected |
|--------|-------------|----------|
| Full clone, all 3 locales, status=draft, slug suffixed '-copy' (Recommended) | Copy translations, spec values, extras, media public_ids; status forced draft; -copy suffix avoids slug UNIQUE collision. | ✓ |
| Structural clone only (specs + category + manufacturer), translations + media empty | Forces re-translation; slower for product-line variants. | |
| Modal: pick which sections to copy | More flexible but adds friction. | |

**User's choice:** Full clone with -copy suffix
**Notes:** Captured as D-03.

### Q4: What does the translation-completeness indicator (ADMIN-10) actually count, and where does it live?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-locale % bar in editor + per-locale dot in product list (Recommended) | Counts name/short/long/slug + required text spec values; SQL view; three % bars next to tabs; colored dots in list. | ✓ |
| Boolean per-locale ('complete' / 'partial' / 'missing'), no % | Cheaper to compute; loses translator granularity. | |
| Per-field-per-locale checklist on a separate panel | Most informative; takes screen space. | |

**User's choice:** Per-locale % bar + dots
**Notes:** Captured as D-04.

### Q5: How does the machine_translated flag (ADMIN-09) get set and shown?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-field checkbox in editor + amber border + 'MT' badge in admin list (Recommended) | Per-field granularity; visible without taking space. | ✓ |
| Per-translation-row flag (locale-level only), no field-level granularity | Simpler schema; can't distinguish human name + MT description. | |
| Free-text 'translation notes' field per locale | Rejected — too soft, no auditability. | |

**User's choice:** Per-field checkbox + amber border + MT badge
**Notes:** Captured as D-05. Schema choice (sibling table vs columns per translation table) left to Claude's discretion.

---

## Spec-schema editor mechanics

### Q1: What happens when an admin renames a spec_field's key?

| Option | Description | Selected |
|--------|-------------|----------|
| Rename runs as a single transaction with an impact-preview confirm dialog (Recommended) | Modal with N-rows-affected count + type-to-confirm; transaction updates spec_field + extra_key + audit log. | ✓ |
| Rename is just a label change — internal key is immutable | Simpler; admin stuck with bad initial naming forever. | |
| Rename creates a new field + runs a migration script | Heaviest; expensive and noisy in audit log. | |

**User's choice:** Single transaction with impact preview
**Notes:** Captured as D-06. Direct response to PITFALLS #14.

### Q2: How does deleting a spec_field work when products already use it?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft-delete with impact count + cascade option (Recommended) | New spec_field.deleted_at column; admin chooses soft (hide, keep data) or hard (cascade drop). | ✓ |
| Always hard delete with confirmation | No schema change; admin handles migrations manually. | |
| Block delete if any product uses it | Safest but most painful. | |

**User's choice:** Soft-delete with cascade option
**Notes:** Captured as D-07. Schema additive: spec_field.deleted_at TIMESTAMPTZ NULL.

### Q3: Type changes (e.g., admin realizes 'material' should be enum, not text)?

| Option | Description | Selected |
|--------|-------------|----------|
| Block type changes; admin must create a new field + migrate data (Recommended) | Type dropdown disables after save; admin creates new field + optional copy-values action + soft-deletes old. | ✓ |
| Allow narrow conversions (text→enum if all values match an option, number→text always) | Adds significant editor complexity; preview UI required. | |
| Allow any type change with mass null-out warning | Rejected — too easy to lose data. | |

**User's choice:** Block type changes
**Notes:** Captured as D-08. PITFALLS #14 supports this posture.

### Q4: Should spec_fields belong to a 'group' (e.g., Dimensions, Performance, Electrical)?

| Option | Description | Selected |
|--------|-------------|----------|
| Add spec_field_group entity with translations + sort_order; product detail renders grouped tables (Recommended) | New tables: spec_field_group + spec_field_group_translations; spec_field gets group_id FK; admin DnDs fields into groups; per-category. | ✓ |
| Flat list with manual sort_order, no groups | Loses fiztech grouped-density aesthetic. | |
| Tag-based grouping (multiple tag strings) | Rejected — doesn't model render order. | |

**User's choice:** spec_field_group entity
**Notes:** Captured as D-09. Phase 2 schema additive: 2 new tables + spec_field.group_id column. Enables Phase 3's fiztech-style detail page.

---

## Cache invalidation + draft/published semantics

### Q1: Cache tag granularity for revalidateTag on each Server Action?

| Option | Description | Selected |
|--------|-------------|----------|
| Fine-grained typed tags + a few collection tags (Recommended) | Per-entity tags (product:<id>, category:<id>, etc.) + collection tags (products-list, categories-tree, sitemap). Typed helpers fan out. | ✓ |
| Path-based revalidatePath only | Have to enumerate all 3 locales per change; couples to URL shape. | |
| Single coarse tag per entity type | One edit invalidates all products; defeats ISR. | |

**User's choice:** Fine-grained typed tags + collection tags
**Notes:** Captured as D-10. Helper module src/lib/revalidation.ts.

### Q2: What does 'published' mean given trilingual content?

| Option | Description | Selected |
|--------|-------------|----------|
| Single product.status enum: draft | published. 'Published' = visible in any locale via uz fallback chain (Recommended) | One Publish button; matches D-05..D-08 fallback chain; translation completeness is informational not gating. | ✓ |
| Per-locale publish flags | More control; breaks single-policy fallback rule (PITFALLS #12). | |
| Three states: draft | review | published | Adds editorial review; out of scope for 2–5 admin team. | |

**User's choice:** Single product.status enum
**Notes:** Captured as D-11. Schema additive: product.status TEXT CHECK ('draft','published').

### Q3: When a category re-parents, what gets invalidated?

| Option | Description | Selected |
|--------|-------------|----------|
| category:<id> for old + new parent + moved category + categories-tree + sitemap (Recommended) | Helper revalidateCategoryMove fans out; covers old-parent breadcrumb refresh. | ✓ |
| Just the moved category + categories-tree | Misses old/new parent breadcrumb refresh. | |
| Bust all category tags ('categories' coarse tag) | Defeats fine-grained granularity. | |

**User's choice:** Full fan-out via revalidateCategoryMove helper
**Notes:** Captured as D-12.

### Q4: How is the e2e revalidation test enforced in CI?

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright test against the Vercel preview URL (Recommended) | GH Actions: deploy preview → admin login → edit → reload public page → assert change visible. PR-blocking. | ✓ |
| Server-side integration test only (no real preview) | Cheaper but doesn't catch actual cache-key mismatches. | |
| Manual checkpoint per release — no CI gate | Rejected — explicit anti-pattern in CLAUDE.md. | |

**User's choice:** Playwright on Vercel preview, PR-blocking
**Notes:** Captured as D-13. This is the OPS-01 definition-of-done.

---

## Admin lifecycle + audit log shape

### Q1: Admin invite flow (ADMIN-02: 48h single-use invite token)?

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-create admin_user(active=false) + invite_token row + email link (Recommended) | New admin_invite table; click-accept flips active=true; standard magic-link follows; single-use enforced at DB level. | ✓ |
| Just call signIn() directly with the invitee email | No 48h enforcement; no explicit acceptance step; no record of un-accepted invites. | |
| Invite link is a one-time URL (no separate invite table) | Worse audit trail; only expiry, no replay protection. | |

**User's choice:** Pre-create + admin_invite table
**Notes:** Captured as D-14. Schema additive: admin_invite table.

### Q2: Where is the 24h-idle / 7d-absolute session timeout enforced?

| Option | Description | Selected |
|--------|-------------|----------|
| proxy.ts middleware checks sessions row on every admin route + Auth.js maxAge as backstop (Recommended) | Single Neon HTTP read per admin request; idle from Auth.js DB strategy; absolute via sessions.created_at; clears cookie on rejection. | ✓ |
| Server Action wrapper requireAdmin() does the check | Stale cookie can navigate read-only until mutate; worse UX. | |
| Both — middleware AND requireAdmin() | Adds latency; overkill for 5 admins. | |

**User's choice:** Middleware-level enforcement + Auth.js backstop
**Notes:** Captured as D-15. Honors D-09 of Phase 1 (server-enforced, not cookie-lifetime).

### Q3: Audit log scope (ADMIN-11) — what gets recorded on each mutation?

| Option | Description | Selected |
|--------|-------------|----------|
| Every Server Action writes one row: actor + action + entity + before/after JSON + ip + ua (Recommended) | Closed action enum; logAudit() helper called inside transaction; uses Phase-1 audit_log table verbatim. | ✓ |
| Field-level diff log (one row per changed column) | Explodes log volume; harder to read entity history. | |
| Action + entity only, no before/after JSON | Fails 'rebuild what changed when'. | |

**User's choice:** Full before/after JSON per action
**Notes:** Captured as D-16. Closed action enum lints reject unknown values.

### Q4: How are the audit log + contact submissions surfaced in the admin UI?

| Option | Description | Selected |
|--------|-------------|----------|
| TanStack Table list pages with nuqs filters (Recommended) | Reusable DataTable component used across products, categories, manufacturers, audit, submissions. CSV export via Server Action returning Blob. | ✓ |
| Audit log as a side panel on each entity edit page | Doesn't satisfy global audit log read pattern. | |
| No UI — query DB directly | Rejected — ADMIN-11/12 require viewable + searchable. | |

**User's choice:** Reusable DataTable for every list page
**Notes:** Captured as D-17.

---

## Claude's Discretion

Areas not asked, deferred to Claude's judgment in the planner phase:
- shadcn/ui component init + theme choice (default Slate or Zinc)
- React Hook Form + Zod + drizzle-zod wiring patterns
- Cloudinary upload widget specifics (CldUploadWidget config, dnd-kit for reorder)
- Slug auto-generation interaction (auto on blur + manual override)
- MT-flag schema choice (sibling translation_field_flags table vs boolean columns per translation table)
- Audit log retention strategy (deferred to Phase 5)
- Admin route layout details (sidebar sections, top bar)
- Login UX polish (useActionState client component, check-your-email state, error banner)
- Test posture (Vitest unit + integration + Playwright e2e)

## Deferred Ideas

Tracked for future phases:
- Phase 3: public detail page rendering of spec_field_group; product_search tsvector population on Phase-2 mutation transactions; cross-locale fallback banner component; admin product list "missing translation" filter
- Phase 4: Tiptap editor for recipe/industry; product ↔ recipe/industry M:N admin UI; "Used in" reverse lookup
- Phase 5: audit log retention/archival; CSV export hardening; admin shell mobile-responsive polish; BOOTSTRAP_ADMIN_EMAIL retirement; Sentry release tagging
- v2: editor/admin RBAC; TMS integration; bulk CSV import/export; manufacturer self-service portal; per-locale publish flags; three-state status; narrow type-conversion path; field-level diff log
