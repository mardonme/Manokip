import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
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

  const stats = [
    ['7+', t('home.stat.years')],
    ['1 200+', t('home.stat.clients')],
    ['ISO 9001', t('home.stat.iso')],
    ['±0.5%', t('home.stat.class')],
  ];

  return (
    <div className="mk">
      <StoreHeader />
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
                <Gauge size={400} value={6.4} max={10} unit="MPa" label="MANOKIP PG · 0.5%" danger={8.5} animate />
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

          <div className="mk-trustrow" style={{ marginTop: 56, paddingTop: 26, borderTop: '1px solid var(--line)' }}>
            <b>{t('home.trustedBy')}</b>
            <span>NGMK</span><span>JPETROL</span><span>UZBEKNEFTEGAZ</span><span>TTZ</span><span>ENT-EN</span>
            <b>{t('home.more')}</b>
          </div>
        </Section>

        {/* CATEGORIES */}
        <Section as="section" size="sm" style={{ paddingTop: 0 }}>
          <SectionHead
            eyebrow={t('home.cat.eyebrow')} title={t('home.cat.title')}
            action={<Link to="/catalog" className="mk-ulink mk-row" style={{ gap: 6, fontSize: 14 }}>{t('home.cat.seeAll')} ({totalProducts || 90}) <Icon name="arrow-right" size={15} /></Link>}
          />
          <div className="mk-grid-hair mk-cards-5">
            {categories === null
              ? Array.from({ length: 5 }).map((_, i) => (
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

        {/* FEATURED */}
        <Section as="section" size="sm" style={{ paddingTop: 0 }}>
          <SectionHead eyebrow={t('home.feat.eyebrow')} title={t('home.feat.title')} />
          <div className="mk-grid mk-cards-4">
            {featured === null
              ? <ProductGridSkeleton count={4} />
              : featured.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
          </div>
        </Section>

        {/* SOLUTIONS BAND */}
        <Section as="section" tone="ink">
          <div className="mk-split">
            <Reveal variant="left">
              <div className="mk-eyebrow" style={{ color: 'var(--on-ink-dim)' }}>{t('home.sol.eyebrow')}</div>
              <h2 style={{ fontSize: 'clamp(30px,4vw,48px)', fontWeight: 600, margin: '10px 0 20px' }}>{t('home.sol.title')}</h2>
              <p style={{ fontSize: 16, color: 'var(--on-ink-dim)', lineHeight: 1.6, maxWidth: 420 }}>{t('home.sol.lead')}</p>
              <Link to="/solutions"><button className="mk-btn" style={{ marginTop: 26, background: 'transparent', color: 'var(--on-ink)', borderColor: 'var(--ink-line)' }}>{t('home.sol.allBtn')} <Icon name="arrow-right" size={16} className="mk-arrow" /></button></Link>
            </Reveal>
            <div className="mk-grid-hair mk-cards-2" style={{ background: 'var(--ink-line)' }}>
              {[
                ['oil', { ru: 'Нефть и газ', uz: 'Neft va gaz', en: 'Oil & Gas' }, 'gauge'],
                ['mining', { ru: 'Горнодобыча', uz: 'Togʻ-kon', en: 'Mining' }, 'layers'],
                ['chem', { ru: 'Химия', uz: 'Kimyo', en: 'Chemical' }, 'shield'],
                ['power', { ru: 'Энергетика и ОВК', uz: 'Energetika va isitish', en: 'Power & HVAC' }, 'zap'],
              ].map(([key, names, icon], i) => (
                <Reveal key={key} index={i} style={{ background: 'var(--ink-bg)', padding: '30px 26px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <Icon name={icon} size={22} style={{ color: 'var(--on-ink-dim)' }} />
                  <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.015em' }}>{names[lang] || names.en}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </Section>

        {/* SERVICE / CTA */}
        <Section as="section">
          <div className="mk-grid-hair mk-cards-2">
            <Reveal style={{ background: 'var(--surface)', padding: '44px 40px' }}>
              <div className="mk-eyebrow">{t('home.svc.eyebrow')}</div>
              <h3 style={{ fontSize: 'clamp(26px,3vw,36px)', fontWeight: 600, margin: '12px 0 14px' }}>{t('home.svc.title')}</h3>
              <p className="mk-muted" style={{ fontSize: 15, lineHeight: 1.55, maxWidth: 460 }}>{t('home.svc.lead')}</p>
              <div className="mk-row mk-wrap" style={{ gap: 28, marginTop: 28, paddingTop: 26, borderTop: '1px solid var(--line-soft)' }}>
                {[['48h', t('home.svc.turnaround')], ['±0.05%', t('home.svc.uncertainty')], ['14k+', t('home.svc.perYear')]].map(([n, l]) => (
                  <div key={l}><div style={{ fontSize: 24, fontWeight: 600 }} className="mk-num">{n}</div><div className="mk-stat-l">{l}</div></div>
                ))}
              </div>
              <Link to="/service"><button className="mk-btn mk-btn-light" style={{ marginTop: 26 }}>{t('home.svc.learn')} <Icon name="arrow-right" size={15} className="mk-arrow" /></button></Link>
            </Reveal>
            <Reveal index={1} style={{ background: 'var(--surface)', padding: '44px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24 }}>
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

      </main>
      <StoreFooter />
    </div>
  );
}
