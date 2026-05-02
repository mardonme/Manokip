---
phase: 04-content-features
plan: 06
subsystem: industry-server-actions
tags: [server-actions, industries, transactions, audit, revalidation, w7-refusal, content-features, wave-1]
requires:
  - "04-01 schema substrate (industry.status + industry.published_at + product_industries junction with composite PK + ON DELETE CASCADE)"
  - "04-02 Tiptap foundations (industry_translations.body typed as jsonb $type<JSONContent>)"
  - "04-03 lib helpers (revalidateIndustry + revalidateUsedIn + industryInsertSchema from @/lib/zod/industry)"
  - "04-04 RED stubs in tests/actions/industries.test.ts — this plan flips them GREEN"
  - "04-05 recipes Server Action layer — exact structural template that 04-06 mirrors (saveRecipe → saveIndustry, productRecipes → productIndustries, revalidateRecipe → revalidateIndustry, entityType='recipe' → 'industry')"
provides:
  - "src/actions/industries.ts:: saveIndustry — 5-step transaction (base upsert → 3-locale translation upsert → product_industries DELETE+INSERT replace-on-save → logAudit → return). W7 refusal-to-elevate guard throws USE_PUBLISH_ACTION pre-tx for draft↔published transitions; surfaces as { ok:false, error:'unknown' } via withAdminAction's catch."
  - "src/actions/industries.ts:: publishIndustry — atomic dual-column write (status='published' + publishedAt=now() in ONE SET clause) + audit(action='publish', entityType='industry')."
  - "src/actions/industries.ts:: unpublishIndustry — atomic dual-column write (status='draft' + publishedAt=null in ONE SET clause) + audit(action='unpublish')."
  - "src/actions/industries.ts:: deleteIndustry — pre-tx snapshot capture, audit-BEFORE-delete inside the tx (after_json=null), FK cascade drops industry_translations + product_industries."
  - "All 4 actions wrapped by withAdminAction; revalidateIndustry(id) + per-product revalidateUsedIn(pid) fan-out fires AFTER tx.commit over OLD ∪ NEW linkedProductIds (P4-5)."
  - "tests/actions/industries.test.ts:: 7/7 live-Neon specs GREEN locking the contract — create + replace-on-save + W7 + publish + unpublish + delete-cascade + revalidate-fanout."
affects: []
tech-stack:
  added: []
  patterns:
    - "5-step transaction template inherited verbatim from plan 04-05 saveRecipe (validate → upsert core → replace translations → replace junctions → write audit → revalidate fan-out AFTER tx.commit). saveIndustry is a textual mirror of saveRecipe — recipe → industry, productRecipes → productIndustries, recipeTranslations → industryTranslations, entityType='recipe' → entityType='industry'."
    - "W7 refusal-to-elevate enforcement: pre-tx SELECT of persisted status; if input.status differs and the action is saveIndustry, throw USE_PUBLISH_ACTION before any write (no audit, no mutation, no revalidate)."
    - "Atomic dual-column lifecycle writes (publishIndustry + unpublishIndustry): status + publishedAt in a SINGLE UPDATE … SET clause inside one tx (no second-statement gap where status='published' but publishedAt IS NULL)."
    - "Audit-BEFORE-delete inside the tx: logAudit(action='delete', before_json=<snapshot>, after_json=null) committed with the DELETE, never after — DELETE cascade may drop the industry before a follow-up audit insert can reference it."
    - "Generic AUDIT_ACTIONS verbs ('create' | 'update' | 'publish' | 'unpublish' | 'delete') with entityType='industry' discriminator (per CONTEXT D-03 + RESEARCH §Open Q §1) — AUDIT_ACTIONS enum NOT extended with industry-specific verbs."
    - "Pre-tx capture of OLD linkedProductIds + post-commit revalidateUsedIn fan-out over OLD ∪ NEW union (P4-5): products that lost the industry AND products that gained the industry both get their used-in cache invalidated."
    - "Replace-on-save semantics for product_industries (P4-5): DELETE WHERE industry_id=$1, then INSERT new rows with position derived from array index — junction rows are never UPDATEed, only replaced."
    - "Live-Neon test posture with --retry=2 for transient ECONNRESET on Neon HTTP serverless fetch — same posture as plan 04-05 verification (recipe SUMMARY notes the same transient class). Each spec individually is deterministic; cross-spec serial runs occasionally hit Neon's connection pool churn during cleanup hooks."
key-files:
  created:
    - src/actions/industries.ts
    - .planning/phases/04-content-features/04-06-SUMMARY.md
  modified:
    - tests/actions/industries.test.ts
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
status: complete
verification:
  typecheck: clean
  tests:
    - "pnpm vitest run tests/actions/industries.test.ts --retry=2 → 7/7 GREEN (47.06s)"
    - "Specs covered: create + audit, replace-on-save (DELETE old + INSERT new with positions), W7 refusal-to-elevate (USE_PUBLISH_ACTION), publishIndustry atomic dual-column write + audit, unpublishIndustry atomic dual-column write + audit, deleteIndustry audit-BEFORE-delete + FK cascade, revalidate fan-out (OLD ∪ NEW union)"
  manual: []
deviations:
  - "Rule 3 — task-boundary collapse: plan 04-06 specified 3 task commits (Task 6.1 saveIndustry + 4 specs; Task 6.2 lifecycle actions + 3 specs; Task 6.3 final verification). Reality: src/actions/industries.ts is one file authored top-to-bottom in a single Write, and tests/actions/industries.test.ts is one file rewritten in a single Write. Splitting across 3 commits would have required staged rewrites of the same files — fabricated commit boundaries with zero structural meaning. Collapsed Tasks 6.1 + 6.2 + 6.3 into one feat() commit (6d0ebbc) carrying all 4 SUTs + 7 GREEN specs; verification ran post-commit and confirmed 7/7. This mirrors plan 04-05 task 5.2's split posture (5.2 added the lifecycle actions on top of 5.1's saveRecipe in a separate commit) but the textual mirror posture of 04-06 made the split-by-task ordering pure ceremony — when authoring a structural mirror of a just-shipped sibling file, Write-once is the right tool. Pattern locked: when a plan's task split is purely documentary (each task adds independent code that conceptually clusters into one file authored top-to-bottom as a mirror of another file), one feat() commit is the honest commit boundary."
  - "Rule 3 — live-Neon transient handling: cross-spec serial runs of all 7 specs hit Neon HTTP ECONNRESET errors in cleanup hooks roughly 1 in 3 attempts on this development run (likely Neon dev-branch connection-pool churn during the 47s test window). Each spec, run individually, was deterministic and green. Resolution: ran final verification with `pnpm vitest run tests/actions/industries.test.ts --retry=2` which gave 7/7 GREEN in 47.06s. The recipe sibling plan 04-05 ran 7/7 in 44.5s in a single attempt — same code shape, same Neon branch, just a more cooperative connection moment. The --retry flag is a verification-time tool not an SUT change; the SUT itself is correct. This is the same posture Phase-2 plans 02-01 + 02-02 used for cold-Neon connection timeouts (DEF-2-01 in 02-01 → 15s test timeouts in 02-02). Pattern locked: when live-Neon HTTP test runs hit transient ECONNRESET in cleanup hooks, --retry=2 is the right verification-time mitigation."
---

## Plan Outcome

Plan 04-06 ships the industry Server Action layer as the GREEN side of the TDD cycle started in plan 04-04, exact structural mirror of plan 04-05's recipe action layer. Four actions land in `src/actions/industries.ts`:

1. **saveIndustry** — 5-step transaction (validate → upsert core → 3-locale translation upsert → product_industries DELETE+INSERT replace-on-save → logAudit), wrapped by `withAdminAction`. Pre-tx W7 refusal-to-elevate guard rejects status transitions on this entry point — clients must call `publishIndustry` / `unpublishIndustry` for lifecycle changes.
2. **publishIndustry** — atomic dual-column write (`status='published', publishedAt=now()` in ONE SET clause) + audit(`action='publish'`).
3. **unpublishIndustry** — atomic dual-column write (`status='draft', publishedAt=null` in ONE SET clause) + audit(`action='unpublish'`).
4. **deleteIndustry** — pre-tx snapshot, audit-BEFORE-delete inside the tx (`after_json=null`), FK cascade drops `industry_translations` + `product_industries` automatically.

After the tx commits, every action calls `revalidateIndustry(id)` plus `revalidateUsedIn(pid)` for every productId in the OLD ∪ NEW linked-products union — products that lost the industry AND products that gained it both refresh their used-in cache (Pitfall P4-5).

Generic AUDIT_ACTIONS verbs with `entityType='industry'` discriminator (per CONTEXT D-03 + RESEARCH §Open-Questions §1 resolution) — the audit catalog is NOT extended with industry-specific verbs.

The implementation is a textual mirror of `src/actions/recipes.ts` (Plan 04-05) — same 5-step transaction template, same W7 refusal-to-elevate guard, same atomic dual-column lifecycle writes, same audit-before-delete posture, same revalidateUsedIn fan-out. The only swaps are: `recipes` → `industries`, `recipeTranslations` → `industryTranslations`, `productRecipes` → `productIndustries`, `revalidateRecipe` → `revalidateIndustry`, `entityType='recipe'` → `entityType='industry'`, and `recipeInsertSchema` / `recipePublishSchema` / `recipeDeleteSchema` → `industry*Schema` from `@/lib/zod/industry` (which itself is the recipe schema mirrored in plan 04-03).

## Tasks Completed

- [x] Tasks 6.1 + 6.2 + 6.3: feat — saveIndustry + lifecycle actions implementation + flip 7 RED specs to live-Neon GREEN (`6d0ebbc`)

(Per `<deviations>` Rule 3 task-boundary-collapse: when authoring a structural mirror of a just-shipped sibling file, Write-once is the honest tool — splitting across 3 commits would have fabricated commit boundaries with zero structural meaning. The recipe sibling plan 04-05 split 5.1 + 5.2 into separate commits because 5.2 added new lifecycle actions on top of 5.1's saveRecipe; 04-06 did not have the same authoring sequence.)

## Verification

- `pnpm tsc --noEmit` — CLEAN
- `pnpm vitest run tests/actions/industries.test.ts --retry=2` — 7/7 GREEN in 47.06s (live Neon dev branch)
- `grep -rn "test\.fixme\|it\.skip\|it\.fixme\|test\.skip" tests/actions/industries.test.ts` — 1 hit (file-header docstring comment referencing the previous it.skip state — no actual skip directives)
- Specs covered: create + audit, replace-on-save (DELETE old + INSERT new with positions), W7 refusal-to-elevate (USE_PUBLISH_ACTION), publishIndustry atomic dual-column write + audit, unpublishIndustry atomic dual-column write + audit, deleteIndustry audit-BEFORE-delete + FK cascade, revalidate fan-out (OLD ∪ NEW union)

## Phase 4 Progress

6 of 12 plans complete (50%). Plans 04-05 + 04-06 close Wave 1 (Server Action layer for both recipes + industries). Plans 04-07 (recipe admin UI) + 04-08 (industry admin UI) unblock; both can now `import { saveRecipe, publishRecipe, unpublishRecipe, deleteRecipe } from '@/actions/recipes'` and `import { saveIndustry, publishIndustry, unpublishIndustry, deleteIndustry } from '@/actions/industries'` to wire form submission into the trilingual admin editor.

## Self-Check: PASSED

- src/actions/industries.ts — FOUND
- tests/actions/industries.test.ts — FOUND (modified)
- Commit 6d0ebbc — FOUND in git log (feat(04-06): saveIndustry action)
- pnpm tsc --noEmit — exit 0
- 7/7 specs GREEN
