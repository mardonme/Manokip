# scripts/

CLI scripts run via `pnpm tsx scripts/<file>.ts`. All scripts that hit the
database connect via `DATABASE_URL_DIRECT` (NOT the pooled URL — pgBouncer
breaks multi-statement transactions). Env loading mirrors drizzle.config.ts:
`.env.local` first, then `.env` fallback.

## Verification scripts

`verify-*.ts` scripts assert that a specific Phase migration landed
correctly on the live Neon dev branch. They are read-only and exit non-zero
on any failed assertion. Examples:

- `verify-extensions.ts` — Phase 1 baseline (unaccent, pg_trgm).
- `verify-02-01-migration.ts` — Phase 2 plan 02-01 admin tables.
- `verify-04-01-migration.ts` — Phase 4 plan 04-01 content junctions.
- `verify-05-01-migration.ts` — Phase 5 plan 05-01 contact form.

Run any of them with `pnpm tsx scripts/verify-XX-NN-migration.ts`.

## Demo seed (`seed-demo.ts`) — pre-launch scaffolding (products only)

Populates the local DB with 4 categories, 6 manufacturers, and 12
products. Used to render the public catalog at `/uz/...` for a client
showcase before real content is authored via the admin UI.

**Two lifecycles — important:**

| Entity        | Status                          | On `db:seed:demo` re-run         | On `db:unseed:demo`        |
|---------------|---------------------------------|----------------------------------|----------------------------|
| Products      | Demo (sku prefix `DEMO-`)       | Wiped + re-inserted (always 12)  | DELETED — removed entirely |
| Categories    | **Permanent industry taxonomy** | Insert-if-missing on uz slug     | UNTOUCHED                  |
| Manufacturers | **Permanent industry taxonomy** | Insert-if-missing on uz slug     | UNTOUCHED                  |

**Why categories and manufacturers stay:** they are real industry data
(Manometrlar, Diferensial manometrlar, Bosim datchiklari, Bosim relayalari
+ WIKA, Rosma, Manotom, Teplokontrol, Fiztech, Universal). When the user
launches and authors real products via the admin UI, those products reuse
these same categories/manufacturers. The seed pre-populates them so the
admin product-form already has them as ready dropdown options.

**Lifecycle commands:**

```bash
pnpm db:seed:demo     # idempotent — safe to run any number of times
pnpm db:unseed:demo   # removes demo products only; categories + manufacturers stay
```

**At launch:** Run `pnpm db:unseed:demo` once before going live. The 12
demo products vanish; the 4 categories and 6 manufacturers remain. The
user can then edit/extend them via `/[locale]/admin/*`.

**Important caveats:**

- **uz only.** Visiting `/ru/products/<slug>` or `/en/products/<slug>`
  for a demo product returns 404. This is intentional — the seed is a
  preview of production information density, not multilingual content.
- **Clean URLs.** Slugs contain no `demo-` prefix:
  `/uz/categories/manometrlar`, `/uz/products/wika-232-50-0-10-mpa`. The
  `DEMO-` marker lives only in the product `sku` column.
- **No spec values, no images.** Products have empty `imagePublicIds` /
  `datasheetPublicIds` arrays and zero `product_spec_values` rows. PDPs
  render with placeholder images and no specifications table.
- **Does not call `revalidateTag`.** CLI scripts have no Next.js runtime,
  so the CLAUDE.md cache-invalidation guardrail (which applies to Server
  Actions) cannot be honored. Restart `pnpm dev` or hit a page once after
  seeding — RSC ISR re-renders on next request.
- **Does not write `audit_log` rows.** Audit is a Server-Action layer
  convention; `audit_log` has no schema-level invariant requiring rows.
  Tagged scaffolding does not belong in the audit trail.
- **Does not modify schema or migrations.** The seed only INSERTs and
  DELETEs into existing tables.
