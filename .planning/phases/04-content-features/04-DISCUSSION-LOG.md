# Phase 4: Content Features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 04-content-features
**Mode:** auto (chained from /gsd-next; user previously approved auto-mode flow during Phase 3 UAT/security/validation)
**Areas discussed:** Storage & schema, Lifecycle & admin actions, Tiptap editor scope, M:N junction direction, Public rendering & locale fallback, "Used in" UX on product detail, TechArticle JSON-LD

---

## Storage & schema

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `recipe` + `industry` tables (Phase-1 schema as-shipped) | Each entity has its own base + sibling translations. TechArticle differentiation (recipe = HowTo subtype, industry = Article landing) clean. | ✓ |
| Unified `article` table with `kind` enum | Single CRUD surface, fewer migrations. Forces JSON-LD branching by kind, blurs domain semantics. | |

**User's choice:** Auto-selected — Phase-1 schema already shipped as separate tables; no merge cost benefit + clear domain semantics.
**Notes:** D-01 carries forward Phase-1 lock; D-02 specifies the additive Phase-4 migration (status columns + 2 junction tables + optional pgView).

## Lifecycle & admin Server Actions

| Option | Description | Selected |
|--------|-------------|----------|
| `status` enum + `published_at` dual-column with refusal-to-elevate (Phase 2 D-11 pattern) | Atomic dual-column writes; dedicated publish/unpublish actions; audit verbs distinguished | ✓ |
| Boolean `is_published` only | Simpler schema; loses publish-time tracking + audit-action discriminator | |

**User's choice:** Auto-selected — consistent with Phase 2 D-11 / 02-13b lifecycle pattern.
**Notes:** D-03. Locks audit verbs `save_recipe`, `publish_recipe`, `unpublish_recipe`, `delete_recipe` (and industry equivalents); revalidate helpers extended.

## Tiptap editor extension scope

| Option | Description | Selected |
|--------|-------------|----------|
| StarterKit + link + image + tables (Phase 1 STACK.md floor) | Matches the locked extension list; covers all CONT-01 requirements | ✓ |
| StarterKit + link + image only (no tables) | Smaller bundle, but tables are spec'd in CONT-01 verbatim | |
| StarterKit + link + image + tables + code-block syntax highlighting | Adds prismjs / lowlight; low value for industrial pressure articles | |

**User's choice:** Auto-selected — Phase 1 STACK.md locked the floor.
**Notes:** D-05. Headings cap at H4. Code-block highlighting deferred (logged in Deferred Ideas).

## M:N junction direction & admin UX

| Option | Description | Selected |
|--------|-------------|----------|
| Author-side only — recipe/industry form picks linked products | One direction of authoring; reverse "Used in" renders read-only on product page from same junction | ✓ |
| Two-way — both forms expose the picker | Sync surface; cross-form coupling; double the test surface | |
| Reader-side only — admin sets relationships from product form | Backwards: author thinks "this article is about X, Y, Z", not "product X belongs in articles A, B, C" | |

**User's choice:** Auto-selected — author-side authoring matches natural mental model + minimizes test surface.
**Notes:** D-04. Public product detail page renders "Used in" read-only from the same junction tables.

## Public rendering & locale fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Cascade current → uz → ru → en with banner (Phase 3 D-05 pattern) | Consistent fallback semantics across search + content; uz is fallback root | ✓ |
| 404 on missing translation | Strict, but loses long-tail SEO traffic; conflicts with audience-bridging goal | |
| Always show all locales' content combined | Anti-pattern; locale routing breaks | |

**User's choice:** Auto-selected — Phase 3 D-05 cascade is project-wide convention.
**Notes:** D-07. Banner copy localized per fallback locale. Same cascade applies to industry pages.

## Tiptap rendering on public pages

| Option | Description | Selected |
|--------|-------------|----------|
| `@tiptap/static-renderer` (official, RSC-friendly, no client JS) | Server-only HTML emission; no ProseMirror bundle on public pages | ✓ |
| `prosemirror-to-html` (community) | Adds a dependency outside the Tiptap ecosystem | |
| Custom serializer | Reinventing the wheel; extension parity headache | |

**User's choice:** Auto-selected — official, RSC-aligned, zero hydration cost.
**Notes:** D-08. Public bodies render inside `prose prose-slate`. Defense-in-depth XSS hardening: only the locked extension set's marks/nodes render; unrecognised input falls back to plain text.

## "Used in" UX on product detail

| Option | Description | Selected |
|--------|-------------|----------|
| Two card grids (Recipes section + Industries section), 6 each, "see all" link if more | Type-grouped clarity; visual density matches sketch 003; "see all" route deferred | ✓ |
| Single mixed list with type badge | Flatter; harder to scan when one type dominates | |
| Compact text list (links only) | Saves space but loses featured-image trust signal | |

**User's choice:** Auto-selected — type grouping matches engineer scanning behavior.
**Notes:** D-09. Section hidden when 0 cross-links. Per-product "all examples" route deferred to v1.1 (logged in Deferred Ideas).

## TechArticle JSON-LD

| Option | Description | Selected |
|--------|-------------|----------|
| TechArticle for both recipes + industries with optional `mentions` array of linked product canonical URLs | Single helper extends Phase 3 `src/lib/jsonld.ts`; gives Google a knowledge-graph signal | ✓ |
| TechArticle for recipes; CollectionPage for industries | Forces a second helper; CollectionPage is for category listings, not vertical landing pages | |
| Article (generic) for both | Loses the technical-article semantic | |

**User's choice:** Auto-selected — TechArticle accepted by Google for both shapes; `mentions` adds knowledge-graph value at near-zero implementation cost.
**Notes:** D-10. Helper signature: `techArticleJsonLd(article, locale)`. XSS escape pattern (`\\u003c`) carries forward from Phase 3 D-09 / 03-SECURITY.md.

## Claude's Discretion

User deferred to Claude (planner/researcher) on:
- Cache + revalidation strategy details (extending Phase 2 plan 02-05 helpers)
- Slug auto-generation collision-check (matches Phase 2 categories/manufacturers/products pattern)
- Translation-completeness UI (reuse Phase 2 plan 02-12 primitives)
- Empty-locale list filter / per-row dot indicator
- Sketch / spike findings (none open for this phase)

## Deferred Ideas

- Recipe / industry content search (separate `content_search` tsvector) → v1.1
- Per-product "all examples" page (`/[locale]/products/[slug]/used-in`) → v1.1
- Code-block syntax highlighting in Tiptap → deferred
- Collaborative editing (Yjs + Hocuspocus) → out of scope for v1 (STACK.md note)
- Reverse "appears in" multi-select on product form → explicitly rejected for v1
- Rich-text validation tooling (broken-link detector, alt-image lint) → admin-side polish, defer
- Phase-3 UI-REVIEW.md FIX-1/2/3 → tracked as Phase-5 dogfood-gate prerequisites
