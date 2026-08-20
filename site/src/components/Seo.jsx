import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useLang } from '../lib/LangContext.jsx';

// Canonical site origin (production). Used to build absolute canonical/OG URLs.
export const SITE_URL = 'https://manokip.com.uz';
// 1200×630 social share image — drop a real cover at site/public/og-cover.jpg.
const OG_IMAGE = `${SITE_URL}/og-cover.jpg`;

const OG_LOCALE = { ru: 'ru_RU', uz: 'uz_UZ', en: 'en_US' };

const DEFAULT_TITLE = 'Manokip — Manometr va nazorat-oʻlchov asboblari';
const DEFAULT_DESC =
  'Manokip — sanoat uchun manometrlar, bosim oʻzgartkichlari, sath oʻlchagichlari va himoya relelarini ishlab chiqaradi. ISO 9001 · kalibrlash va tekshirish.';

/**
 * Per-route document head: title, meta description, canonical, Open Graph,
 * Twitter cards, <html lang>, and optional JSON-LD structured data.
 *
 * Renders nothing visible; react-helmet-async hoists the tags into <head>.
 * Each page should render exactly one <Seo …/>.
 */
export default function Seo({
  title,
  description = DEFAULT_DESC,
  image,
  type = 'website',
  jsonLd,
  noindex = false,
}) {
  const { lang } = useLang();
  const { pathname } = useLocation();

  const canonical = SITE_URL + pathname;
  const fullTitle = title ? `${title} — Manokip` : DEFAULT_TITLE;
  const img = image || OG_IMAGE;

  return (
    <Helmet htmlAttributes={{ lang }}>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Manokip" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={img} />
      <meta property="og:locale" content={OG_LOCALE[lang] || OG_LOCALE.ru} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
