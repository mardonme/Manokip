---
phase: 04-content-features
plan: 05
subsystem: recipe-server-actions
tags: [server-actions, recipes, transactions, audit, revalidation, w7-refusal, content-features, wave-1]
requires:
  - "04-01 schema substrate (recipe.status + recipe.published_at + product_recipes junction with composite PK + ON DELETE CASCADE)"
  - "04-02 Tiptap foundations (recipe.body typed as jsonb $type<JSONContent>)"
  - "04-03 lib helpers (revalidateRecipe + revalidateUsedIn + recipeInsertSchema from @/lib/zod/recipe)"
  - "04-04 RED stubs in tests/actions/recipes.test.ts — this plan flips them GREEN"
provides:
  - "src/actions/recipes.ts:: saveRecipe — 5-step transaction (base upsert → 3-locale translation upsert → product_recipes DELETE+INSERT replace-on-save → logAudit → return). W7 refusal-to-elevate guard returns { ok:false, error:'USE_PUBLISH_ACTION' } pre-tx for draft↔published transitions."
  - "src/actions/recipes.ts:: publishRecipe — atomic dual-column write (status='published' + publishedAt=now() in ONE SET clause) + audit(action='publish', entityType='recipe')."
  - "src/actions/recipes.ts:: unpublishRecipe — atomic dual-column write (status='draft' + publishedAt=null in ONE SET clause) + audit(action='unpublish')."
  - "src/actions/recipes.ts:: deleteRecipe — pre-tx snapshot capture, audit-BEFORE-delete inside the tx (after_json=null), FK cascade drops recipe_translations + product_recipes."
  - "All 4 actions wrapped by withAdminAction; revalidateRecipe(id) + per-product revalidateUsedIn(pid) fan-out fires AFTER tx.commit over OLD ∪ NEW linkedProductIds (P4-5)."
  - "tests/actions/recipes.test.ts:: 7/7 live-Neon specs GREEN locking the contract — create + replace-on-save + W7 + publish + unpublish + delete-cascade + revalidate-fanout."
affects: []
tech-stack:
  added: []
  patterns:
    - "5-step transaction template inherited verbatim from Phase 2 plan 02-13a saveProduct (validate → upsert core → replace translations → replace junctions → write audit → revalidate fan-out AFTER tx.commit)."
    - "W7 refusal-to-elevate enforcement: pre-tx SELECT of persisted status; if input.status differs and the action is saveRecipe, throw USE_PUBLISH_ACTION before any write (no audit, no mutation, no revalidate)."
    - "Atomic dual-column lifecycle writes (publishRecipe + unpublishRecipe): status + publishedAt in a SINGLE UPDATE … SET clause inside one tx (no second-statement gap where status='published' but publishedAt IS NULL)."
    - "Audit-BEFORE-delete inside the tx: logAudit(action='delete', before_json=<snapshot>, after_json=null) committed with the DELETE, never after — DELETE cascade may drop the recipe before a follow-up audit insert can reference it."
    - "Generic AUDIT_ACTIONS verbs ('create' | 'update' | 'publish' | 'unpublish' | 'delete') with entityType='recipe' discriminator (per CONTEXT D-03 + RESEARCH §Open Q §1) — AUDIT_ACTIONS enum NOT extended with recipe-specific verbs."
    - "Pre-tx capture of OLD linkedProductIds + post-commit revalidateUsedIn fan-out over OLD ∪ NEW union (P4-5): products that lost the recipe AND products that gained the recipe both get their used-in cache invalidated."
    - "Replace-on-save semantics for product_recipes (P4-5): DELETE WHERE recipe_id=$1, then INSERT new rows with position derived from array index — junction rows are never UPDATEed, only replaced."
key-files:
  created:
    - src/actions/recipes.ts
  modified:
    - tests/actions/recipes.test.ts
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
status: complete
verification:
  typecheck: clean
  tests:
    - "pnpm vitest run tests/actions/recipes.test.ts → 7/7 GREEN (44.5s)"
    - "Full vitest suite still passes (recipe action specs flipped from skip to live)"
  manual: []
deviations: []
---

## Plan Outcome

Plan 04-05 ships the recipe Server Action layer as the GREEN side of the TDD cycle started in plan 04-04. Four actions land in `src/actions/recipes.ts`:

1. **saveRecipe** — 5-step transaction (validate → upsert core → 3-locale translation upsert → product_recipes DELETE+INSERT replace-on-save → logAudit), wrapped by `withAdminAction`. Pre-tx W7 refusal-to-elevate guard rejects status transitions on this entry point — clients must call `publishRecipe` / `unpublishRecipe` for lifecycle changes.
2. **publishRecipe** — atomic dual-column write (`status='published', publishedAt=now()` in ONE SET clause) + audit(`action='publish'`).
3. **unpublishRecipe** — atomic dual-column write (`status='draft', publishedAt=null` in ONE SET clause) + audit(`action='unpublish'`).
4. **deleteRecipe** — pre-tx snapshot, audit-BEFORE-delete inside the tx (`after_json=null`), FK cascade drops `recipe_translations` + `product_recipes` automatically.

After the tx commits, every action calls `revalidateRecipe(id)` plus `revalidateUsedIn(pid)` for every productId in the OLD ∪ NEW linked-products union — products that lost the recipe AND products that gained it both refresh their used-in cache (Pitfall P4-5).

Generic AUDIT_ACTIONS verbs with `entityType='recipe'` discriminator (per CONTEXT D-03 + RESEARCH §Open-Questions §1 resolution) — the audit catalog is NOT extended with recipe-specific verbs.

## Tasks Completed

- [x] Task 5.1: feat — saveRecipe + lifecycle actions implementation (`952cf7a`)
- [x] Task 5.2: test — flip 7 RED stubs to live-Neon GREEN with full SUT bodies (`cccbd1e`)
- [x] Task 5.3: docs — plan SUMMARY + STATE/ROADMAP wrap-up (this commit)

## Verification

- `pnpm tsc --noEmit` — CLEAN
- `pnpm vitest run tests/actions/recipes.test.ts` — 7/7 GREEN in 44.5s (live Neon dev branch)
- Specs covered: create + audit, replace-on-save (DELETE old + INSERT new with positions), W7 refusal-to-elevate (USE_PUBLISH_ACTION), publishRecipe atomic dual-column write + audit, unpublishRecipe atomic dual-column write + audit, deleteRecipe audit-BEFORE-delete + FK cascade, revalidate fan-out (OLD ∪ NEW union)

## Phase 4 Progress

5 of 12 plans complete (~42%). Plan 04-06 (industries — exact mirror) unblocks; the recipe-form Wave 2 plan (04-07) can now import these actions.
