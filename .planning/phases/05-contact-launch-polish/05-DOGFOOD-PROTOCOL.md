# Phase 5 — OPS-02 Dogfood Protocol

**Owner:** Content team lead
**Goal:** Validate that the admin UX (built across Phases 1-4) supports entering a real trilingual product in ≤10 minutes.
**Acceptance criteria:** ≥10 real products entered, with median time ≤10 minutes and no individual entry exceeding 15 minutes.

---

## Pre-conditions

- [ ] Phase 5 deployed to production OR a stable Vercel preview URL with admin access
- [ ] Content team has admin invite + magic-link login working
- [ ] Datasheet PDFs + product photos collected for the 10 candidate products
- [ ] At least one category + manufacturer + spec-field schema exists in admin (seed run from Phase 2 or post-deploy bootstrap)
- [ ] Cloudinary signed-direct-upload widget reachable from preview/prod (confirmed by Plan 05-05 cloudinary-widget-smoke e2e)

---

## Product Entry Checklist (per product, target ≤10 min)

For each of 10 trilingual industrial pressure-measurement products:

1. [ ] Log in to /uz/admin (or /ru/admin / /en/admin)
2. [ ] Navigate to Products → New
3. [ ] Fill all three locale tabs (uz / ru / en):
   - Name
   - Slug
   - Short description
   - Long description
4. [ ] Assign category + manufacturer
5. [ ] Fill typed spec values (driven by category schema)
6. [ ] Upload product images via Cloudinary signed direct upload widget
7. [ ] Upload datasheet PDFs via Cloudinary signed direct upload widget
8. [ ] Mark machine-translated fields if applicable (D-05 amber MT badge)
9. [ ] Save → Publish
10. [ ] Verify on /uz/products/<slug> → real SSR HTML; spec table renders; gallery shows uploaded images; spec values match what was entered

---

## Timing Log (10 trilingual products)

| #  | Product | Manufacturer | Start (HH:MM) | End (HH:MM) | Minutes | Notes |
|----|---------|--------------|---------------|-------------|---------|-------|
| 1  |         |              |               |             |         |       |
| 2  |         |              |               |             |         |       |
| 3  |         |              |               |             |         |       |
| 4  |         |              |               |             |         |       |
| 5  |         |              |               |             |         |       |
| 6  |         |              |               |             |         |       |
| 7  |         |              |               |             |         |       |
| 8  |         |              |               |             |         |       |
| 9  |         |              |               |             |         |       |
| 10 |         |              |               |             |         |       |

**Median:** _____ minutes
**Max:** _____ minutes
**Pass:** ☐ Yes ☐ No (median ≤10 AND max ≤15)

---

## Friction Log (anything that took longer than expected)

Use this section to capture admin UX friction discovered during dogfood. Each entry feeds the v1.1 backlog.

- [ ] (template) `<friction observed>` — `<estimated time cost>` — `<v1.1 mitigation idea>`

Examples of friction worth logging:

- Cloudinary widget upload took N seconds longer than expected
- Spec-field type-lock blocked a needed schema change
- LinkedProductsPicker filter performance felt slow at >150 products
- Locale-tab swap lost in-progress translation text
- Slug auto-generation produced an unexpected result for transliteration

---

## Sign-off

- Content team lead: ________________________ (name)
- Date completed: ________________________
- v1 launch readiness signal (per D-15): ☐ READY ☐ NOT READY (with friction-log items blocking)

---

*Protocol shipped: 2026-05-05 (plan 05-06)*
*Owner: User (per CONTEXT D-12)*
*Closes: OPS-02 when timing log is filled in + signed off → DEF-5-06-OPS02 transitions to validated*
