# Phase 05: Contact and Launch Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 05-contact-launch-polish
**Areas discussed:** Contact form UX (placement + fields), Spam protection layering, Notification flow + auto-reply, Launch-gate execution scope

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Contact form UX (placement + fields) | Where the form lives + field shape (phone? auto-prefill product context?) | ✓ |
| Spam protection layering | Honeypot policy + rate-limit window + storage backend | ✓ |
| Notification flow + auto-reply | Admin recipient model + visitor confirmation | ✓ |
| Launch-gate execution scope | Claude-driven vs user-driven; Phase-4 deferred rollup | ✓ |

**User selected:** All four areas.

---

## Contact form UX — Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /contact page + footer link only | One page; no per-page conversion friction | |
| Dedicated page + sticky-button modal site-wide | Same page as canonical + sticky 'Contact us' button opens modal | ✓ |
| Dedicated page + inline form on every product detail | Heaviest footprint; duplicates form across 500+ pages | |
| All three: page + modal + inline product | Maximum surface area; highest QA burden | |

**User's choice:** Dedicated page + sticky-button modal site-wide (Recommended)

---

## Contact form UX — Modal trigger placement

| Option | Description | Selected |
|--------|-------------|----------|
| Right side of SiteHeader top bar | Next to LocaleSwitcher; integrates with existing Phase-3 header | ✓ |
| Floating bottom-right pill (FAB style) | Persistent floating button; risks overlapping product detail sticky CTA | |
| Both — header on desktop, FAB on mobile | Responsive; more implementation surface | |

**User's choice:** Right side of SiteHeader top bar (Recommended)

---

## Contact form UX — Phone field

| Option | Description | Selected |
|--------|-------------|----------|
| Optional | Schema column nullable; best B2B conversion vs lead-quality balance | ✓ |
| Required | Higher-quality leads; lower completion rate | |
| Hidden (don't show in v1) | Drop the field from the form entirely | |

**User's choice:** Optional (Recommended)

---

## Contact form UX — Product context capture

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-prepend localized prefix to message body | Server-side detect sourcePage, prepend 'Inquiry about: <Product> (<SKU>)' | ✓ |
| Store as separate columns (product_id, sku_at_submission) | Cleaner data model; requires schema migration + admin UI changes | |
| sourcePage URL only — no extraction | Simplest; admin clicks through to see what product | |

**User's choice:** Auto-prepend localized prefix to message body (Recommended)

---

## Spam protection — Rate-limit window

| Option | Description | Selected |
|--------|-------------|----------|
| 5 per hour, 20 per day | Standard B2B-form posture | ✓ |
| 10 per hour, 50 per day | More permissive; reduces false-positives | |
| 3 per hour, 10 per day | Aggressive; may block real visitors after Turnstile timeouts | |

**User's choice:** 5 per hour, 20 per day (Recommended)

---

## Spam protection — Rate-limit storage

| Option | Description | Selected |
|--------|-------------|----------|
| Postgres counter table | New tiny table; no infra dep; ~10ms latency | ✓ |
| Upstash Redis (REST) | Faster ~1ms; adds @upstash/ratelimit + 2 env vars | |
| Vercel KV | Native Vercel; ~$1/month even on hobby tier; vendor-locked | |

**User's choice:** Postgres counter table (Recommended)

---

## Spam protection — Honeypot violation response

| Option | Description | Selected |
|--------|-------------|----------|
| Return 200 + drop silently | Bot thinks it succeeded; standard anti-spam pattern | ✓ |
| Return 400 with generic error | Honest failure; bot may retry with adjusted payload | |

**User's choice:** Return 200 + drop silently (Recommended)

---

## Notification flow

| Option | Description | Selected |
|--------|-------------|----------|
| Single env-list of admin emails + auto-reply in visitor's locale | ADMIN_NOTIFY_EMAILS env var; 4 templates total | ✓ |
| Single env-list to admins + NO auto-reply | Lighter; 1 template only; saves Resend send-quota slot per submission | |
| Notify ALL active admin_user rows + auto-reply in locale | Reuses admin_user table; couples notification to invite list | |

**User's choice:** Single env-list of admin emails + auto-reply in visitor's locale (Recommended)

**Notes:** During CONTEXT.md drafting, the auto-reply template was consolidated to a single locale-parameterized React Email component (1 admin template + 1 locale-parameterized auto-reply = 2 templates total, not 4) since next-intl already provides the locale shaping.

---

## Launch-gate execution scope

| Option | Description | Selected |
|--------|-------------|----------|
| Claude drives everything possible; user does only real-device/external-account work | Claude ships form + load test + Lighthouse Slow-4G + Cloudinary e2e + glyph assertions; Phase-4 deferreds fold in | ✓ |
| Claude generates a checklist; you execute the validation work | Smaller phase; more manual work | |
| Claude drives everything possible; Phase-4 deferreds stay separate | Same as recommended for new work but DEF-4-12 entries unchanged | |

**User's choice:** Claude drives everything possible; you do only what requires real devices/external accounts (Recommended)

---

## Phase-5 closure exit criteria

| Option | Description | Selected |
|--------|-------------|----------|
| Code-shippable items GREEN; environmental items can be in-flight | Same posture as Phase 4; tracks DEF-5-NN-NN entries | ✓ |
| Everything must be GREEN including environmental + dogfood signoff | Stricter; requires synchronous handoff | |
| Code-shippable + observability-confirmed GREEN; everything else deferred | Adds Sentry/Vercel-Analytics smoke check to must-pass list | |

**User's choice:** Code-shippable items GREEN; environmental items can be in-flight (Recommended)

---

## Claude's Discretion

(Documented in CONTEXT.md `### Claude's Discretion` subsection.)

- Modal primitive: shadcn `Dialog` (already installed)
- Auto-reply email visual design: text-first, mirrors magic-link email style
- Rate-limit cleanup: opportunistic vs scheduled (planner picks)
- Load-test endpoint mix and p95 budget threshold

## Deferred Ideas

None surfaced — discussion stayed within Phase 5 boundary. Future v1.1 backlog candidates documented in CONTEXT.md `<deferred>` section.
