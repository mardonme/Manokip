import React from 'react';
import { Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';
import { useLang } from '../../lib/LangContext.jsx';
import { Logo } from '../../components/Chrome.jsx';
import AdminProducts from './AdminProducts.jsx';
import AdminCategories from './AdminCategories.jsx';
import AdminQuotes from './AdminQuotes.jsx';
import AdminOrders from './AdminOrders.jsx';

function Centered({ children }) {
  return (
    <div className="mk" style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid var(--line)', padding: 40, maxWidth: 440, textAlign: 'center' }}>
        <Link to="/" style={{ display: 'inline-block', marginBottom: 24 }}><Logo size={13} /></Link>
        {children}
      </div>
    </div>
  );
}

export default function AdminApp() {
  const { user, loading, openSignIn, logout } = useAuth();
  const { lang, setLang, t } = useLang();

  if (loading) {
    return <Centered><p style={{ color: '#74777e' }}>{t('admin.gate.loading')}</p></Centered>;
  }

  if (!user) {
    return (
      <Centered>
        <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 10px' }}>{t('admin.gate.signInTitle')}</h2>
        <p style={{ color: '#3a3d44', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>{t('admin.gate.signInLead')}</p>
        <button className="mk-btn mk-btn-primary" onClick={openSignIn}>{t('admin.gate.signInBtn')}</button>
      </Centered>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <Centered>
        <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 10px' }}>{t('admin.gate.deniedTitle')}</h2>
        <p style={{ color: '#3a3d44', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>{t('admin.gate.deniedLead')}</p>
        <Link to="/"><button className="mk-btn mk-btn-light">{t('admin.nav.storefront')}</button></Link>
      </Centered>
    );
  }

  const navItem = ({ isActive }) => ({
    display: 'block', padding: '10px 14px', borderRadius: 6, fontSize: 14,
    fontWeight: isActive ? 600 : 500, marginBottom: 2,
    color: isActive ? '#fff' : '#3a3d44',
    background: isActive ? '#14161b' : 'transparent', textDecoration: 'none',
  });

  return (
    <div className="mk" style={{ background: 'var(--bg)', minHeight: '100vh', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <aside style={{ borderRight: '1px solid var(--line)', background: '#fff', padding: '24px 18px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <Link to="/admin" style={{ marginBottom: 8 }}><Logo size={12} /></Link>
        <div className="mk-eyebrow" style={{ margin: '6px 0 20px' }}>{t('admin.title')}</div>
        <nav style={{ flex: 1 }}>
          <NavLink end to="/admin" style={navItem}>{t('admin.nav.products')}</NavLink>
          <NavLink to="/admin/categories" style={navItem}>{t('admin.nav.categories')}</NavLink>
          <NavLink to="/admin/quotes" style={navItem}>{t('admin.nav.quotes')}</NavLink>
          <NavLink to="/admin/orders" style={navItem}>{t('admin.nav.orders')}</NavLink>
        </nav>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['ru', 'uz', 'en'].map((code) => (
              <button key={code} onClick={() => setLang(code)} style={{
                background: lang === code ? '#14161b' : 'transparent',
                color: lang === code ? '#fff' : '#74777e',
                border: '1px solid ' + (lang === code ? '#14161b' : 'var(--line-2)'),
                borderRadius: 4, padding: '3px 9px', cursor: 'pointer',
                fontFamily: 'JetBrains Mono', fontSize: 11, textTransform: 'uppercase',
              }}>{code}</button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: '#74777e' }}>{user.name || user.email}</div>
          <Link to="/" style={{ fontSize: 13, color: '#1240e5' }}>{t('admin.nav.storefront')}</Link>
          <a onClick={logout} style={{ fontSize: 13, color: '#b8531a', cursor: 'pointer' }}>{t('admin.signOut')}</a>
        </div>
      </aside>

      <main style={{ padding: '36px 40px', overflowX: 'auto' }}>
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
