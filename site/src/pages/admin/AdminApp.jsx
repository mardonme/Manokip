import React from 'react';
import { Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';
import { useLang } from '../../lib/LangContext.jsx';
import { Logo } from '../../components/Chrome.jsx';
import Icon from '../../components/ui/Icon.jsx';
import AdminProducts from './AdminProducts.jsx';
import AdminCategories from './AdminCategories.jsx';
import AdminQuotes from './AdminQuotes.jsx';
import AdminOrders from './AdminOrders.jsx';

function Centered({ children }) {
  return (
    <div className="mk" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="mk-card mk-center" style={{ padding: 40, maxWidth: 440, borderRadius: 'var(--r-lg)' }}>
        <Link to="/" style={{ display: 'inline-block', marginBottom: 24 }}><Logo size={13} /></Link>
        {children}
      </div>
    </div>
  );
}

export default function AdminApp() {
  const { user, loading, openSignIn, logout } = useAuth();
  const { lang, setLang, t } = useLang();

  if (loading) return <Centered><p className="mk-muted">{t('admin.gate.loading')}</p></Centered>;

  if (!user) {
    return (
      <Centered>
        <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 10px' }}>{t('admin.gate.signInTitle')}</h2>
        <p className="mk-muted" style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>{t('admin.gate.signInLead')}</p>
        <button className="mk-btn mk-btn-primary" onClick={openSignIn}>{t('admin.gate.signInBtn')}</button>
      </Centered>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <Centered>
        <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 10px' }}>{t('admin.gate.deniedTitle')}</h2>
        <p className="mk-muted" style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>{t('admin.gate.deniedLead')}</p>
        <Link to="/"><button className="mk-btn mk-btn-light">{t('admin.nav.storefront')}</button></Link>
      </Centered>
    );
  }

  const NAV = [
    { to: '/admin', end: true, icon: 'layers', label: t('admin.nav.products') },
    { to: '/admin/categories', icon: 'sliders', label: t('admin.nav.categories') },
    { to: '/admin/quotes', icon: 'message', label: t('admin.nav.quotes') },
    { to: '/admin/orders', icon: 'cart', label: t('admin.nav.orders') },
  ];

  return (
    <div className="mk mk-adm">
      <aside className="mk-adm-aside">
        <Link to="/admin"><Logo size={12} /></Link>
        <div className="mk-eyebrow" style={{ margin: '8px 0 4px' }}>{t('admin.title')}</div>
        <nav className="mk-adm-nav">
          {NAV.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `mk-adm-navlink ${isActive ? 'is-active' : ''}`}>
              <Icon name={it.icon} size={17} /> {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="mk-adm-foot">
          <div className="mk-row" style={{ gap: 6 }}>
            {['ru', 'uz', 'en'].map((code) => (
              <button key={code} onClick={() => setLang(code)} className="mk-mono"
                style={{
                  background: lang === code ? 'var(--ink)' : 'transparent',
                  color: lang === code ? '#fff' : 'var(--ink-3)',
                  border: `1px solid ${lang === code ? 'var(--ink)' : 'var(--line-2)'}`,
                  borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontSize: 11, textTransform: 'uppercase',
                }}>{code}</button>
            ))}
          </div>
          <div className="mk-row" style={{ gap: 7, fontSize: 12.5, color: 'var(--ink-3)' }}><Icon name="user" size={14} /> {user.name || user.email}</div>
          <Link to="/" className="mk-row" style={{ fontSize: 13, color: 'var(--accent-ink)', gap: 6 }}><Icon name="arrow-up-right" size={14} /> {t('admin.nav.storefront')}</Link>
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--danger)', padding: 0, textAlign: 'left' }}>{t('admin.signOut')}</button>
        </div>
      </aside>

      <main className="mk-adm-main">
        <Routes>
          <Route index element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="quotes" element={<AdminQuotes />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
