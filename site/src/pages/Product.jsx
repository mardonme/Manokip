import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import Gauge from '../components/Gauge.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { api } from '../lib/api.js';
import { useCart } from '../lib/CartContext.jsx';
import { useAuth } from '../lib/AuthContext.jsx';
import { useLang } from '../lib/LangContext.jsx';

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    (async () => {
      try {
        const p = await api.get(`/api/products/${id}`);
        if (cancelled) return;
        setProduct(p);

        const list = await api.get('/api/products', {
          category: p.category?.slug,
          limit: 5,
        });
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
      <div className="mk" style={{ background: 'var(--bg)' }}>
        <StoreHeader />
        <div style={{ padding: 80, textAlign: 'center', color: '#74777e' }}>{t('product.loading')}</div>
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

  return (
    <div className="mk" style={{ background: 'var(--bg)' }}>
      <StoreHeader />

      <div style={{ padding: '20px 40px', borderBottom: '1px solid var(--line)' }} className="mk-mono">
        <span style={{ fontSize: 11, color: '#74777e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <Link to="/">{t('catalog.crumbHome')}</Link> / <Link to="/catalog">{t('catalog.crumb')}</Link>
          {p.category && <> / <Link to={`/catalog?category=${p.category.slug}`}>{p.category.name}</Link></>}
          {' / '}{p.model}
        </span>
      </div>

      <section style={{ padding: '48px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
        <div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', padding: 60, position: 'relative', minHeight: 520 }}>
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6 }}>
              <span className="mk-tag mk-tag-accent">● {p.inStock ? `${t('product.inStock')} · ${p.stockCount}` : t('product.onOrder')}</span>
              <span className="mk-tag">{t('product.shipDays')}</span>
            </div>
            <div style={{ position: 'absolute', top: 16, right: 16 }} className="mk-mono">
              <span style={{ fontSize: 10.5, color: '#74777e', letterSpacing: '0.08em' }}>SKU · {p.sku}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              <Gauge size={400} value={120} max={400} unit="kgf/cm²" label={p.model} danger={350} />
            </div>
          </div>
        </div>

        <div>
          <div className="mk-eyebrow">{p.category?.name} · GOST 2405-88</div>
          <h1 style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 8px' }}>{p.model}</h1>
          <p style={{ fontSize: 17, color: '#3a3d44', marginTop: 0 }}>{p.desc}</p>

          <div style={{ marginTop: 32, padding: '20px 24px', background: '#fff', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div className="mk-eyebrow">{t('product.price1')}</div>
                <div style={{ fontSize: 36, fontWeight: 600, marginTop: 4 }}>
                  {p.priceText} <span style={{ fontSize: 16, color: '#74777e', fontWeight: 400 }}>{p.priceMinor ? 'sum' : ''}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mk-eyebrow">{t('product.priceVolume')}</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#1240e5', marginTop: 4 }}>−18%</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div className="mk-eyebrow" style={{ marginBottom: 10 }}>{t('product.qty')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 999, background: '#fff' }}>
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>−</button>
                  <input
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10) || 1))}
                    style={{ width: 56, border: 'none', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 14, background: 'transparent' }}
                  />
                  <button onClick={() => setQty((q) => q + 1)} style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>+</button>
                </div>
                <span style={{ fontSize: 12.5, color: '#74777e' }}>{p.stockCount} {t('product.inStockN')}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 28 }}>
            <button
              className="mk-btn mk-btn-primary"
              onClick={addToOrder}
              disabled={adding}
              style={{ flex: 1, justifyContent: 'center', opacity: adding ? 0.7 : 1 }}
            >
              {adding ? t('product.adding') : t('product.addToOrder')}
            </button>
            <Link to="/contact" style={{ flex: 1 }}><button className="mk-btn mk-btn-light" style={{ width: '100%', justifyContent: 'center' }}>{t('nav.requestQuote')}</button></Link>
          </div>

          {feedback && (
            <div style={{
              marginTop: 12, fontSize: 13,
              color: feedback.kind === 'ok' ? '#1d7a4f' : '#b8531a',
            }}>
              {feedback.text} · <Link to="/cart" style={{ color: 'inherit', textDecoration: 'underline' }}>{t('product.viewCart')}</Link>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', gap: 24, fontSize: 12.5, color: '#74777e' }}>
            <span>{t('product.warranty')}</span>
            <span>{t('product.calIncluded')}</span>
            <span>{t('product.freeShip')}</span>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 40px 80px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
          {[
            ['specs', t('product.tab.specs')],
            ['docs', t('product.tab.docs')],
            ['cal', t('product.tab.cal')],
            ['compat', t('product.tab.compat')],
            ['reviews', `${t('product.tab.reviews')} · ${p.reviewsCount ?? 0}`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '16px 0', marginRight: 36, background: 'transparent', border: 'none',
                borderBottom: tab === key ? '2px solid #14161b' : '2px solid transparent',
                fontSize: 14, fontWeight: tab === key ? 600 : 500,
                color: tab === key ? '#14161b' : '#74777e', cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'specs' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 32, background: 'var(--line)', border: '1px solid var(--line)', gap: 1 }}>
            {specs.map(([k, v]) => (
              <div key={k} style={{ background: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, color: '#74777e' }}>{k}</span>
                <span className="mk-mono" style={{ fontSize: 13, color: '#14161b' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'reviews' && <ReviewsTab productId={p.id} onReviewAdded={() => navigate(0)} user={user} openSignIn={openSignIn} />}

        {(tab === 'docs' || tab === 'cal' || tab === 'compat') && (
          <div style={{ marginTop: 32, padding: 40, background: '#fff', border: '1px solid var(--line)', textAlign: 'center', color: '#74777e' }}>
            {t('product.comingSoon')}
          </div>
        )}
      </section>

      <section style={{ padding: '0 40px 80px' }}>
        <div className="mk-eyebrow">{t('product.related')}</div>
        <h3 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: '12px 0 24px' }}>{t('product.relatedWith')} {p.model}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {related.map((rp) => <ProductCard key={rp.id} p={rp} />)}
        </div>
      </section>

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
    <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40 }}>
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{data.total} {t('product.tab.reviews').toLowerCase()}</h3>
          {data.avgRating != null && (
            <div className="mk-mono" style={{ color: '#74777e' }}>{t('product.reviews.avg')} · {data.avgRating.toFixed(1)} / 5</div>
          )}
        </div>
        {data.items.length === 0 && (
          <div style={{ padding: 24, background: '#fff', border: '1px solid var(--line)', color: '#74777e', fontSize: 14 }}>
            {t('product.reviews.empty')}
          </div>
        )}
        {data.items.map((r) => (
          <div key={r.id} style={{ padding: 20, background: '#fff', border: '1px solid var(--line)', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 14 }}>{r.author}</strong>
              <span className="mk-mono" style={{ fontSize: 12, color: '#1240e5' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            </div>
            <p style={{ marginTop: 8, fontSize: 14, color: '#3a3d44', lineHeight: 1.5 }}>{r.body}</p>
            <div className="mk-mono" style={{ fontSize: 11, color: '#a7a9af', marginTop: 6 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>{t('product.reviews.write')}</h3>
        {!user && (
          <div style={{ marginBottom: 16, fontSize: 13, color: '#74777e' }}>
            <a onClick={openSignIn} style={{ color: '#1240e5', cursor: 'pointer' }}>{t('nav.signIn')}</a> — {t('product.reviews.signin')}
          </div>
        )}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="mk-eyebrow" style={{ marginBottom: 6 }}>{t('product.reviews.rating')}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setRating(n)} style={{
                  width: 32, height: 32, border: '1px solid var(--line)',
                  background: n <= rating ? '#1240e5' : '#fff',
                  color: n <= rating ? '#fff' : '#74777e',
                  borderRadius: 4, cursor: 'pointer', fontSize: 16,
                }}>★</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mk-eyebrow" style={{ marginBottom: 6 }}>{t('product.reviews.body')}</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('product.reviews.placeholder')}
              required
              disabled={!user}
              style={{ width: '100%', minHeight: 110, border: '1px solid var(--line-2)', padding: 12, fontSize: 14, background: 'transparent', resize: 'vertical' }}
            />
          </div>
          {err && <div style={{ color: '#b8531a', fontSize: 13 }}>{err}</div>}
          <button
            type="submit"
            className="mk-btn mk-btn-primary"
            disabled={submitting || !user}
            style={{ alignSelf: 'flex-start', opacity: submitting || !user ? 0.7 : 1 }}
          >
            {submitting ? '…' : t('product.reviews.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
