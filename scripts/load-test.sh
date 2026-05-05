#!/usr/bin/env bash
# Phase 5 plan 05-05 task 5.2 — load test against a Vercel preview URL.
#
# Usage: PREVIEW_URL=https://manometr-xxx.vercel.app ./scripts/load-test.sh
#
# Manual-only: triggered via .github/workflows/load-test.yml workflow_dispatch
# (NOT every PR per CONTEXT D-11 — running 5 ab tests of 500 requests each on
# every PR would dominate CI minutes and exhaust Resend quota / Vercel
# concurrency budgets).
#
# Output budget: any failed request OR p95 > P95_BUDGET_MS exits non-zero.
# Default budget is 2000 ms; override via P95_BUDGET_MS env var.

set -euo pipefail

: "${PREVIEW_URL:?PREVIEW_URL must be set}"
P95_BUDGET_MS="${P95_BUDGET_MS:-2000}"

# Endpoints chosen per CONTEXT D-11 + planner discretion: homepage + a hot
# category index + product detail + search + sitemap (read path that doesn't
# touch the public.contact namespace, so even 500 hits don't flood Resend).
ENDPOINTS=(
  "/uz"
  "/uz/categories"
  "/uz/products/manometr-m-100"
  "/uz/search?q=manometr"
  "/sitemap-uz.xml"
)

failed=0
for endpoint in "${ENDPOINTS[@]}"; do
  echo "::group::Load test ${PREVIEW_URL}${endpoint}"
  output=$(ab -n 500 -c 50 -q -k \
    -H "x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET:-}" \
    "${PREVIEW_URL}${endpoint}")
  echo "$output"

  errors=$(echo "$output" | grep -E "^Failed requests:" | awk '{print $3}')
  p95=$(echo "$output" | grep -E "^\s+95%" | awk '{print $2}')

  if [[ "${errors:-1}" -gt 0 ]]; then
    echo "::error::FAIL — ${errors} errors on ${endpoint}"
    failed=1
  fi
  if [[ -n "${p95:-}" && "${p95}" -gt "${P95_BUDGET_MS}" ]]; then
    echo "::error::FAIL — p95 ${p95}ms exceeds ${P95_BUDGET_MS}ms budget on ${endpoint}"
    failed=1
  fi
  echo "::endgroup::"
done

exit $failed
