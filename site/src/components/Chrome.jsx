import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { useCart } from '../lib/CartContext.jsx';
import { useLang } from '../lib/LangContext.jsx';

export function Logo({ dark = false, size = 13 }) {
  const c = dark ? '#f5f3ee' : '#14161b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <svg width={size * 1.85} height={size * 1.85} viewBox="0 0 28 28">
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
  const fg = dark ? '#f5f3ee' : '#14161b';
  const dim = dark ? '#a7a9af' : '#74777e';
  const line = dark ? '#2a2c32' : '#e5e1d8';
  const surf = dark ? '#14161b' : 'rgba(245,243,238,0.92)';

  const { user, logout, openSignIn } = useAuth();
  const { cart } = useCart();
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close drawer on route change.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  function submitSearch(e) {
    e.preventDefault();
    const q = search.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
    else navigate('/search');
  }

  // ⌘K / Ctrl+K focuses the header search.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Prevent scroll when drawer open.
  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
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
    <header style={{ borderBottom: `1px solid ${line}`, background: surf, backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 40px', borderBottom: `1px solid ${line}`,
        fontFamily: 'JetBrains Mono', fontSize: 10.5, color: dim, letterSpacing: '0.06em',
      }}>
        <div style={{ display: 'flex', gap: 22 }}>
          <span>{t('topbar.cities')}</span>
          <span>{t('topbar.ships')}</span>
        </div>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
          <a href="tel:+998936939220">+998 93 693-92-20</a>
          <div style={{ display: 'flex', gap: 4 }}>
            {['ru', 'uz', 'en'].map((code) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '2px 4px', letterSpacing: '0.06em',
                  color: lang === code ? fg : dim,
                  fontWeight: lang === code ? 700 : 400,
                  fontFamily: 'JetBrains Mono', fontSize: 10.5, textTransform: 'uppercase',
                }}
              >
                {code}
              </button>
            )).reduce((acc, el, i, arr) => {
              acc.push(el);
              if (i < arr.length - 1) acc.push(<span key={`s${i}`}>·</span>);
              return acc;
            }, [])}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 40px', gap: 40 }}>
        <Link to="/" style={{ color: fg }}><Logo dark={dark} size={13} /></Link>
        <nav style={{ display: 'flex', gap: 26, flex: 1, justifyContent: 'center' }}>
          {NAV.map((it) => (
            <NavLink key={it.to} to={it.to}
              style={({ isActive }) => ({
                fontSize: 14, fontWeight: isActive ? 600 : 500,
                color: isActive ? fg : dim,
                borderBottom: isActive ? '2px solid #1240e5' : '2px solid transparent',
                paddingBottom: 4,
              })}>
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <form onSubmit={submitSearch} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
            border: `1px solid ${line}`, padding: '8px 12px', borderRadius: 999,
            color: fg, fontSize: 13, minWidth: 220,
          }}>
            <button type="submit" aria-label={t('search.submit')} style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, cursor: 'pointer', color: dim, display: 'flex' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
            </button>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('nav.search')}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: fg, fontSize: 13, minWidth: 0 }}
            />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: dim }}>⌘K</span>
          </form>
          <Link to="/cart" style={{ color: fg, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <span>{t('nav.cart')}</span>
            <span style={{
              minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999,
              background: cart.count > 0 ? '#1240e5' : 'transparent',
              border: cart.count > 0 ? 'none' : `1px solid ${line}`,
              color: cart.count > 0 ? '#fff' : dim,
              fontFamily: 'JetBrains Mono', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {cart.count || 0}
            </span>
          </Link>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: fg }}>
              {user.role === 'ADMIN' && <Link to="/admin" style={{ color: '#1240e5', fontWeight: 600 }}>{t('admin.link')}</Link>}
              <Link to="/orders" style={{ color: fg }}>{user.name || user.email}</Link>
              <a onClick={logout} style={{ color: dim, cursor: 'pointer', fontSize: 12 }}>{t('nav.signOut')}</a>
            </div>
          ) : (
            <a onClick={openSignIn} style={{ fontSize: 13, color: fg, cursor: 'pointer' }}>{t('nav.signIn')}</a>
          )}
          <Link to="/contact"><button className="mk-btn mk-btn-sm mk-btn-primary">{t('nav.requestQuote')}</button></Link>
          <button
            className="mk-burger"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          ><span /></button>
        </div>
      </div>

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, top: 0, background: 'rgba(20,22,27,0.45)',
            zIndex: 90, backdropFilter: 'blur(2px)',
          }}
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0,
              width: 'min(320px, 86vw)', background: '#fff',
              padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 4,
              boxShadow: '-12px 0 32px rgba(20,22,27,0.18)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <Logo size={12} />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                style={{ background: 'transparent', border: 'none', fontSize: 26, lineHeight: 1, cursor: 'pointer', color: '#14161b' }}
              >×</button>
            </div>
            <form onSubmit={submitSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line-2)', borderRadius: 999, padding: '8px 12px', marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#74777e" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('nav.search')}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, minWidth: 0 }}
              />
            </form>
            {user?.role === 'ADMIN' && (
              <Link to="/admin" style={{ display: 'block', padding: '12px 4px', fontSize: 16, fontWeight: 600, color: '#1240e5', borderBottom: '1px solid var(--line-soft)' }}>
                {t('admin.link')}
              </Link>
            )}
            {NAV.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                style={({ isActive }) => ({
                  display: 'block', padding: '12px 4px', fontSize: 16,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1240e5' : '#14161b',
                  borderBottom: '1px solid var(--line-soft)',
                })}
              >
                {it.label}
              </NavLink>
            ))}
            <Link to="/cart" style={{ padding: '12px 4px', fontSize: 16, fontWeight: 500, color: '#14161b', borderBottom: '1px solid var(--line-soft)' }}>
              {t('nav.cart')} ({cart.count || 0})
            </Link>
            {user ? (
              <a onClick={() => { logout(); setMenuOpen(false); }} style={{ padding: '12px 4px', fontSize: 16, color: '#74777e', cursor: 'pointer' }}>
                {t('nav.signOut')}
              </a>
            ) : (
              <a onClick={() => { openSignIn(); setMenuOpen(false); }} style={{ padding: '12px 4px', fontSize: 16, color: '#14161b', cursor: 'pointer' }}>
                {t('nav.signIn')}
              </a>
            )}
            <Link to="/contact" style={{ marginTop: 12 }}>
              <button className="mk-btn mk-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {t('nav.requestQuote')}
              </button>
            </Link>
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
              <span style={{ color: '#74777e', marginRight: 4 }}>LANG:</span>
              {['ru', 'uz', 'en'].map((code) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  style={{
                    background: lang === code ? '#14161b' : 'transparent',
                    color: lang === code ? '#fff' : '#74777e',
                    border: '1px solid ' + (lang === code ? '#14161b' : 'var(--line-2)'),
                    borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
                    fontFamily: 'JetBrains Mono', fontSize: 11, textTransform: 'uppercase',
                  }}
                >{code}</button>
              ))}
            </div>
            <a href="tel:+998936939220" style={{ marginTop: 16, fontSize: 14, color: '#14161b' }}>+998 93 693-92-20</a>
          </nav>
        </div>
      )}
    </header>
  );
}

export function StoreFooter() {
  const { t, lang } = useLang();

  // Destinations are shared across languages; labels are localized.
  const LINKS = {
    catalog:  ['/catalog?category=manometers', '/catalog?category=pressure-switches', '/catalog?category=solar-panels', '/catalog?category=level-gauges', '/catalog?category=protection-relays', '/documents'],
    solutions: ['/solutions', '/solutions', '/solutions', '/solutions', '/solutions', '/solutions'],
    service:  ['/service', '/service', '/service', '/service', '/service', '/service'],
    company:  ['/about', '/manufacturing', '/documents', '/partners', '/press', '/careers'],
  };

  // Footer link lists per language. Kept compact to match the existing chrome.
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
    <footer style={{ background: '#14161b', color: '#f5f3ee', padding: '72px 40px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 56, paddingBottom: 48, borderBottom: '1px solid #2a2c32' }}>
        <div>
          <Logo dark size={14} />
          <p style={{ marginTop: 24, color: '#a7a9af', fontSize: 14, lineHeight: 1.6, maxWidth: 320 }}>
            {t('footer.tagline')}
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['ISO 9001', 'GOST R', 'EAC', "O'zStandart"].map((s) => (
              <span key={s} className="mk-tag" style={{ background: 'transparent', borderColor: '#2a2c32', color: '#a7a9af' }}>{s}</span>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.key}>
            <div className="mk-eyebrow" style={{ color: '#74777e', marginBottom: 16 }}>{c.t}</div>
            {c.i.map((label, idx) => (
              <Link key={label} to={(LINKS[c.key] && LINKS[c.key][idx]) || '/'} style={{ display: 'block', fontSize: 13.5, marginBottom: 10, color: '#f5f3ee', textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 28, fontFamily: 'JetBrains Mono', fontSize: 10.5, color: '#74777e', letterSpacing: '0.06em' }}>
        <span>{t('footer.rights')}</span>
        <span>{t('footer.updated')} 2026.05.15</span>
      </div>
    </footer>
  );
}
