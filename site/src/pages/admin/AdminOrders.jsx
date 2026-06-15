import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useLang } from '../../lib/LangContext.jsx';
import { Select, StatusPill, tableStyles } from './ui.jsx';

const STATUSES = ['PENDING', 'CONFIRMED', 'FULFILLED', 'CANCELLED'];
const TONE = { PENDING: 'amber', CONFIRMED: 'blue', FULFILLED: 'green', CANCELLED: 'default' };

export default function AdminOrders() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/orders');
      setItems(data.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(o, status) {
    setItems((list) => list.map((it) => (it.id === o.id ? { ...it, status } : it)));
    try { await api.patch(`/api/admin/orders/${o.id}`, { status }); }
    catch (e) { window.alert(`${t('admin.error')} ${e.message}`); load(); }
  }

  const statusOptions = STATUSES.map((s) => ({ value: s, label: t(`admin.order.status.${s}`) }));

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 20px' }}>{t('admin.nav.orders')}</h1>

      {loading ? (
        <div style={{ padding: 40, color: '#74777e' }}>{t('admin.loading')}</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 40, color: '#74777e' }}>{t('admin.empty')}</div>
      ) : (
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>{t('admin.order.id')}</th>
              <th style={tableStyles.th}>{t('admin.order.customer')}</th>
              <th style={tableStyles.th}>{t('admin.order.items')}</th>
              <th style={tableStyles.th}>{t('admin.order.date')}</th>
              <th style={tableStyles.th}>{t('admin.order.status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td style={{ ...tableStyles.td, fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>#{o.id}</td>
                <td style={tableStyles.td}>
                  <div style={{ fontWeight: 600 }}>{o.user?.name || o.user?.email || '—'}</div>
                  {o.user?.company && <div style={{ color: '#74777e', fontSize: 12.5 }}>{o.user.company}</div>}
                  {o.user?.email && <div style={{ color: '#1240e5', fontSize: 12.5 }}>{o.user.email}</div>}
                </td>
                <td style={tableStyles.td}>
                  {o.items.map((it) => (
                    <div key={it.id} style={{ fontSize: 13, color: '#3a3d44' }}>
                      <span className="mk-mono" style={{ color: '#74777e' }}>{it.qty}×</span> {it.productModel}
                      <span style={{ color: '#a7a9af' }}> · {it.priceText}</span>
                    </div>
                  ))}
                  {o.notes && (
                    <div style={{ marginTop: 6, padding: 8, background: '#fafaf7', fontSize: 12, color: '#74777e', borderRadius: 4 }}>
                      {t('admin.order.notes')}: {o.notes}
                    </div>
                  )}
                </td>
                <td style={{ ...tableStyles.td, fontFamily: 'JetBrains Mono', fontSize: 12, color: '#74777e', whiteSpace: 'nowrap' }}>
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
                <td style={{ ...tableStyles.td, whiteSpace: 'nowrap' }}>
                  <div style={{ marginBottom: 6 }}><StatusPill label={t(`admin.order.status.${o.status}`)} tone={TONE[o.status]} /></div>
                  <Select value={o.status} onChange={(v) => setStatus(o, v)} options={statusOptions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
