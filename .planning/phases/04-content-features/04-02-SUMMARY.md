---
phase: 04-content-features
plan: 02
subsystem: tiptap-foundations
tags: [tiptap, v3, static-renderer, xss-mitigation, single-source-of-truth, cloudinary, schema-narrowing]
requires:
  - "04-01 schema substrate (recipe.status + industry.status + junctions + product_used_in_v) — must exist before any content lifecycle ships"
provides:
  - "@tiptap/{core,pm,react,starter-kit,extension-link,extension-image,extension-table,extension-table-row,extension-table-cell,extension-table-header,static-renderer} all pinned at exact 3.22.5 (no caret)"
  - "src/lib/tiptap-extensions.ts: TIPTAP_EXTENSIONS array (length 7) + CloudinaryImage extension — single source of truth for both admin client + public RSC (P4-3 mitigation)"
  - "src/lib/tiptap-render.ts: renderTiptapToHtml(doc) wrapping @tiptap/static-renderer/pm/html-string with image nodeMapping override that emits Cloudinary URL via getCldImageUrl (T-04-XSS-04 + P4-2 mitigation)"
  - "tests/lib/tiptap-render.test.ts: 1 spec asserting T-04-XSS-01 escape contract (raw <script> absent, &lt;script&gt; present, normal text intact)"
  - "tests/fixtures/tiptap-malicious.ts: MALICIOUS_TIPTAP_DOC reusable fixture for any future XSS regression spec on the rendered body"
  - "JSONContent narrowing applied to recipe_translations.body + industry_translations.body (deferred from plan 04-01)"
affects:
  - "src/db/schema/recipes.ts (body narrowed jsonb -> jsonb().$type<JSONContent>())"
  - "src/db/schema/industries.ts (body narrowed jsonb -> jsonb().$type<JSONContent>())"
  - "CLAUDE.md (Tiptap v2 -> v3 docs correction)"
tech-stack:
  added:
    - "@tiptap/core 3.22.5"
    - "@tiptap/pm 3.22.5"
    - "@tiptap/react 3.22.5"
    - "@tiptap/starter-kit 3.22.5"
    - "@tiptap/extension-link 3.22.5"
    - "@tiptap/extension-image 3.22.5"
    - "@tiptap/extension-table 3.22.5"
    - "@tiptap/extension-table-row 3.22.5"
    - "@tiptap/extension-table-cell 3.22.5"
    - "@tiptap/extension-table-header 3.22.5"
    - "@tiptap/static-renderer 3.22.5"
  patterns:
    - "Single-source-of-truth extension array imported by both admin client + public RSC (P4-3 admin/public drift prevention)"
    - "nodeMapping.image override that reads ONLY attrs.publicId (structurally ignores stored src; T-04-XSS-04 mitigation against data: URIs in rich-text image nodes)"
    - "unhandledNode/unhandledMark = '' on the static-renderer (defense-in-depth: stale doc with removed extension renders empty rather than crashing the page)"
    - "Image.extend with addAttributes() returning { ...this.parent?.(), publicId: { default, parseHTML, renderHTML } } — Tiptap v3 canonical extension-extension shape"
    - "Disable StarterKit-bundled link in v3 when overriding with extension-link.configure to avoid Tiptap's duplicate-extension-name warning"
    - "Drizzle jsonb().$type<T>() TypeScript narrowing without DDL change — pure type-system metadata"
key-files:
  created:
    - src/lib/tiptap-extensions.ts
    - src/lib/tiptap-render.ts
    - tests/lib/tiptap-render.test.ts
    - tests/fixtures/tiptap-malicious.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - src/db/schema/recipes.ts
    - src/db/schema/industries.ts
    - CLAUDE.md
decisions:
  - "Disable StarterKit-bundled link (`link: false`) and explicitly include extension-link.configure to avoid Tiptap v3 duplicate-extension warning — StarterKit v3 now bundles link, but our override needs different defaults (openOnClick=false, target=_blank, rel=nofollow noopener noreferrer)"
  - "FOLDER_ALLOWLIST extension to 'recipes' + 'industries' was already shipped in Phase 2 plan 02-14 — task 2.4 acceptance criteria are satisfied without modification (Rule-1 plan internal-spec drift; documented inline)"
  - "alt-text attribute escape (replace & and \") emitted from nodeMapping.image is defense-in-depth on top of static-renderer's escapeHTMLAttribute — we're emitting raw HTML string via the override, so the escape is our responsibility at that boundary"
  - "Apply deferred body.$type<JSONContent>() narrowing in this plan rather than batching with downstream Server Action plans — keeps the schema module's TS contract aligned with the now-installed @tiptap/core types from the moment the import is available"
metrics:
  duration_min: ~10
  completed_date: "2026-05-01"
  task_count: 4
  files_changed: 9
  tests_added: 1
  total_tests_passing: 175
---

# Phase 04 Plan 02: Tiptap Foundations Summary

Installs the Tiptap v3.22.5 stack and ships the shared extension array + server-side renderer. Upstream of every Phase-4 plan that authors or renders rich-text content (admin editor 04-07/04-08, public detail pages 04-09/04-10, lib helpers 04-03). The single-source-of-truth `TIPTAP_EXTENSIONS` array is the P4-3 admin/public drift mitigation; the `nodeMapping.image` override is the T-04-XSS-04 mitigation against `data:` URIs in rich-text image nodes; the locked extension allow-list is the T-04-XSS-01 mitigation surfaced by the static-renderer's built-in `escapeHTML`/`escapeHTMLAttribute`.

## What Shipped

- **Tiptap v3.22.5 stack — 11 packages pinned to exact version** (no caret/tilde): `@tiptap/core`, `@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/static-renderer`. Tiptap 3 publishes in lockstep — peer-locking prevents extension-loading breakage from minor-version drift. `pnpm-lock.yaml` updated; pnpm install reports zero diff on re-run.

- **`src/lib/tiptap-extensions.ts`** (NEW) — single source of truth. Exports `TIPTAP_EXTENSIONS` (length 7) + `CloudinaryImage`. NO `'use client'` directive — pure data, React-free, importable from BOTH the admin client island (plan 04-07) and the public RSC renderer (this plan). Locked configuration:
  - `StarterKit.configure({ heading: { levels: [1,2,3,4] }, codeBlock: false, link: false })` — H1-H4 per D-05; codeBlock deferred to v1.1; `link: false` disables the bundled link extension (StarterKit v3 now bundles it) so our explicit `Link.configure(...)` doesn't collide.
  - `Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'nofollow noopener noreferrer' } })` — T-04-XSS-03 + T-04-XX-01 mitigation (rel=nofollow noopener noreferrer on every link).
  - `CloudinaryImage` — `Image.extend({ addAttributes() { return { ...this.parent?.(), publicId: { default: null, parseHTML: el => el.getAttribute('data-public-id'), renderHTML: attrs => attrs.publicId ? { 'data-public-id': String(attrs.publicId) } : {} } } } })`. The custom `publicId` attribute is what stored content carries; the public RSC's `nodeMapping.image` override reads ONLY `attrs.publicId` and structurally ignores `attrs.src` — T-04-XSS-04 mitigation against `data:` URIs.
  - `Table.configure({ resizable: true })` + `TableRow` + `TableCell` + `TableHeader`.

- **`src/lib/tiptap-render.ts`** (NEW) — server-safe renderer. Exports `renderTiptapToHtml(doc: JSONContent): string` wrapping `renderToHTMLString({ extensions: TIPTAP_EXTENSIONS, content: doc, options })` from `@tiptap/static-renderer/pm/html-string`. Three security controls baked into the options:
  - `unhandledNode: () => ''` + `unhandledMark: () => ''` — softens the renderer's default throw-on-unknown-node to silent drop. Defense-in-depth: a stale doc with an extension we removed renders empty rather than 500-ing the page.
  - `nodeMapping.image: ({ node }) => ...` — reads ONLY `node.attrs.publicId`; if missing, returns empty string. If present, builds `src` via `getCldImageUrl({ src: publicId, width: 1200, format: 'auto', quality: 'auto' })` (responsive `f_auto,q_auto` consistent with Phase 3 `<CldImage>`). Emits `<img src="..." alt="..." loading="lazy" />` with attribute-escape on alt for `&` + `"`.
  - The locked `TIPTAP_EXTENSIONS` array is the XSS allow-list; the renderer's built-in `escapeHTML` + `escapeHTMLAttribute` (verified at `dist/pm/html-string/index.js` by the researcher) covers `&` `<` `>` `"` for all text + attribute values.

- **`tests/lib/tiptap-render.test.ts`** (NEW) — 1 spec (`T-04-XSS-01`) asserting `MALICIOUS_TIPTAP_DOC` rendering: raw `<script>` MUST NOT appear; `&lt;script&gt;alert(1)&lt;/script&gt;` MUST appear; `&lt;/p&gt;&lt;img` MUST appear (the bolded paragraph-break attempt is escaped); `Normal text after.` MUST survive intact (escape doesn't drop characters).

- **`tests/fixtures/tiptap-malicious.ts`** (NEW) — reusable `MALICIOUS_TIPTAP_DOC` fixture (paragraph with `<script>alert(1)</script>` text + `</p><img src=x onerror=alert(2)>` bold mark + paragraph with normal text). Reusable by any future XSS-related spec on the rendered body.

- **JSONContent narrowing** — `recipe_translations.body` and `industry_translations.body` narrowed from `jsonb()` to `jsonb().$type<JSONContent>()` with `import type { JSONContent } from '@tiptap/core'`. Plan 04-01 deferred this because `@tiptap/core` was not yet installed; this plan applies it now that the import is available. DDL is unchanged at the PG layer (still `jsonb`); the narrowing is purely TypeScript metadata for downstream Server Actions and read sites.

- **CLAUDE.md** — `**Rich text:** Tiptap v2` -> `**Rich text:** Tiptap v3 (3.22.5; pinned, peer-locked)`. STACK.md note was stale (researcher verified npm registry — Tiptap v3 stable since 2025-Q4); this brings CLAUDE.md in sync with the LOCKED stack reality.

## Verification Results

```
pnpm tsc --noEmit                                              -> CLEAN
pnpm vitest run tests/lib/tiptap-render.test.ts                 -> 1/1 PASS
grep "@tiptap/static-renderer" package.json                     -> "@tiptap/static-renderer": "3.22.5"
grep "'recipes'" src/app/api/cloudinary/sign/route.ts           -> FOLDER_ALLOWLIST contains 'recipes' (Phase 2 02-14)
grep "Tiptap v3" CLAUDE.md                                      -> Tiptap v3 (3.22.5; pinned, peer-locked)
pnpm vitest run --project node                                  -> 31 files / 161 specs PASS
pnpm vitest run --project dom                                   -> 3 files / 14 specs PASS
Total                                                           -> 34 files / 175 specs PASS (was 33/174 before this plan)
```

All 4 plan-literal verification gates clean / green / both grep matches found.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan internal-spec drift] StarterKit v3 bundles `link` extension; explicit `Link.configure(...)` triggers duplicate-extension warning**

- **Found during:** Task 2.2 (first vitest run on tests/lib/tiptap-render.test.ts after authoring TIPTAP_EXTENSIONS)
- **Issue:** Tiptap emitted `[tiptap warn]: Duplicate extension names found: ['link']. This can lead to issues.` because StarterKit v3 now bundles its own `link` extension AND we explicitly `Link.configure(...)` after it. The plan literal's exact `<behavior>` snippet (`StarterKit.configure({ heading: { levels: [1,2,3,4] }, codeBlock: false }) + Link.configure(...)`) was authored against a Tiptap v2/v3-pre-link-bundling assumption.
- **Fix:** Added `link: false` to `StarterKit.configure(...)` so the bundled link extension is disabled and our override (with the safer rel=nofollow noopener noreferrer + target=_blank defaults) is the only registered link extension. Inline comment explains why. Test re-runs without warning; behavior unchanged at the user level (links still render with all the safe attributes — just from a single registration site rather than two colliding ones).
- **Files modified:** `src/lib/tiptap-extensions.ts`
- **Commit:** `ebef2bb` (Task 2.2 GREEN — fix folded into the same commit since the duplicate registration was a Tiptap v3 stack-version interaction, not a logic change to TIPTAP_EXTENSIONS)

**2. [Rule 1 - Plan internal-spec drift] FOLDER_ALLOWLIST already extended in Phase 2 plan 02-14**

- **Found during:** Task 2.4 (initial inspection of `src/app/api/cloudinary/sign/route.ts`)
- **Issue:** Task 2.4 `<action>` instructs to extend FOLDER_ALLOWLIST with `'recipes'` + `'industries'`. The route file ALREADY contains `['products', 'recipes', 'industries', 'manufacturers'] as const` at line 49 — Phase 2 plan 02-14 (cloudinary signature-parity / widget paramsToSign protocol widening) shipped both entries when the FOLDER_ALLOWLIST was first formalized. The constraint is structurally satisfied; the plan acceptance grep `grep "'recipes'" src/app/api/cloudinary/sign/route.ts` matches.
- **Fix:** No code change needed. Documented as a Rule-1 plan internal-spec drift in the Task 2.4 commit message and here. The CLAUDE.md Tiptap v2 -> v3 documentation correction was the only remaining substantive change in Task 2.4.
- **Files modified:** None (constraint already satisfied; only the metadata/documentation halves of Task 2.4 shipped)
- **Commit:** `62620da` (Task 2.4 — CLAUDE.md docs correction only)

**3. [Rule 2 - Critical defense-in-depth] alt-text attribute escape in nodeMapping.image override**

- **Found during:** Task 2.3 authoring
- **Issue:** The plan literal's nodeMapping snippet at RESEARCH §Public path / option (1) lines 446-479 includes `alt.replace(/"/g, '&quot;')`. The plan `<behavior>` for Task 2.3 says `attribute-escape on alt (alt.replace(/"/g, '&quot;'))`. But `&` MUST also be escaped before `"` because raw `&` in the attribute would render `&quot;` literally as `&amp;quot;` rather than as the escape sequence — a malicious alt with `&quot;` literal would not be escape-safe. (This is a generic attribute-escape correctness rule, not a Tiptap-specific bug.)
- **Fix:** Escape `&` BEFORE `"` (`altRaw.replace(/&/g, '&amp;').replace(/"/g, '&quot;')`). Standard ordering for attribute escape (`&` first prevents double-escaping). Inline comment notes that static-renderer's escapeHTMLAttribute would catch this when the renderer walks the node, but we're emitting the raw HTML string ourselves in the override, so the escape is our responsibility at that boundary.
- **Files modified:** `src/lib/tiptap-render.ts`
- **Commit:** `836e5d5` (Task 2.3 GREEN — escape ordering folded into the same commit since the override and the test landed together)

### Authentication Gates

None — pure local CLI work (pnpm add + vitest + tsc).

### Architectural Changes

None — strictly additive surface (deps + 2 lib files + 1 test + 1 fixture + 1 CLAUDE.md edit + 2 schema TS narrowings).

## TDD Gate Compliance

This plan ran a clean TDD RED -> GREEN cycle for Tasks 2.2 + 2.3 (they share the test file):

- **RED (commit `6d0113b`):** `test(04-02): add failing test for renderTiptapToHtml XSS escape` — fixture + spec landed; vitest reported `Cannot find package '@/lib/tiptap-render'` (the test imports a module that doesn't exist yet — canonical RED).
- **GREEN (commits `ebef2bb` + `836e5d5`):** `feat(04-02): shared TIPTAP_EXTENSIONS array + CloudinaryImage extension` followed by `feat(04-02): renderTiptapToHtml + Cloudinary image nodeMapping + JSONContent narrowing` — vitest reports `1 passed (1)`.

Tasks 2.1 (chore install) and 2.4 (docs correction) are not test-bearing — Task 2.1 is a pure dependency install and Task 2.4 is a 1-line CLAUDE.md edit + a Rule-1 acknowledgement that FOLDER_ALLOWLIST was already extended. Neither has a meaningful RED state; both ship as single feat/chore/docs commits.

The plan-level TDD gate sequence exists in git log: `chore(04-02)` (deps) -> `test(04-02)` (RED) -> `feat(04-02)` x2 (GREEN, split because the extensions module + renderer module are independent units of GREEN) -> `docs(04-02)` (CLAUDE.md). RED then GREEN gate commits are present.

## Threat Flags

No new security-relevant surface beyond what the plan's `<threat_model>` already covered. The TIPTAP_EXTENSIONS allow-list IS the T-04-XSS-01 mitigation surface; the nodeMapping.image override IS the T-04-XSS-04 mitigation surface; the FOLDER_ALLOWLIST gate (already in place from Phase 2) IS the T-04-SSRF-01 mitigation surface. Spec `T-04-XSS-01` is the regression-locker for the escape contract; future XSS variants can extend the MALICIOUS_TIPTAP_DOC fixture without changing the renderer.

## Self-Check: PASSED

Files claimed to exist:
- `src/lib/tiptap-extensions.ts` — FOUND
- `src/lib/tiptap-render.ts` — FOUND
- `tests/lib/tiptap-render.test.ts` — FOUND
- `tests/fixtures/tiptap-malicious.ts` — FOUND
- `.planning/phases/04-content-features/04-02-SUMMARY.md` — FOUND (this file)

Files claimed to be modified:
- `package.json` (Tiptap deps at 3.22.5) — VERIFIED
- `pnpm-lock.yaml` (lockfile updated) — VERIFIED
- `src/db/schema/recipes.ts` (body narrowed) — VERIFIED
- `src/db/schema/industries.ts` (body narrowed) — VERIFIED
- `CLAUDE.md` (Tiptap v3 line) — VERIFIED

Commits claimed to exist (verified via `git log --oneline`):
- `4f1eeb2` chore(04-02): install Tiptap v3.22.5 stack
- `6d0113b` test(04-02): RED failing test
- `ebef2bb` feat(04-02): TIPTAP_EXTENSIONS + CloudinaryImage
- `836e5d5` feat(04-02): renderTiptapToHtml + nodeMapping.image + JSONContent narrowing
- `62620da` docs(04-02): CLAUDE.md Tiptap v2 -> v3 correction

All claims verified.
