// Plan 03-08 Task 8.1 — ru-locale sitemap route handler (SEO-03).
//
// See src/app/sitemap-uz.xml/route.ts for the pattern.

import { buildLocaleSitemapEntries, renderUrlsetXml } from '@/lib/sitemap';

export async function GET(): Promise<Response> {
  const entries = await buildLocaleSitemapEntries('ru');
  const xml = renderUrlsetXml(entries);
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
