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

## Phase 5: Contact and Launch Polish — closed 2026-05-05

**Status:** Locally complete (D-15 two-state model)
- State 1 — locally complete: PR merged with all 4 CTA-* requirements GREEN, sitemap + Lighthouse + load-test ready, e2e specs locked.
- State 2 — v1 launched: AWAITING all 5 DEF-5-06-* entries to clear (Google Search Console + Yandex Webmaster registration, content-team dogfood, 3-phone real-device QA, manual Cloudinary upload smoke).

**Plans landed:** 6 plans across 4 waves (05-01..05-06)
- Wave 0 (BLOCKING): 05-01 — schema migration + AUDIT_ACTIONS extension + 12 RED stubs + 4 env vars + messages skeleton
- Wave 1: 05-02 (server stack) + 05-03 (UI components) + 05-04 (canonical page + sitemap)
- Wave 2: 05-05 (Lighthouse warn→error + load-test workflow_dispatch + 3 e2e flips)
- Wave 3: 05-06 (closure)

**Requirements satisfied:** CTA-01..04 (4 fully verified) + SEO-06 + OPS-02 (2 closed-with-deferred-validation) + 5 DEF-5-06-* gates carried forward.

**Marquee deliverables:** site-wide visitor contact form with honeypot + Cloudflare Turnstile + per-IP HMAC-hashed 2-bucket rate limit, atomic dbTx insert + audit row, fire-and-forget Resend admin notification + locale-parameterized visitor auto-reply, canonical /[locale]/contact RSC page sharing the SSOT ContactForm with the SiteHeader modal, sitemap /contact extension, BLOCKING Lighthouse CI gate on Slow-4G across 5 URLs, workflow_dispatch ab-based load-test, 7 Playwright e2e specs flipped GREEN, Phase-4 carry-over (DEF-4-12-01..04) absorbed.

### What worked

- **Wave 0 RED-stubs convention paid off again** — 12 stub files (49 cases total) shipped at 05-01 (BLOCKING), and downstream Wave 1+ plans only flipped them to GREEN (29 server-side specs at 05-02; 12 jsdom + 3 sitemap specs across 05-03/05-04; 7 Playwright specs at 05-05). Net implementation context budget was a fraction of what authoring tests inline at each plan would have consumed. Same pattern as Phase 4 plan 04-04; locked across 2 phases now.
- **withPublicAction sibling to withAdminAction** — anonymous Server Action wrapper composing honeypot/Turnstile/rate-limit triple-gate inside the wrapper (not in the handler) lands in the same file as withAdminAction (`src/lib/server-action.ts`). Existing withAdminAction body untouched. Discriminated `{ ok, error }` return with 5 error variants (validation/turnstile_failed/rate_limited/spam_detected/unknown). Pattern transfers to any v2 anonymous endpoint at zero refactor cost.
- **2-bucket Postgres rate limit (no Redis) over enriched (ip_hash, window_kind, window_start) PK** — RESEARCH §A2 caught the PK shape gap from CONTEXT D-05 BEFORE planning; planner adopted the enrichment explicitly. Atomic UPSERT in `dbTx.transaction` with opportunistic cleanup keeps the table bounded. Pattern transfers to any low-traffic anonymous endpoint at this site's scale.
- **Locale-parameterized React Email template via COPY map** — extends Phase-1 magic-link / Phase-2 admin-invite to Phase-5 visitor auto-reply. Conditional productLine fragment when productContext set; SUBJECTS map export for Resend. Resend SDK accepts `react: <Component .../>` directly (no manual render() needed — verified against node_modules/resend/dist/index.cjs).
- **Closed-with-deferred-validation closure posture used for the 3rd phase running** (after 02 + 04). The DEF-N-XX-* ID format is now load-bearing across phases; cross-references (04-VERIFICATION → 05-VERIFICATION absorption pointers; REQUIREMENTS.md Complete-with-deferred-validation annotation) resolve cleanly.
- **Phase-3/4 patterns carried forward verbatim** — buildAlternates({pathPrefix}) for /[locale]/contact canonical + hreflang fan-out (Phase-3 plan 03-03 helper unchanged); single staticPath array fan-out via ALL_LOCALES substitution loop (Phase-3 plan 03-08); base-ui DialogTrigger render-prop idiom (Phase-2 admins-table.tsx); Vitest jsdom mocks for next-intl (Phase-3 catalog tests); local-fallback skip on preview-gated e2e specs (Phase-2 02-17). None required design rework.

### What was inefficient

- **Resumed mid-plan after prior agent's usage limit** — 05-02 was started by a prior agent at task 2.1 + 2.2 + 2.3 and resumed by this agent at task 2.4; no work lost (per-task atomic commits) but cross-agent context-reload overhead was non-trivial. Lesson: per-task atomic commits are the safety mechanism that makes this resumable; per-plan commits would have been catastrophic.
- **Email template module name divergence between plan-01 RED-stub specifiers and plan-02 frontmatter files_modified** — RED stubs imported `@/emails/contact-submission-{admin,auto-reply}`; plan-02 frontmatter listed `src/emails/contact-{admin,auto-reply}.tsx`. Caught at task 2.5 GREEN flip (Rule-1 deviation); plan-02 paths chosen as the binding contract. Lesson: when authoring RED stubs at Wave 0, use the same canonical paths the downstream plan's frontmatter will use — or document the divergence as a planned RED→GREEN flip step.
- **Phase-5 env vars absent from local `.env.local`** — surfaced at 05-04 task 4.1 verification (`pnpm next build`); inline-passed Cloudflare always-pass test keys to confirm /contact route compiles. Out-of-scope per CLAUDE.md scope-boundary; logged for plan 06 launch checklist. Lesson: env-validation gates added by Wave 1 plans need a corresponding update to `.env.example` AND a check in subsequent plans' Wave 0 pre-conditions to confirm developers populated `.env.local`.

### Patterns established

1. **withPublicAction sibling to withAdminAction** — anonymous Server Action wrapper with discriminated `{ ok, error }` return + 5 error variants (`validation` / `turnstile_failed` / `rate_limited` / `spam_detected` / `unknown`). v2-FEAT anonymous endpoints reuse this verbatim.
2. **2-bucket Postgres rate limit (no Redis)** — cheap atomic UPSERT in `dbTx.transaction`; opportunistic cleanup keeps the table bounded. PK is `(ip_hash, window_kind, window_start)` so two sibling rows share the same `ip_hash + window_start` during the same hour without conflict.
3. **HMAC-with-server-salt for any visitor identifier** (IP, fingerprint, etc.) is now the project default. v1.1 anonymous endpoints will reuse `hashIp` as a starting template.
4. **Locale-parameterized React Email with COPY map + conditional fragments** — locale-parameterized auto-reply with optional product-context line when `sourcePage` matches `/products/<slug>`. Pattern E in PATTERNS.md extended Phase-1 magic-link / Phase-2 admin-invite to Phase-5.
5. **Closed-with-deferred-validation closure posture** — third phase using it (02 + 04 + 05). The DEF-N-XX-* ID format is now load-bearing across phases.
6. **Wave 0 RED-stubs-then-flip pattern** (project convention since Phase 4 04-04) — every Wave 1+ plan only flips it.skip → it, never authors a new test contract. Locked across 2 phases now.
7. **Inline-style off-screen honeypot** (T-05-03-01) — Tailwind v4 purge cannot strip inline `React.CSSProperties`. Pattern transfers to any future anti-bot UI affordance.
8. **Turnstile widget reset on rejected submit + disabled-until-token submit button** — Cloudflare siteverify rejects reused tokens (Pitfall 2); the imperative `turnstileRef.current?.reset()` on the rejected-submit branch makes the next attempt mint a fresh token automatically.
9. **DEF absorption pointer pattern** — when a phase's deferred-validation gate is folded into a later phase's plan, write `absorbed_by:` into the original DEF entry's frontmatter + add an absorption-note section to the original VERIFICATION.md. Audit trail preserved without retroactive re-classification.
10. **Two-state phase closure (D-15)** — "phase locally complete" is a separate gate from "v1 launched." Phase 5 closure RETROSPECTIVE.md entry documents both states explicitly. Pattern locks for any future phase whose final gate is environmental rather than code-shippable.

### Key lessons

- **The `(ip_hash, window_kind, window_start)` PK enrichment over CONTEXT D-05's `(ip_hash, window_start)` was caught BEFORE planning** — RESEARCH §A2 surfaced this; planner adopted explicitly. Lesson: 2-bucket models always need the bucket-kind in the PK; document the enrichment in SUMMARY at Wave 0 close.
- **Lighthouse `warn` → `error` lift was infrastructure-already-existing** — Slow-4G profile shipped at Phase-3 03-09 was already in place; lifting severity was a single-config-file edit. Lesson: phase scopes can shrink mid-research when the planner discovers infrastructure already exists.
- **Cross-origin iframe (Cloudinary widget) e2e is structurally manual** — smoke-only (DOM-mount + sign endpoint 200) is the right v1 posture. Pattern: smoke at e2e level + real-device manual gate = acceptable closure for cross-origin iframe surfaces. v1.1 alternative: spike Cloudinary widget mock for richer e2e.
- **Auto-mode auto-approving deferred-validation checkpoints is the correct closure posture** — third confirmation across 02/04/05. The plan's design IS for the executor to log DEF entries and continue, NOT to pause for user input. Pausing blocks the rest of the plan unnecessarily; the user's post-merge action against Vercel preview is the trigger for transition.
- **D-15 two-state distinction matters for project communication** — "Phase 5 locally complete" is a clean PR-merge signal. "v1 launched" is a separate event downstream. Conflating the two would produce a confusing PR description and an unclear stakeholder readiness signal. Pattern: every closure plan's RETROSPECTIVE entry should make the two states explicit when environmental gates remain.

### Open carry-forward (post-Phase-5)

- **DEF-5-06-SEO06-GSC** + **DEF-5-06-SEO06-YANDEX** — Google Search Console + Yandex Webmaster registration + sitemap submission + International Targeting / Rich Results validation. Closure trigger: user post-merge action against deployed manometr.uz.
- **DEF-5-06-OPS02** — content-team dogfood (10 trilingual products, ≤10 min each, signed-off via 05-DOGFOOD-PROTOCOL.md).
- **DEF-5-06-DEVICEQA** — 3-phone × 3-locale × Slow-4G QA (27 visual checks total).
- **DEF-5-06-CLOUDINARY-MANUAL** — manual Cloudinary widget upload smoke against Vercel preview.
- **DEF-2-17-01** (carry-forward from Phase 2) — OPS-01 deployment-side validation (workflow green on real PR + RED on regression PR + branch-protection rule).
- **v1.1 backlog** (11 items in 05-VERIFICATION.md): file attachments, multi-step form, callback toggle, comparison CTA, observability dashboard, A/B test, GDPR retention policy, Yandex TechArticle → Article downgrade if flagged, CSV export streaming, Lighthouse 2500 ms restoration, Cloudinary widget mock spike, StickyCtaRail.requestPrice prop cleanup.

---

## Cross-Milestone Trends (after Phase 5)

- **5 of 5 phases shipped** using the closed-with-deferred-validation closure posture for at least one environmental gate (Phase 2 OPS-01 / Phase 3 SEO Rich Results / Phase 4 DEF-4-12-01..04 / Phase 5 DEF-5-06-01..05). The DEF-N-XX-* tracking IS the audit trail; cross-phase DEF absorption pointers (Phase-4 → Phase-5 via `absorbed_by:`) work cleanly.
- **Wave 0 RED-stubs convention pays off across phases** — Phase 4 had 11 stubs across 5 e2e + 6 vitest files; Phase 5 had 12 stubs across 12 files. Downstream Wave 1+ plans only flip; never author new test contracts. Net implementation context budget consumed: a small fraction of what authoring tests inline would have taken.
- **HMAC-with-server-salt for any visitor identifier** (IP, fingerprint, etc.) is now the project default. v1.1 anonymous endpoints will reuse `hashIp` as a starting template.
- **Plan-checker pre-execution gate** (introduced Phase 4) caught issues across Phase 4 + Phase 5 plans. Phase 5 plan-checker iteration 1 (commit `d1b8751`) flagged BLOCKERs that were fixed before execution. Maintain plan-checker as a pre-execution gate going forward.
- **Per-task atomic commits are the safety mechanism** that makes mid-plan resumption (Phase 5 plan 05-02) recoverable across agent usage limits. Per-plan commits would have been catastrophic.

---

*Last appended: Phase 5 — 2026-05-05.*
