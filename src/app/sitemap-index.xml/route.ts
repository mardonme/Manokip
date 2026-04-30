// Plan 03-08 Task 8.1 — sitemap index referencing the 3 per-locale sitemaps
// (SEO-03).
//
// Static structure — no DB access, no cache needed (the per-locale sitemap
// children carry the dynamic data + cache tag). Search Console reads this
// file once and then crawls each child sitemap on its own schedule.

const HOST = 'https://manometr.uz';

export async function GET(): Promise<Response> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${HOST}/sitemap-uz.xml</loc></sitemap>
  <sitemap><loc>${HOST}/sitemap-ru.xml</loc></sitemap>
  <sitemap><loc>${HOST}/sitemap-en.xml</loc></sitemap>
</sitemapindex>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
