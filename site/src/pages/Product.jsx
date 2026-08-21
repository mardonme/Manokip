import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StoreHeader, StoreFooter } from '../components/Chrome.jsx';
import Seo, { SITE_URL } from '../components/Seo.jsx';
import Gauge from '../components/Gauge.jsx';
import ProductCard from '../components/ProductCard.jsx';
import OrderModal from '../components/OrderForm.jsx';
import { Reveal, Icon, Skeleton, SectionHead } from '../components/ui/index.js';
import { api, mediaUrl } from '../lib/api.js';
import { useCart } from '../lib/CartContext.jsx';
import { useSaved } from '../lib/SavedContext.jsx';
import { useAuth } from '../lib/AuthContext.jsx';
import { useLang } from '../lib/LangContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Product() {
  const { id } = useParams();
  const { add } = useCart();
  const { isSaved, toggle } = useSaved();
  const { user, openSignIn } = useAuth();
  const { t } = useLang();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('specs');
  const [adding, setAdding] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
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
      const msg = `${qty} × ${product.model} — ${t('product.addedToCart')}`;
      setFeedback({ kind: 'ok', text: msg });
      toast.success(t('product.addedToCart'), `${qty} × ${product.model}`);
    } catch (e) {
      setFeedback({ kind: 'err', text: e.message });
      toast.error(t('cart.error'), e.message);
    } finally {
      setAdding(false);
    }
  }

  // Web Share where the platform has it (mobile), clipboard elsewhere.
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${product.model} — Manokip`, url }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('product.linkCopied'));
    } catch {
      toast.error(t('product.shareFailed'), url);
    }
  }

  async function toggleSave() {
    try {
      const nowSaved = await toggle(product.id);
      toast.success(nowSaved ? t('product.savedAdded') : t('product.savedRemoved'));
    } catch (e) {
      toast.error(t('saved.error'), e.message);
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

  // Absolute image URL for structured data (mediaUrl is relative in same-origin prod).
  const mImg = p.imageUrl ? mediaUrl(p.imageUrl) : '';
  const productImg = mImg ? (mImg.startsWith('http') ? mImg : SITE_URL + mImg) : undefined;
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: p.model,
        sku: p.sku,
        description: p.desc || undefined,
        brand: { '@type': 'Brand', name: 'Manokip' },
        category: p.category?.name,
        ...(productImg ? { image: productImg } : {}),
        // The catalogue quotes on request, so no price is advertised.
        offers: {
          '@type': 'Offer',
          availability: p.availability === 'IN_STOCK'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/MadeToOrder',
          url: `${SITE_URL}/product/${p.id}`,
        },
        ...(p.reviewsCount > 0 && p.avgRating
          ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(p.avgRating).toFixed(1), reviewCount: p.reviewsCount } }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t('catalog.crumbHome'), item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: t('catalog.crumb'), item: `${SITE_URL}/catalog` },
          ...(p.category ? [{ '@type': 'ListItem', position: 3, name: p.category.name, item: `${SITE_URL}/catalog?category=${p.category.slug}` }] : []),
          { '@type': 'ListItem', position: p.category ? 4 : 3, name: p.model, item: `${SITE_URL}/product/${p.id}` },
        ],
      },
    ],
  };
  const seoDesc = `${p.desc ? p.desc + ' · ' : ''}${p.diameter ? `Ø${p.diameter} mm · ` : ''}${p.accuracy ? `${t('product.spec.acc')} ${p.accuracy} · ` : ''}${t(`avail.${p.availability || 'MADE_TO_ORDER'}`)}`;

  // Spec rows come from the product sheet via the admin panel, already
  // translated; SKU and category are appended as catalogue context.
  const specs = [
    ...(p.specs || []).map((s) => [s.label, s.value]),
    [t('product.spec.cat'), p.category?.name || '—'],
    [t('product.spec.sku'), p.sku],
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
      <Seo title={p.model} description={seoDesc} type="product" jsonLd={productJsonLd} />
      <OrderModal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        items={[{ productId: p.id, qty }]}
        summary={`${qty} × ${p.model}${p.variant ? ` · ${p.variant}` : ''}`}
      />
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
                  <span className={`mk-tag ${p.availability === 'IN_STOCK' ? 'mk-tag-ok' : ''}`}>
                    <span className="mk-dot" />{t(`avail.${p.availability || 'MADE_TO_ORDER'}`)}
                  </span>
                </div>
                <div className="mk-mono" style={{ position: 'absolute', top: 18, right: 18, fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>SKU · {p.sku}</div>
                {p.imageUrl
                  ? <img src={mediaUrl(p.imageUrl)} alt={p.model} fetchpriority="high" decoding="async" style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }} />
                  : <Gauge size={380} value={120} max={400} unit="kgf/cm²" label={p.model} danger={350} animate />}
              </div>
            </div>

            <div>
              <div className="mk-eyebrow">{p.category?.name}</div>
              <h1 style={{ fontSize: 'clamp(34px,4.5vw,56px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '12px 0 8px' }}>{p.model}</h1>
              {p.variant && <div className="mk-muted" style={{ fontSize: 15, marginBottom: 8 }}>{p.variant}</div>}
              <p className="mk-muted" style={{ fontSize: 17, marginTop: 0 }}>{p.desc}</p>

              <div style={{ marginTop: 28 }}>
                <div className="mk-eyebrow" style={{ marginBottom: 10 }}>{t('product.qty')}</div>
                <div className="mk-row" style={{ gap: 12 }}>
                  <div className="mk-stepper">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><Icon name="minus" size={15} /></button>
                    <input value={qty} inputMode="numeric" aria-label={t('product.qty')}
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10) || 1))} />
                    <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity"><Icon name="plus" size={15} /></button>
                  </div>
                </div>
              </div>

              {/* Ordering is one click away and needs no account: the modal
                  asks for a name and a phone, nothing else. */}
              <div className="mk-row" style={{ gap: 8, marginTop: 26 }}>
                <button className="mk-btn mk-btn-primary mk-btn-lg" onClick={() => setOrderOpen(true)} style={{ flex: 1 }}>
                  {t('order.quick')} <Icon name="arrow-right" size={16} className="mk-arrow" />
                </button>
                <button className="mk-btn mk-btn-light mk-btn-lg" onClick={addToOrder} disabled={adding} style={{ flex: 1 }}>
                  {adding ? <><span className="mk-spinner" /> {t('product.adding')}</> : <>{t('product.addToOrder')} <Icon name="cart" size={16} /></>}
                </button>
              </div>
              <div className="mk-help" style={{ marginTop: 8 }}>
                {t('order.noAccount')} · <Link to="/contact" className="mk-ulink">{t('nav.requestQuote')}</Link>
              </div>

              <div className="mk-row" style={{ gap: 8, marginTop: 10 }}>
                <button className="mk-btn mk-btn-light" onClick={toggleSave} aria-pressed={isSaved(p.id)} style={{ flex: 1 }}>
                  <Icon name="heart" size={16} style={isSaved(p.id) ? { fill: 'currentColor' } : undefined} />
                  {isSaved(p.id) ? t('product.saved') : t('product.save')}
                </button>
                <button className="mk-btn mk-btn-light" onClick={share} style={{ flex: 1 }}>
                  <Icon name="share" size={16} /> {t('product.share')}
                </button>
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
                <span className="mk-row" style={{ gap: 6 }}><Icon name="truck" size={15} />{t('product.delivery')}</span>
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
              {specs.map(([k, v], i) => (
                <div key={`${k}-${i}`} className="mk-between" style={{ padding: '15px 22px', gap: 20 }}>
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
              <Link to="/contact" className="mk-ulink mk-row" style={{ display: 'inline-flex', marginTop: 24, fontSize: 13.5, gap: 6 }}>{t('product.cal.book')} <Icon name="arrow-right" size={15} /></Link>
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
