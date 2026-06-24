import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { useCart } from '../lib/CartContext.jsx';
import { useLang } from '../lib/LangContext.jsx';
import Icon from './ui/Icon.jsx';

export function Logo({ dark = false, size = 13 }) {
  const c = dark ? '#f5f3ee' : '#14161b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <svg width={size * 1.85} height={size * 1.85} viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r="11.5" fill="none" stroke={c} strokeWidth="1.2" />
        <circle cx="14" cy="14" r="2.2" fill="#1240e5" />
        <line x1="14" y1="14" x2="20" y2="8.5" stroke="#1240e5" strokeWidth="1.8" strokeLinecap="round" />
        {[0, 90, 180, 270].map((a) => {
          const t = (a * Math.PI) / 180;
          return (
            <line key={a}
              x1={14 + Math.cos(t) * 8.5} y1={14 + Math.sin(t) * 8.5}
              x2={14 + Math.cos(t) * 11} y2={14 + Math.sin(t) * 11}
              stroke={c} strokeWidth="1" />
          );
        })}
      </svg>
      <span style={{
        fontFamily: 'Inter Tight', fontSize: size, fontWeight: 700,
        letterSpacing: '0.22em', color: c, textTransform: 'uppercase',
      }}>MANOKIP</span>
    </div>
  );
}

export function StoreHeader({ dark = false }) {
  const { user, logout, openSignIn } = useAuth();
  const { cart } = useCart();
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  function submitSearch(e) {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  // ⌘K / Ctrl+K focuses the header search if visible, else opens the search page.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const el = searchRef.current;
        if (el && el.offsetParent !== null) el.focus();
        else navigate('/search');
      }
      if (e.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const NAV = [
    { label: t('nav.catalog'),   to: '/catalog' },
    { label: t('nav.solutions'), to: '/solutions' },
    { label: t('nav.service'),   to: '/service' },
    { label: t('nav.documents'), to: '/documents' },
    { label: t('nav.about'),     to: '/about' },
    { label: t('nav.contact'),   to: '/contact' },
  ];

  return (
    <header className="mk-header">
      <div className="mk-topbar">
        <div className="mk-container mk-topbar-inner">
          <div className="mk-topbar-info">
            {/* <span>{t('topbar.cities')}</span> */}
            {/* <span>{t('topbar.ships')}</span> */}
          </div>
          <div className="mk-topbar-meta">
            <a href="tel:+998936939220">+998 93 693-92-20</a>
            <div className="mk-langswitch" role="group" aria-label="Language">
              {['ru', 'uz', 'en'].map((code, i) => (
                <React.Fragment key={code}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <button
                    className={`mk-lang ${lang === code ? 'is-active' : ''}`}
                    aria-pressed={lang === code}
                    onClick={() => setLang(code)}
                  >{code}</button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mk-container mk-headbar-inner">
        <Link to="/" aria-label="Manokip home"><Logo dark={dark} size={13} /></Link>

        <nav className="mk-nav" aria-label="Primary">
          {NAV.map((it) => (
            <NavLink key={it.to} to={it.to}
              className={({ isActive }) => `mk-navlink ${isActive ? 'is-active' : ''}`}>
              {it.label}
            </NavLink>
          ))}
        </nav>

        <div className="mk-actions">
          <form className="mk-search" onSubmit={submitSearch} role="search">
            <button type="submit" aria-label={t('search.submit')} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}>
              <Icon name="search" size={15} />
            </button>
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t('nav.search')} aria-label={t('nav.search')} />
            <span className="mk-kbd" aria-hidden="true">⌘K</span>
          </form>

          <Link to="/cart" className="mk-iconbtn" aria-label={`${t('nav.cart')} (${cart.count || 0})`}>
            <Icon name="cart" size={19} />
            {cart.count > 0 && <span className="mk-cart-count mk-num">{cart.count}</span>}
          </Link>

          <div className="mk-account">
            {user ? (
              <>
                {user.role === 'ADMIN' && <Link to="/admin" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{t('admin.link')}</Link>}
                <Link to="/orders">{user.name || user.email}</Link>
                <button onClick={logout} className="mk-btn-ghost" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 12, padding: 0 }}>{t('nav.signOut')}</button>
              </>
            ) : (
              <button onClick={openSignIn} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink)', fontSize: 13, padding: 0 }}>{t('nav.signIn')}</button>
            )}
          </div>

          <Link to="/contact" className="mk-cta-desktop">
            <button className="mk-btn mk-btn-sm mk-btn-primary">{t('nav.requestQuote')}</button>
          </Link>

          <button className="mk-burger" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            <span />
          </button>
        </div>
      </div>

      {menuOpen && createPortal(
        <div className="mk-scrim" onClick={() => setMenuOpen(false)}>
          <nav className="mk-drawer" onClick={(e) => e.stopPropagation()} aria-label="Mobile">
            <div className="mk-between" style={{ marginBottom: 16 }}>
              <Logo size={12} />
              <button onClick={() => setMenuOpen(false)} className="mk-iconbtn" aria-label="Close menu">
                <Icon name="close" size={20} />
              </button>
            </div>

            <form className="mk-search" onSubmit={submitSearch} role="search" style={{ display: 'flex', minWidth: 0, marginBottom: 12 }}>
              <Icon name="search" size={15} style={{ color: 'var(--ink-3)' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('nav.search')} aria-label={t('nav.search')} style={{ fontSize: 15 }} />
            </form>

            {user?.role === 'ADMIN' && (
              <NavLink to="/admin" className="mk-drawer-link" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{t('admin.link')}</NavLink>
            )}
            {NAV.map((it) => (
              <NavLink key={it.to} to={it.to} className={({ isActive }) => `mk-drawer-link ${isActive ? 'is-active' : ''}`}>
                {it.label}
              </NavLink>
            ))}
            <NavLink to="/cart" className="mk-drawer-link">
              <span>{t('nav.cart')}</span>
              <span className="mk-mono mk-muted">{cart.count || 0}</span>
            </NavLink>

            {user ? (
              <button onClick={() => { logout(); setMenuOpen(false); }} className="mk-drawer-link" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line-soft)', textAlign: 'left', cursor: 'pointer', color: 'var(--ink-3)' }}>
                {t('nav.signOut')}
              </button>
            ) : (
              <button onClick={() => { openSignIn(); setMenuOpen(false); }} className="mk-drawer-link" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line-soft)', textAlign: 'left', cursor: 'pointer' }}>
                {t('nav.signIn')}
              </button>
            )}

            <Link to="/contact" style={{ marginTop: 14 }}>
              <button className="mk-btn mk-btn-primary" style={{ width: '100%' }}>{t('nav.requestQuote')}</button>
            </Link>

            <div className="mk-row" style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--line)', gap: 8 }}>
              <span className="mk-mono mk-muted" style={{ fontSize: 11, marginRight: 4 }}>LANG</span>
              {['ru', 'uz', 'en'].map((code) => (
                <button key={code} onClick={() => setLang(code)}
                  className="mk-mono"
                  style={{
                    background: lang === code ? 'var(--ink)' : 'transparent',
                    color: lang === code ? '#fff' : 'var(--ink-3)',
                    border: `1px solid ${lang === code ? 'var(--ink)' : 'var(--line-2)'}`,
                    borderRadius: 4, padding: '5px 11px', cursor: 'pointer', fontSize: 11, textTransform: 'uppercase',
                  }}>{code}</button>
              ))}
            </div>
            <a href="tel:+998936939220" className="mk-row" style={{ marginTop: 16, fontSize: 14, gap: 8 }}>
              <Icon name="phone" size={15} style={{ color: 'var(--ink-3)' }} /> +998 93 693-92-20
            </a>
          </nav>
        </div>,
        document.body
      )}
    </header>
  );
}

export function StoreFooter() {
  const { t, lang } = useLang();

  const LINKS = {
    catalog:  ['/catalog?category=manometers', '/catalog?category=pressure-switches', '/catalog?category=solar-panels', '/catalog?category=level-gauges', '/catalog?category=protection-relays', '/documents'],
    solutions: ['/solutions', '/solutions', '/solutions', '/solutions', '/solutions', '/solutions'],
    service:  ['/service', '/service', '/service', '/service', '/service', '/service'],
    company:  ['/about', '/manufacturing', '/documents', '/partners', '/press', '/careers'],
  };

  const COLS = {
    en: [
      { key: 'catalog',   t: t('footer.col.catalog'),   i: ['Manometers', 'Pressure switches', 'Solar panels', 'Level gauges', 'Protection relays', 'Documents'] },
      { key: 'solutions', t: t('footer.col.solutions'), i: ['Oil & gas', 'Mining', 'Chemical', 'HVAC', 'Power generation', 'Railway'] },
      { key: 'service',   t: t('footer.col.service'),   i: ['Calibration', 'Verification', 'Repair', 'Custom orders', 'Documentation', 'Training'] },
      { key: 'company',   t: t('footer.col.company'),   i: ['About Manokip', 'Manufacturing', 'Certificates', 'Partners', 'Press', 'Careers'] },
    ],
    ru: [
      { key: 'catalog',   t: t('footer.col.catalog'),   i: ['Манометры', 'Реле давления', 'Солнечные панели', 'Уровнемеры', 'Реле защиты', 'Документы'] },
      { key: 'solutions', t: t('footer.col.solutions'), i: ['Нефть и газ', 'Горнодобыча', 'Химия', 'Отопление', 'Энергетика', 'Железные дороги'] },
      { key: 'service',   t: t('footer.col.service'),   i: ['Калибровка', 'Поверка', 'Ремонт', 'Спецзаказы', 'Документация', 'Обучение'] },
      { key: 'company',   t: t('footer.col.company'),   i: ['О Manokip', 'Производство', 'Сертификаты', 'Партнёры', 'Пресса', 'Карьера'] },
    ],
    uz: [
      { key: 'catalog',   t: t('footer.col.catalog'),   i: ['Manometrlar', 'Bosim relelari', 'Quyosh panellari', 'Sath oʻlchagichlari', 'Himoya relelari', 'Hujjatlar'] },
      { key: 'solutions', t: t('footer.col.solutions'), i: ['Neft va gaz', 'Togʻ-kon', 'Kimyo', 'Isitish', 'Energetika', 'Temir yoʻl'] },
      { key: 'service',   t: t('footer.col.service'),   i: ['Kalibrlash', 'Tekshirish', 'Taʼmirlash', 'Maxsus buyurtmalar', 'Hujjatlar', 'Trening'] },
      { key: 'company',   t: t('footer.col.company'),   i: ['Manokip haqida', 'Ishlab chiqarish', 'Sertifikatlar', 'Hamkorlar', 'Matbuot', 'Karyera'] },
    ],
  };
  const cols = COLS[lang] || COLS.en;

  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer-grid">
          <div className="mk-footer-brand">
            <Logo dark size={14} />
            <p style={{ marginTop: 20, color: 'var(--on-ink-dim)', fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}>
              {t('footer.tagline')}
            </p>
            <div style={{ marginTop: 22, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['ISO 9001', 'GOST R', 'EAC', "O'zStandart"].map((s) => (
                <span key={s} className="mk-tag" style={{ background: 'transparent', borderColor: 'var(--ink-line)', color: 'var(--on-ink-dim)' }}>{s}</span>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.key}>
              <div className="mk-eyebrow" style={{ color: 'var(--on-ink-dim)', marginBottom: 16 }}>{c.t}</div>
              {c.i.map((label, idx) => (
                <Link key={label} to={(LINKS[c.key] && LINKS[c.key][idx]) || '/'} className="mk-footer-link">{label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mk-footer-bottom">
          <span>{t('footer.rights')}</span>
          <span>{t('footer.updated')} 2026.05.15</span>
        </div>
      </div>
    </footer>
  );
}
