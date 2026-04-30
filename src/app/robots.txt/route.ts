// Plan 03-08 Task 8.1 — robots.txt route handler (SEO-03).
//
// Allow all crawlers + reference the sitemap index. Search Console reads
// the Sitemap directive to discover the per-locale sitemap children.
//
// Static body — no DB access, no cache tag (the sitemap children carry
// the dynamic data + their own cache invalidation).

const HOST = 'https://manometr.uz';

export async function GET(): Promise<Response> {
  const body = `User-agent: *
Allow: /

Sitemap: ${HOST}/sitemap-index.xml
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
