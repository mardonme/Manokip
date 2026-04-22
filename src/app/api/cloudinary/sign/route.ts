// FOUND-06: signed-upload credential endpoint for admin Cloudinary uploads.
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
// Node runtime is mandatory — `auth()` pulls DrizzleAdapter + Neon driver,
// which cannot run on Edge.

import { z } from 'zod';
import { cloudinary } from '@/lib/cloudinary';
import { auth } from '@/lib/auth';
import { env } from '@/env';

export const runtime = 'nodejs';

const FOLDER_ALLOWLIST = ['products', 'recipes', 'industries', 'manufacturers'] as const;

const bodySchema = z.object({
  folder: z.enum(FOLDER_ALLOWLIST),
});

export async function POST(req: Request) {
  // T-CLD-01: admin-session gate — runs BEFORE any body read so unauth
  // callers never learn the expected request shape.
  const session = await auth();
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  // T-CLD-02: folder allowlist.
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
  const { folder } = parsed.data;

  // T-CLD-03: integer Unix seconds matches what the uploader will POST back
  // to Cloudinary in its form data so HMAC verification succeeds.
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
