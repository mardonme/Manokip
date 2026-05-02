# Manometr — Phase Retrospective

Cross-phase milestone log. Append a new section at end-of-phase with what worked, what was inefficient, patterns established, key lessons, and cost trends. Earlier phases (1-3) closed without retrospective entries; Phase 4 is the first formal retro and back-references prior decisions.

---

## Phase 4: Content Features — closed 2026-05-01

**Plans landed:** 04-01..04-12 (12 plans across 4 waves)
**Requirements satisfied:** CONT-01..06 (all 6) + 4 deferred-validation gates
**Marquee deliverables:** TechArticle JSON-LD on recipe + industry detail pages; Tiptap v3 admin authoring with Cloudinary signed-upload image flow; Used-In reverse-section on product detail; per-locale sitemap entries for content tier.

### What worked

- **Tiptap v3.22.5 lockstep install across 11 packages** — pinning the entire ecosystem (starter-kit, link, image, table family, react, static-renderer) at the same minor version surfaced no integration drift. The 04-02 single-source-of-truth `src/lib/tiptap-extensions.ts` shared between admin editor + public renderer paid off — extending the array in one place picked up automatically on both sides. No "extension list out-of-sync" bugs across the phase.
- **`@tiptap/static-renderer` dep-free server-side path** — researcher-verified zero React imports + sync `renderToHTMLString` API delivered exactly what the architecture required. Public RSC body rendering is zero-client-JS; the Slow-4G LCP budget inherited from Phase 3 SEO-05 was preserved for content pages without compromise. Built-in `escapeHTML` + `escapeHTMLAttribute` removed the need for DOMPurify entirely — the locked extension array IS the XSS allowlist.
- **LinkedProductsPicker reuse pattern** — same component drove recipe form + industry form with no per-entity fork. TanStack DataTable async-search in a Popover scaled to the 6-product seed catalog cleanly; M:N junction direction is author-side-only (D-04) so there's no reverse-form coupling to maintain.
- **Schema migration backfill landed cleanly on greenfield-empty tables** — the 04-01 status column additions + junction tables + product_used_in_v pgView all rolled forward without operator intervention. Greenfield posture (recipes + industries had no production rows yet) made this risk-free; recording the migration shape now means the next phase / future migrations have a template.
- **Phase-3 closure patterns carried forward verbatim** — locale-fallback cascade (D-07 mirrors Phase-3 D-05), JSON-LD `<` escape (T-04-XSS-02 mirrors T-03-09 carry-forward), per-locale sitemap entries with hreflang alternates (sitemap.ts extension mirrors Phase-3 product+category+manufacturer blocks), buildAlternates helper for canonical+hreflang, `'use cache' + cacheTag` per-id pattern for content tier — none required design re-work.

### What was inefficient

- **04-07 admin UI bundle is the long-pole** — RecipeBodyEditor (Tiptap mount + toolbar + Cloudinary widget integration) + RecipeForm (3-locale tabs + LinkedProductsPicker + lifecycle row + featured-image MediaUploader) + the `/admin/recipes/{page,new,[id]/edit}` triplet was the largest single plan in Phase 4. P4-1 hydration-mismatch debugging (`immediatelyRender: false`) surfaced exactly as the researcher predicted; the test that asserts the option is set is the structural mitigation. Track for Phase 5 dogfood: this is where OPS-02 wall-clock timing (10-minute trilingual recipe author flow) will surface real friction.
- **Tiptap version mismatch in STACK.md** — STACK.md noted "v2"; researcher verified the npm registry was at v3.22.5. Caught at 04-02 plan-checker; stale documentation cost ~20 minutes of cross-checking. Lesson: STACK.md must record the version as researcher-verified at execution time, not at initial-stack-decision time.
- **Cloudinary widget cross-origin iframe is e2e-unfriendly** — DEF-4-12-04 logs this. Headless Chromium can drive the toolbar button but not the Cloudinary-hosted iframe's file picker. The basic Tiptap text-edit + save + publish path is the GREEN gate for CONT-01; widget smoke is manual. Acceptable trade-off for v1; v1.1 could mock the widget for a richer e2e.

### Patterns established

1. **closed-with-deferred-validation for external-service parser gates** — continuation of Phase-3 plan 03-09 pattern. Local tests assert SHAPE; validation against external parsers (Google Rich Results, Yandex Webmaster) is logged as DEF entry and transitions to fully-validated when the user replies post-merge with screenshots. The DEF entries are the audit trail. Used 4× in Phase 4.
2. **Content-tier action shape mirrors product-tier 5-step tx** — saveRecipe + saveIndustry follow Phase-2 plan 02-13a verbatim: pre-tx snapshot read → atomic tx (base row upsert → translations replace-on-save → junction rows replace-on-save → audit_log → end) → AFTER tx.commit fan-out (revalidateRecipe + revalidateUsedIn for OLD ∪ NEW productIds). Refusal-to-elevate via dedicated publish*/unpublish* actions, status verbatim writes (W7).
3. **Cap-at-6 v1 trade-off + deferred "all examples" link as v1.1 backlog** — D-09 caps the Used-In section at 6 recipes + 6 industries per product. When more exist, v1.1 will ship a dedicated `/[locale]/products/[slug]/used-in` route. v1 omits the link entirely; users see "Used in" with up to 6+6 = 12 cards. Acceptable for v1 catalog scale.
4. **Admin magic-link DRY helper** — `tests/fixtures/admin-magic-link.ts:loginAsAdminViaDirectToken` extracted from inline Phase-2 02-17 pattern; reusable by all admin-flow e2e specs. Phase 5 contact-form admin flow + future admin specs reuse the helper.
5. **Hidden-when-empty RSC posture** — `if (recipes.length === 0 && industries.length === 0) return null;` in UsedInSection. No empty-state stub, no header-without-content. Phase 5 contact-form and recipe/industry index pages adopt the same posture for empty cases.

### Key lessons

- **Tiptap v3 `immediatelyRender: false` IS the difference between working and broken on Next 16** — surfaced at P4-1 (RESEARCH §Tiptap integration patterns), mitigated structurally at every editor mount, asserted in component tests. Without it, every SSR pass produces HTML that doesn't match the client's first render → React reports "Hydration failed". This single option is the most load-bearing config flag in the phase; document it loudly in any future Tiptap upgrade plan.
- **product_used_in_v pgView UNION ALL is the single-tag single-read pattern that keeps cache invalidation tractable** — junction-row mutations on either side fan out to one `revalidateUsedIn(productId)` per affected product. Without the view, the read would be 2 queries (recipes + industries); with the view, it's 1 query + 1 cache-tag. P4-5 fan-out covers BOTH sides of every replace (OLD ∪ NEW productIds) — a Rule-2 add at 04-03 plan time.
- **Content fixtures must NOT insert new products** — T-04-04-01 mitigation. seedPhase4Content takes caller-provided productIds + cross-links to them; never inserts new product rows. Without this guard, downstream public-RSC tests would hit FK constraint failures or see unexpected products in product-list specs.
- **Auto-approving deferred-validation checkpoints in auto-mode is the correct closure posture** — the plan's design IS for the executor to log DEF entries and continue, NOT to pause for user input. The user's post-merge action against Vercel preview is the trigger for transition; pausing the executor blocks the rest of the plan unnecessarily.

### Cost patterns

- **~12 plans across 4 waves** — Wave 1 (schema + tiptap + lib helpers + Server Actions) and Wave 2 (admin UI) dominate by file-count. Wave 3 (public pages + Used-In) and Wave 4 (closure) are bookkeeping + e2e flip-to-GREEN.
- **TDD RED → GREEN cycle held across all 12 plans** — 04-04 shipped the RED stubs; 04-05..04-11 flipped them as features landed; 04-12 closed the remaining e2e stubs. Zero test-fixme leaks at end-of-phase.
- **Plan-checker caught issues before execution** — the 04-content-features plan-checker run flagged 1 BLOCKER + 3 MINOR issues (commit `4ca778d`). Fix-then-execute saved an estimated 1-2 plan executions of rework. Maintain plan-checker as a pre-execution gate for future phases.

### Open carry-forward to Phase 5

- **DEF-4-12-01..04** — manual gates for Google Rich Results, Yandex Webmaster, Cyrillic glyph review, Cloudinary widget smoke. Closure trigger: user post-merge action against Vercel preview.
- **OPS-02 dogfood** — content team enters 10 real trilingual recipes + industries end-to-end; wall-clock timing per entity. This is where 04-07 admin UI bundle gets its real-world feedback.
- **Phase-3 UI-REVIEW FIX-1/FIX-2/FIX-3** — stub homepage, mount CategoryTreeServer, visible Breadcrumbs. Tracked as Phase-5 dogfood-gate prerequisites.
- **v1.1 backlog** — content_search per-locale tsvector for recipes + industries; per-product "all examples" page; reverse "appears in" multi-select on product form (rejected for v1, may revisit); Cloudinary widget Playwright mock; industry TechArticle → Article downgrade if Yandex flags type-mismatch.

---

*Last appended: Phase 4 — 2026-05-01.*
