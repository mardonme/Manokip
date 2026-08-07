import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import Seo from '../components/Seo.jsx';
import Gauge from '../components/Gauge.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { Reveal, Icon, Skeleton, ProductGridSkeleton, Container, Section, SectionHead } from '../components/ui/index.js';
import { api } from '../lib/api.js';
import { useLang } from '../lib/LangContext.jsx';

export default function Home() {
  const { t, lang } = useLang();
  const [categories, setCategories] = useState(null);   // null = loading
  const [featured, setFeatured] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cats, prods] = await Promise.all([
          api.get('/api/categories'),
          api.get('/api/products', { limit: 4 }),
        ]);
        if (cancelled) return;
        setCategories(cats.items || []);
        setFeatured(prods.items || []);
        setTotalProducts(prods.total || 0);
      } catch (e) {
        console.error('Home load failed:', e);
        if (!cancelled) { setCategories([]); setFeatured([]); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sub-categories of the manometer family, surfaced as their own home section.
  const manometerTypes = (categories || []).find((c) => c.slug === 'manometers')?.children || [];

  // Every figure here is either read from the live catalog or backed by a
  // certificate on the Documents page — nothing is asserted that we can't show.
  const stats = [
    [totalProducts ? String(totalProducts) : '—', t('home.stat.models')],
    [(categories || []).length ? String(categories.length) : '—', t('home.stat.families')],
    ['0,4', t('home.stat.bestClass')],
    ['ISO 9001', t('home.stat.iso')],
  ];

  return (
    <div className="mk">
      <StoreHeader />
      <Seo title={t('seo.home.title')} description={t('seo.home.desc')} />
      <main id="main">

        {/* HERO */}
        <Section as="section" size="sm" style={{ paddingTop: 64, paddingBottom: 72 }}>
          <div className="mk-hero">
            <div>
              <Reveal as="div" className="mk-row mk-wrap" style={{ gap: 10, marginBottom: 22 }}>
                <span className="mk-tag mk-tag-accent">{t('home.badge')}</span>
                <span className="mk-eyebrow">{t('home.eyebrow')}</span>
              </Reveal>
              <Reveal as="h1" index={1} style={{ fontSize: 'clamp(40px, 6.4vw, 92px)', fontWeight: 600, lineHeight: 0.97, letterSpacing: '-0.035em', margin: 0 }}>
                {t('home.hero.title.a')}<br />
                <span className="mk-muted">{t('home.hero.title.b')}</span>
              </Reveal>
              <Reveal as="p" index={2} className="mk-muted" style={{ fontSize: 19, lineHeight: 1.5, marginTop: 24, maxWidth: 560 }}>
                {t('home.hero.lead')}
              </Reveal>
              <Reveal index={3} className="mk-row mk-wrap" style={{ gap: 12, marginTop: 32 }}>
                <Link to="/catalog"><button className="mk-btn mk-btn-primary mk-btn-lg">{t('home.cta.browse')} <Icon name="arrow-right" size={16} className="mk-arrow" /></button></Link>
                <Link to="/contact"><button className="mk-btn mk-btn-light mk-btn-lg">{t('home.cta.quote')}</button></Link>
              </Reveal>
              <Reveal index={4} className="mk-stats" style={{ marginTop: 56, paddingTop: 30, borderTop: '1px solid var(--line)' }}>
                {stats.map(([n, l], i) => (
                  <div key={l} style={{ '--reveal-i': i }}>
                    <div className="mk-stat-n mk-num">{n}</div>
                    <div className="mk-stat-l">{l}</div>
                  </div>
                ))}
              </Reveal>
            </div>

            <Reveal variant="scale" index={2} className="mk-hero-figure">
              <div className="mk-dotgrid" style={{ position: 'absolute', inset: '-20px', opacity: 0.5 }} />
              <div style={{ position: 'relative' }}>
                <Gauge size={400} value={6.4} max={10} unit="MPa" label="MANOKIP · MANOBAR PG" danger={8.5} animate />
                <div className="mk-mono mk-hide-mobile" style={{ position: 'absolute', top: 24, right: -48, fontSize: 10.5, color: 'var(--ink-3)' }}>
                  <div style={{ width: 56, height: 1, background: 'var(--ink-4)', marginBottom: 4 }} />
                  STAINLESS Ø100mm
                </div>
                <div className="mk-mono mk-hide-mobile" style={{ position: 'absolute', bottom: 52, left: -64, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'right' }}>
                  <div style={{ width: 56, height: 1, background: 'var(--ink-4)', marginBottom: 4, marginLeft: 'auto' }} />
                  4–20 mA · HART
                </div>
              </div>
            </Reveal>
          </div>

        </Section>

        {/* CATEGORIES */}
        <Section as="section" size="sm" style={{ paddingTop: 0 }}>
          <SectionHead
            eyebrow={t('home.cat.eyebrow')} title={t('home.cat.title')}
            action={<Link to="/catalog" className="mk-ulink mk-row" style={{ gap: 6, fontSize: 14 }}>{t('home.cat.seeAll')}{totalProducts ? ` (${totalProducts})` : ''} <Icon name="arrow-right" size={15} /></Link>}
          />
          <div className="mk-grid-hair mk-cards-4">
            {categories === null
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ padding: '32px 28px', minHeight: 200, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <Skeleton w="30%" h={10} /><Skeleton w="70%" h={18} style={{ marginTop: 'auto' }} /><Skeleton w="40%" h={12} />
                  </div>
                ))
              : categories.map((c, i) => (
                  <Reveal key={c.slug} index={i} as={Link} to={`/catalog?category=${c.slug}`}
                    className="mk-filtertile" style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 200, color: 'inherit' }}>
                    <div className="mk-between">
                      <span className="mk-mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="mk-mono mk-muted" style={{ fontSize: 11 }}>{c.count} {t('home.cat.items')}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>{c.name}</div>
                      {lang !== 'ru' && <div className="mk-mono mk-muted" style={{ fontSize: 12.5, marginTop: 4 }}>{c.nameRu}</div>}
                    </div>
                    <div className="mk-row mk-accent" style={{ fontSize: 13, gap: 6 }}>
                      {t('home.cat.browse')} <Icon name="arrow-right" size={15} className="mk-arrow" />
                    </div>
                  </Reveal>
                ))}
          </div>
        </Section>

        {/* MANOMETER TYPES — the sub-categories of the largest family, linked
            straight from the home page so buyers skip a hop through the catalog. */}
        {manometerTypes.length > 0 && (
          <Section as="section" size="sm" style={{ paddingTop: 0 }}>
            <SectionHead
              eyebrow={t('home.types.eyebrow')} title={t('home.types.title')}
              action={<Link to="/catalog?category=manometers" className="mk-ulink mk-row" style={{ gap: 6, fontSize: 14 }}>{t('home.types.all')} <Icon name="arrow-right" size={15} /></Link>}
            />
            <div className="mk-row mk-wrap" style={{ gap: 8 }}>
              {manometerTypes.map((k) => (
                <Link key={k.slug} to={`/catalog?category=${k.slug}`} className="mk-typechip">
                  {k.name}
                  <span className="mk-mono" style={{ color: 'var(--ink-4)', fontSize: 11 }}>{k.count}</span>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* FEATURED */}
        <Section as="section" size="sm" style={{ paddingTop: 0 }}>
          <SectionHead eyebrow={t('home.feat.eyebrow')} title={t('home.feat.title')} />
          <div className="mk-grid mk-cards-4">
            {featured === null
              ? <ProductGridSkeleton count={4} />
              : featured.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
          </div>
        </Section>

        {/* BULK / CTA — single full-width card since the service card was removed. */}
        <Section as="section">
          <div className="mk-grid-hair">
            <Reveal style={{ background: 'var(--surface)', padding: '44px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <div className="mk-eyebrow">{t('home.bulk.eyebrow')}</div>
                <h3 style={{ fontSize: 'clamp(26px,3vw,36px)', fontWeight: 600, margin: '12px 0 14px' }}>{t('home.bulk.title')}</h3>
                <p className="mk-muted" style={{ fontSize: 15, lineHeight: 1.55, maxWidth: 460 }}>{t('home.bulk.lead')}</p>
                <div className="mk-row mk-wrap" style={{ gap: 28, marginTop: 28, paddingTop: 26, borderTop: '1px solid var(--line-soft)' }}>
                  {[['1h', t('home.bulk.response')], ['−18%', t('home.bulk.discount')], ['14', t('home.bulk.countries')]].map(([n, l]) => (
                    <div key={l}><div style={{ fontSize: 24, fontWeight: 600 }} className="mk-num">{n}</div><div className="mk-stat-l">{l}</div></div>
                  ))}
                </div>
              </div>
              <Link to="/contact" style={{ alignSelf: 'flex-start' }}><button className="mk-btn mk-btn-primary">{t('home.bulk.cta')} <Icon name="arrow-right" size={16} className="mk-arrow" /></button></Link>
            </Reveal>
          </div>
        </Section>

        {/* CERTIFICATES — procurement buyers look for proof before they enquire. */}
        <Section as="section" size="sm" style={{ paddingTop: 0 }}>
          <div className="mk-card" style={{ padding: '40px 40px 36px' }}>
            <div className="mk-eyebrow">{t('home.certs.eyebrow')}</div>
            <h3 style={{ fontSize: 'clamp(24px,2.6vw,32px)', fontWeight: 600, margin: '12px 0 12px', letterSpacing: '-0.02em' }}>{t('home.certs.title')}</h3>
            <p className="mk-muted" style={{ fontSize: 15, lineHeight: 1.55, maxWidth: 620, margin: 0 }}>{t('home.certs.lead')}</p>
            <div className="mk-row mk-wrap" style={{ gap: 8, marginTop: 22 }}>
              {['ISO 9001', "O'zStandart", 'GOST R', 'EAC'].map((s) => (
                <span key={s} className="mk-tag">{s}</span>
              ))}
            </div>
            <Link to="/documents" className="mk-ulink mk-row" style={{ display: 'inline-flex', gap: 6, fontSize: 14, marginTop: 22 }}>
              {t('home.certs.cta')} <Icon name="arrow-right" size={15} className="mk-arrow" />
            </Link>
          </div>
        </Section>

      </main>
      <StoreFooter />
    </div>
  );
}
