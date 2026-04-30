// FOUND-06 + Plan 02-14 Task 14.2: signed-upload credential endpoint for
// admin Cloudinary uploads.
//
// Threat model (see .planning/phases/01-foundations/01-06-PLAN.md):
//   T-CLD-01  unauth signing → 401 before body parse
//   T-CLD-02  folder allowlist via Zod enum → 400 on miss
//   T-CLD-03  integer Unix-seconds timestamp (Pitfall 5) → effective 15-min
//             upload window because Cloudinary rejects signatures with
//             timestamp drift > 1h from server time.
//   T-SEC-ENV response returns apiKey + cloudName (public) but NEVER
//             apiSecret (server-only).
//
// PITFALL #5 — Plan 02-14 Task 14.0 parity smoke (PARITY-MISMATCH):
//   `next-cloudinary`'s CldUploadWidget delegates signing to
//   `@cloudinary-util/url-loader@5.10.4`'s `generateSignatureCallback`
//   (dist/index.js:67-89), which POSTs `{ paramsToSign: {...} }` and reads
//   `result.signature` from the response. The Phase-1 endpoint expected a
//   top-level `{ folder }` and signed server-generated `{ folder, timestamp }`
//   — incompatible on both axes (request shape AND signature scope).
//
//   Fix: accept BOTH request shapes (preserve Phase-1 tests + serve the
//   widget):
//     A. Legacy `{ folder }`         — server generates timestamp,
//                                      signs `{ folder, timestamp }`, returns
//                                      full {signature, timestamp, folder,
//                                      apiKey, cloudName} response shape.
//     B. Widget `{ paramsToSign }`   — validate `paramsToSign.folder` is in
//                                      allowlist, sign `paramsToSign`
//                                      verbatim (whatever the widget puts
//                                      in there is what Cloudinary will
//                                      receive — the signature must cover
//                                      EVERY param Cloudinary sees).
//                                      Returns {signature, apiKey, cloudName}.
//
// Node runtime is mandatory — `auth()` pulls DrizzleAdapter + Neon driver,
// which cannot run on Edge.

import { z } from 'zod';
import { cloudinary } from '@/lib/cloudinary';
import { auth } from '@/lib/auth';
import { env } from '@/env';

// Phase 3 Plan 01: removed `export const runtime = 'nodejs'` — incompatible
// with next.config.ts `cacheComponents: true`. Node remains the default
// runtime for route handlers in Next 16 (only Edge requires opting in).
// This handler is implicitly `nodejs` and continues to use cloudinary's
// Node SDK + crypto for HMAC signing.

const FOLDER_ALLOWLIST = ['products', 'recipes', 'industries', 'manufacturers'] as const;
type AllowedFolder = (typeof FOLDER_ALLOWLIST)[number];

// Accept either legacy `{ folder }` (Phase-1 contract) OR the widget's
// `{ paramsToSign }` envelope. `paramsToSign` is a flat record of
// string|number|boolean — Cloudinary's HMAC consumes exactly that shape.
// (`undefined` values would pollute the signed string with empty entries,
// so they're excluded by Zod's `record(string|number|boolean)`.)
const paramsValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const bodySchema = z.union([
  z.object({
    folder: z.enum(FOLDER_ALLOWLIST),
    paramsToSign: z.undefined().optional(),
  }),
  z.object({
    paramsToSign: z.record(z.string(), paramsValueSchema),
  }),
]);

function isAllowedFolder(value: unknown): value is AllowedFolder {
  return (
    typeof value === 'string' &&
    (FOLDER_ALLOWLIST as readonly string[]).includes(value)
  );
}

export async function POST(req: Request) {
  // T-CLD-01: admin-session gate — runs BEFORE any body read so unauth
  // callers never learn the expected request shape.
  const session = await auth();
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response('Invalid folder', { status: 400 });
  }

  // Discriminate: presence of `paramsToSign` ⇒ widget branch; otherwise
  // ⇒ legacy `{ folder }` branch. Narrow via local refs so TS sees
  // non-undefined values in each branch's body.
  const data = parsed.data;
  const widgetParams: Record<string, string | number | boolean> | undefined =
    'paramsToSign' in data ? data.paramsToSign : undefined;

  // Branch A — Phase-1 legacy shape `{ folder }`.
  if (!widgetParams) {
    // The first union variant guarantees `folder` is present here.
    const folder = (data as { folder: AllowedFolder }).folder;
    // T-CLD-03: integer Unix seconds matches what the uploader will POST
    // back to Cloudinary in its form data so HMAC verification succeeds.
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      env.CLOUDINARY_API_SECRET,
    );
    return Response.json({
      signature,
      timestamp,
      folder,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
    });
  }

  // Branch B — widget shape `{ paramsToSign }`.
  // T-CLD-02 still applies: the widget MUST be configured with a folder in
  // the allowlist; reject if it tried to upload to anywhere else.
  if (!isAllowedFolder(widgetParams.folder)) {
    return new Response('Invalid folder', { status: 400 });
  }

  // PITFALL #5 mitigation: sign EXACTLY the param set the widget will send
  // to Cloudinary (no more, no less). The widget already includes its own
  // timestamp here; we do NOT override it with our own — that would break
  // signature parity. Cloudinary rejects signatures with a server-side
  // timestamp drift > 1h, which is enforced by Cloudinary itself, not by us.
  const signature = cloudinary.utils.api_sign_request(
    widgetParams,
    env.CLOUDINARY_API_SECRET,
  );

  return Response.json({
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  });
}
