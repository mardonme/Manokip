// Build-time sitemap generator. Writes site/public/sitemap.xml (which Vite then
// copies into dist/). Runs as the `prebuild` npm hook before `vite build`.
//
// Static routes are always included. Product URLs are pulled from the live API
// (SITEMAP_API_BASE, default the production site). If the API is unreachable the
// build still succeeds with the static routes only — never fails the build.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SITE_URL = (process.env.SITE_URL || 'https://manokip.com.uz').replace(/\/$/, '');
const API_BASE = (process.env.SITEMAP_API_BASE || SITE_URL).replace(/\/$/, '');

// Public, indexable routes. /cart, /orders, /saved, /search, /admin are
// intentionally excluded (noindex / private).
const STATIC = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/catalog', changefreq: 'weekly', priority: '0.9' },
  { loc: '/about', changefreq: 'monthly', priority: '0.6' },
  { loc: '/documents', changefreq: 'monthly', priority: '0.6' },
  { loc: '/contact', changefreq: 'yearly', priority: '0.5' },
];

async function fetchProductIds() {
  const ids = [];
  try {
    let page = 1;
    let pages = 1;
    do {
      const res = await fetch(`${API_BASE}/api/products?page=${page}&limit=60`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      for (const p of data.items || []) if (p?.id != null) ids.push(p.id);
      pages = data.pages || 1;
      page += 1;
    } while (page <= pages && page <= 100);
  } catch (e) {
    console.warn(`[sitemap] product fetch from ${API_BASE} failed (${e.message}); static routes only.`);
  }
  return ids;
}

const xmlEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const ids = await fetchProductIds();
const entries = [
  ...STATIC.map((s) => ({ loc: SITE_URL + s.loc, changefreq: s.changefreq, priority: s.priority })),
  ...ids.map((id) => ({ loc: `${SITE_URL}/product/${id}`, changefreq: 'weekly', priority: '0.8' })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
  .join('\n')}
</urlset>
`;

const outPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/sitemap.xml');
await writeFile(outPath, xml, 'utf8');
console.log(`[sitemap] wrote ${entries.length} urls (${ids.length} products) -> public/sitemap.xml`);
