// Plan 03-08 Task 8.1 — uz-locale sitemap route handler (SEO-03).
//
// Thin wrapper over src/lib/sitemap.ts. Cache invalidation flows through
// buildLocaleSitemapEntries' 'use cache' + cacheTag('sitemap') — every
// Phase-2 admin mutation already calls revalidateTag('sitemap', 'max')
// via src/lib/revalidation.ts.

import { buildLocaleSitemapEntries, renderUrlsetXml } from '@/lib/sitemap';

export async function GET(): Promise<Response> {
  const entries = await buildLocaleSitemapEntries('uz');
  const xml = renderUrlsetXml(entries);
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
