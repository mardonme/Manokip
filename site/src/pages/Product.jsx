import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import Gauge from '../components/Gauge.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { Reveal, Icon, Skeleton, SectionHead } from '../components/ui/index.js';
import { api, mediaUrl } from '../lib/api.js';
import { useCart } from '../lib/CartContext.jsx';
import { useAuth } from '../lib/AuthContext.jsx';
import { useLang } from '../lib/LangContext.jsx';

export default function Product() {
  const { id } = useParams();
  const { add } = useCart();
  const { user, openSignIn } = useAuth();
  const { t } = useLang();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('specs');
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setProduct(null);
    (async () => {
      try {
        const p = await api.get(`/api/products/${id}`);
        if (cancelled) return;
        setProduct(p);
        const list = await api.get('/api/products', { category: p.category?.slug, limit: 5 });
        if (cancelled) return;
        setRelated((list.items || []).filter((x) => x.id !== p.id).slice(0, 4));
      } catch (e) {
        console.error('Product load failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function addToOrder() {
    if (!product) return;
    setAdding(true);
    setFeedback(null);
    try {
      await add(product.id, qty);
      setFeedback({ kind: 'ok', text: `${qty} × ${product.model} — ${t('product.addedToCart')}` });
    } catch (e) {
      setFeedback({ kind: 'err', text: e.message });
    } finally {
      setAdding(false);
    }
  }

  if (!product) {
    return (
      <div className="mk">
        <StoreHeader />
        <main id="main" className="mk-container" style={{ paddingTop: 48 }}>
          <Skeleton w="40%" h={14} style={{ marginBottom: 28 }} />
          <div className="mk-product-grid">
            <Skeleton h={520} r={4} />
            <div>
              <Skeleton w="50%" h={14} /><Skeleton w="70%" h={48} style={{ marginTop: 14 }} />
              <Skeleton h={90} style={{ marginTop: 28 }} /><Skeleton h={44} style={{ marginTop: 24 }} />
            </div>
          </div>
        </main>
        <StoreFooter />
      </div>
    );
  }

  const p = product;
  const specs = [
    [t('product.spec.range'), p.range],
    [t('product.spec.acc'), p.accuracy || '—'],
    [t('product.spec.dia'), p.diameter ? `Ø ${p.diameter} mm` : '—'],
    [t('product.spec.cat'), p.category?.name || '—'],
    [t('product.spec.sku'), p.sku],
    [t('product.spec.stock'), p.stockCount > 0 ? `${p.stockCount}` : t('product.spec.onRequest')],
    [t('product.spec.material'), 'AISI 304'],
    [t('product.spec.wetted'), 'AISI 316L · brass'],
    [t('product.spec.conn'), 'M20×1.5 · ½" NPT · G½"'],
    [t('product.spec.temp'), '−40 … +60 °C'],
    [t('product.spec.ip'), 'IP65'],
    [t('product.spec.verification'), '24 mo'],
  ];
  const TABS = [
    ['specs', t('product.tab.specs')],
    ['docs', t('product.tab.docs')],
    ['cal', t('product.tab.cal')],
    ['reviews', `${t('product.tab.reviews')} · ${p.reviewsCount ?? 0}`],
  ];

  return (
    <div className="mk">
      <StoreHeader />
      <main id="main">
        <div className="mk-container mk-mono" style={{ padding: '18px 40px', borderBottom: '1px solid var(--line)' }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Link to="/" className="mk-ulink">{t('catalog.crumbHome')}</Link> / <Link to="/catalog" className="mk-ulink">{t('catalog.crumb')}</Link>
            {p.category && <> / <Link to={`/catalog?category=${p.category.slug}`} className="mk-ulink">{p.category.name}</Link></>}
            {' / '}{p.model}
          </nav>
        </div>

        <div className="mk-container" style={{ paddingTop: 44, paddingBottom: 56 }}>
          <div className="mk-product-grid">
            <div className="mk-product-media">
              <div className="mk-card" style={{ padding: 56, position: 'relative', minHeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className={`mk-tag ${p.inStock ? 'mk-tag-ok' : ''}`}><span className="mk-dot" />{p.inStock ? `${t('product.inStock')} · ${p.stockCount}` : t('product.onOrder')}</span>
                  <span className="mk-tag">{t('product.shipDays')}</span>
                </div>
                <div className="mk-mono" style={{ position: 'absolute', top: 18, right: 18, fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>SKU · {p.sku}</div>
                {p.imageUrl
                  ? <img src={mediaUrl(p.imageUrl)} alt={p.model} style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }} />
                  : <Gauge size={380} value={120} max={400} unit="kgf/cm²" label={p.model} danger={350} animate />}
              </div>
            </div>

            <div>
              <div className="mk-eyebrow">{p.category?.name} · GOST 2405-88</div>
              <h1 style={{ fontSize: 'clamp(34px,4.5vw,56px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 8px' }}>{p.model}</h1>
              <p className="mk-muted" style={{ fontSize: 17, marginTop: 0 }}>{p.desc}</p>

              <div className="mk-card" style={{ marginTop: 28, padding: '20px 24px' }}>
                <div className="mk-between" style={{ alignItems: 'baseline' }}>
                  <div>
                    <div className="mk-eyebrow">{t('product.price1')}</div>
                    <div className="mk-num" style={{ fontSize: 36, fontWeight: 600, marginTop: 4 }}>{p.priceText} <span style={{ fontSize: 16, color: 'var(--ink-3)', fontWeight: 400 }}>{p.priceMinor ? 'sum' : ''}</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mk-eyebrow">{t('product.priceVolume')}</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--accent-ink)', marginTop: 4 }}>−18%</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <div className="mk-eyebrow" style={{ marginBottom: 10 }}>{t('product.qty')}</div>
                <div className="mk-row" style={{ gap: 12 }}>
                  <div className="mk-stepper">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><Icon name="minus" size={15} /></button>
                    <input value={qty} inputMode="numeric" aria-label={t('product.qty')}
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10) || 1))} />
                    <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity"><Icon name="plus" size={15} /></button>
                  </div>
                  <span className="mk-muted" style={{ fontSize: 12.5 }}>{p.stockCount} {t('product.inStockN')}</span>
                </div>
              </div>

              <div className="mk-row" style={{ gap: 8, marginTop: 26 }}>
                <button className="mk-btn mk-btn-primary mk-btn-lg" onClick={addToOrder} disabled={adding} style={{ flex: 1 }}>
                  {adding ? <><span className="mk-spinner" /> {t('product.adding')}</> : <>{t('product.addToOrder')} <Icon name="cart" size={16} /></>}
                </button>
                <Link to="/contact" style={{ flex: 1 }}><button className="mk-btn mk-btn-light mk-btn-lg" style={{ width: '100%' }}>{t('nav.requestQuote')}</button></Link>
              </div>

              <div aria-live="polite" style={{ minHeight: feedback ? 'auto' : 0 }}>
                {feedback && (
                  <div className="mk-row" style={{ marginTop: 12, fontSize: 13, gap: 6, color: feedback.kind === 'ok' ? 'var(--ok)' : 'var(--danger)' }}>
                    <Icon name={feedback.kind === 'ok' ? 'check-circle' : 'close'} size={15} />
                    {feedback.text}{feedback.kind === 'ok' && <> · <Link to="/cart" className="mk-ulink">{t('product.viewCart')}</Link></>}
                  </div>
                )}
              </div>

              <div className="mk-row mk-wrap mk-muted" style={{ marginTop: 24, gap: 18, fontSize: 12.5 }}>
                <span className="mk-row" style={{ gap: 6 }}><Icon name="shield" size={15} />{t('product.warranty')}</span>
                <span className="mk-row" style={{ gap: 6 }}><Icon name="award" size={15} />{t('product.calIncluded')}</span>
                <span className="mk-row" style={{ gap: 6 }}><Icon name="truck" size={15} />{t('product.freeShip')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mk-container" style={{ paddingBottom: 72 }}>
          <div className="mk-tabs" role="tablist">
            {TABS.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`mk-tab ${tab === key ? 'is-active' : ''}`}>{label}</button>
            ))}
          </div>

          {tab === 'specs' && (
            <div className="mk-specs mk-grid-hair" style={{ marginTop: 28 }}>
              {specs.map(([k, v]) => (
                <div key={k} className="mk-between" style={{ padding: '15px 22px' }}>
                  <span className="mk-muted" style={{ fontSize: 13.5 }}>{k}</span>
                  <span className="mk-mono" style={{ fontSize: 13, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'reviews' && <ReviewsTab productId={p.id} user={user} openSignIn={openSignIn} />}

          {tab === 'docs' && (
            <div className="mk-card" style={{ marginTop: 28, padding: 32 }}>
              <p className="mk-muted" style={{ fontSize: 15, lineHeight: 1.6, margin: '0 0 20px', maxWidth: 640 }}>{t('product.docs.intro')}</p>
              <ul className="mk-stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 10 }}>
                <li className="mk-row" style={{ fontSize: 14, gap: 10 }}><Icon name="file" size={16} style={{ color: 'var(--accent-ink)' }} />{t('product.docs.passport')}</li>
                <li className="mk-row" style={{ fontSize: 14, gap: 10 }}><Icon name="file" size={16} style={{ color: 'var(--accent-ink)' }} />{t('product.docs.calCert')}</li>
              </ul>
              <Link to="/documents" className="mk-ulink mk-row" style={{ display: 'inline-flex', marginTop: 20, fontSize: 13.5, gap: 6 }}>{t('product.docs.viewCerts')} <Icon name="arrow-right" size={15} /></Link>
            </div>
          )}

          {tab === 'cal' && (
            <div className="mk-card" style={{ marginTop: 28, padding: 32 }}>
              <p className="mk-muted" style={{ fontSize: 15, lineHeight: 1.6, margin: '0 0 24px', maxWidth: 640 }}>{t('product.cal.intro')}</p>
              <div className="mk-row mk-wrap" style={{ gap: 40, paddingTop: 20, borderTop: '1px solid var(--line-soft)' }}>
                {[['24 mo', t('product.cal.interval')], ['±0.05%', t('product.cal.uncertainty')], ['48h', t('product.cal.turnaround')]].map(([n, l]) => (
                  <div key={l}><div className="mk-num" style={{ fontSize: 22, fontWeight: 600 }}>{n}</div><div className="mk-stat-l">{l}</div></div>
                ))}
              </div>
              <Link to="/service" className="mk-ulink mk-row" style={{ display: 'inline-flex', marginTop: 24, fontSize: 13.5, gap: 6 }}>{t('product.cal.book')} <Icon name="arrow-right" size={15} /></Link>
            </div>
          )}
        </div>

        {related.length > 0 && (
          <div className="mk-container" style={{ paddingBottom: 80 }}>
            <SectionHead eyebrow={t('product.related')} title={`${t('product.relatedWith')} ${p.model}`} />
            <div className="mk-grid mk-cards-4">
              {related.map((rp, i) => <ProductCard key={rp.id} p={rp} index={i} />)}
            </div>
          </div>
        )}
      </main>
      <StoreFooter />
    </div>
  );
}

function ReviewsTab({ productId, user, openSignIn }) {
  const { t } = useLang();
  const [data, setData] = useState({ items: [], total: 0, avgRating: null });
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get(`/api/products/${productId}/reviews`);
        if (!cancelled) setData(r);
      } catch (e) { console.error(e); }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  async function submit(e) {
    e.preventDefault();
    if (!user) { openSignIn(); return; }
    setSubmitting(true); setErr(null);
    try {
      const r = await api.post(`/api/products/${productId}/reviews`, { rating, body });
      setData((d) => ({ ...d, items: [r, ...d.items], total: d.total + 1 }));
      setBody('');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mk-reviews" style={{ marginTop: 28 }}>
      <div>
        <div className="mk-between" style={{ marginBottom: 16, alignItems: 'baseline' }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{data.total} {t('product.tab.reviews').toLowerCase()}</h3>
          {data.avgRating != null && <div className="mk-mono mk-muted">{t('product.reviews.avg')} · {data.avgRating.toFixed(1)} / 5</div>}
        </div>
        {data.items.length === 0 && (
          <div className="mk-card mk-muted" style={{ padding: 24, fontSize: 14 }}>{t('product.reviews.empty')}</div>
        )}
        {data.items.map((r) => (
          <div key={r.id} className="mk-card" style={{ padding: 20, marginBottom: 12 }}>
            <div className="mk-between">
              <strong style={{ fontSize: 14 }}>{r.author}</strong>
              <span aria-label={`${r.rating} / 5`} style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: 1 }}>{'★'.repeat(r.rating)}<span style={{ color: 'var(--ink-4)' }}>{'★'.repeat(5 - r.rating)}</span></span>
            </div>
            <p className="mk-muted" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>{r.body}</p>
            <div className="mk-mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>{t('product.reviews.write')}</h3>
        {!user && (
          <div className="mk-muted" style={{ marginBottom: 16, fontSize: 13 }}>
            <button onClick={openSignIn} className="mk-ulink" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, font: 'inherit' }}>{t('nav.signIn')}</button> — {t('product.reviews.signin')}
          </div>
        )}
        <form onSubmit={submit} className="mk-stack" style={{ gap: 14 }}>
          <div className="mk-field">
            <span className="mk-label">{t('product.reviews.rating')}</span>
            <div className="mk-row" style={{ gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setRating(n)} className={`mk-starbtn ${n <= rating ? 'is-on' : ''}`} aria-label={`${n} stars`} aria-pressed={n === rating}>★</button>
              ))}
            </div>
          </div>
          <label className="mk-field">
            <span className="mk-label">{t('product.reviews.body')}</span>
            <textarea className="mk-textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('product.reviews.placeholder')} required disabled={!user} />
          </label>
          {err && <div className="mk-error" role="alert">{err}</div>}
          <button type="submit" className="mk-btn mk-btn-primary" disabled={submitting || !user} style={{ alignSelf: 'flex-start' }}>
            {submitting ? <span className="mk-spinner" /> : t('product.reviews.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
