<!-- GSD:project-start source:PROJECT.md -->
## Project

**Manometr** — a modern B2B multilingual digital platform (Uzbek Latin / Russian / English) for industrial pressure-measurement equipment: manometers, pressure transmitters, gauges, sensors. The platform presents deeply-structured product information (full specifications, downloadable datasheets, real-world use cases) to engineers, industrial companies, and technical specialists so they can evaluate equipment. It is explicitly **not** an e-commerce store — users do not purchase directly; they contact the team through a single site-wide contact form.

**Core value:** Every product page answers every technical question a specifying engineer would ask — in their language — so they trust Manometr as the authoritative source and contact us when ready.

**Audience:** Engineers, industrial purchasing specialists, technical decision-makers in Uzbekistan and CIS. They arrive via Google/Yandex searches for specific product parameters and land directly on product or category pages.

**Inspiration:** fiztech.ru — emulate information density and category-driven taxonomy, not visual style verbatim.

See `.planning/PROJECT.md` for the full living project context.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

- **Frontend/backend:** Next.js 16 App Router + React 19 + TypeScript (strict)
- **Database:** PostgreSQL 16 on Neon (HTTP serverless driver, pooled runtime connection + direct migration connection)
- **ORM:** Drizzle + drizzle-kit + drizzle-zod
- **i18n:** next-intl v4 (server-component-friendly, locale-prefixed routing)
- **Auth:** Auth.js v5 with Email magic-link provider, `@auth/drizzle-adapter`, magic-link email via Resend
- **UI (public + admin):** shadcn/ui + Tailwind v4 + Radix + TanStack Table + React Hook Form + Zod + nuqs + sonner + lucide-react
- **Media:** Cloudinary + `next-cloudinary` (signed direct browser uploads; DB stores `public_id` only)
- **Rich text:** Tiptap v3 (3.22.5; pinned, peer-locked) — recipes + industry pages
- **Email:** Resend + React Email (contact notifications, admin invites, magic-link email)
- **Full-text search:** Postgres native (`tsvector` + `unaccent` + `pg_trgm`) — per-locale `product_search` GIN index
- **Deployment:** Vercel Pro (EU region co-located with Neon)
- **Observability:** Sentry + Vercel Web Analytics + Speed Insights

See `.planning/research/STACK.md` for rationale, version pinning guidance, and alternatives considered.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during Phase 1 execution.

**Guardrails already locked (from research):**
- **Translations**: Every translatable entity MUST use sibling `*_translations` tables keyed `(entity_id, locale)`. No `_ru`/`_en`/`_uz` columns. No JSONB translation bags.
- **Spec values**: Stored in typed long-table (`product_spec_values` with `num_value`/`text_value`/`enum_value`/`bool_value` + unit) driven by `spec_field` catalog. Never store spec values as opaque strings like `"0-600 bar"`.
- **Locale routing**: Subpath `/[locale]/...` (uz, ru, en). Root `/` redirects to detected/default locale. Every page has a per-locale canonical plus hreflang for all three locales + `x-default`.
- **Cache invalidation**: Every Server Action mutation MUST call `revalidateTag` for the affected public pages. Edit-then-refresh must be e2e-tested on Vercel preview (not `next dev`).
- **Cloudinary**: Admin uploads go directly to Cloudinary via signed upload (bypassing Vercel). DB stores only `public_id`. Never round-trip large files through `/api/`.
- **Admin auth**: Magic-link only (no passwords). Session expires on 24h idle / 7d absolute. `requireAdmin()` wrapper on every Server Action. Every mutation writes to `audit_log`.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Single Next.js deployment on Vercel. Edge middleware handles locale rewrite (`/` → `/<detected>/`) and the admin auth-cookie gate for `/[locale]/admin/*`. Postgres holds three table families:

- **Core**: `category` (self-ref tree), `product`, `spec_field`, `manufacturer`, `recipe`, `industry`, `contact_submission`, `admin_user`, `audit_log`
- **Translation siblings**: `*_translations` keyed `(entity_id, locale)` with per-locale unique `slug`
- **Derived/search**: `product_spec_values` long-table + `product_search` per-locale `tsvector` with GIN index

Public pages are RSC with ISR + tag-based invalidation. Admin writes are Server Actions that upsert translations, replace spec values, rebuild all three `product_search` locale rows in the same transaction, then `revalidateTag('product:<id>', 'category:<id>', 'sitemap')`. Media never touches Next.js — admin uploads directly to Cloudinary via a short-lived signature minted by `/api/cloudinary/sign`.

Canonical build order (enforced by the roadmap):
1. Schema → 2. Auth + locale middleware → 3. Admin shell → 4. Category + manufacturer + spec-field CRUD → 5. Product + translations + spec values + media → 6. Public detail/list pages → 7. `product_search` + search + filters → 8. Recipes + industries + cross-links → 9. Contact + launch polish.

See `.planning/research/ARCHITECTURE.md` for full ERD, data flows, component boundaries, and anti-patterns.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` — do not edit manually.
<!-- GSD:profile-end -->
