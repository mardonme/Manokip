import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useLang } from '../../lib/LangContext.jsx';
import { Select, StatusPill, PageHead, AdminLoading, AdminEmpty } from './ui.jsx';

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
      <PageHead title={t('admin.nav.orders')} />

      {loading ? <AdminLoading /> : items.length === 0 ? <AdminEmpty icon="cart" text={t('admin.empty')} /> : (
        <table className="mk-table">
          <thead>
            <tr>
              <th>{t('admin.order.id')}</th>
              <th>{t('admin.order.customer')}</th>
              <th>{t('admin.order.items')}</th>
              <th>{t('admin.order.date')}</th>
              <th>{t('admin.order.status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td className="mk-mono" style={{ fontSize: 12.5 }}>#{o.id}</td>
                <td>{renderCustomer(o, t)}</td>
                <td>
                  {o.items.map((it) => (
                    <div key={it.id} style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                      <span className="mk-mono mk-muted">{it.qty}×</span> {it.productModel}
                    </div>
                  ))}
                  {o.notes && (
                    <div className="mk-muted" style={{ marginTop: 6, padding: 8, background: 'var(--surface-sunken)', fontSize: 12, borderRadius: 'var(--r-sm)' }}>
                      {t('admin.order.notes')}: {o.notes}
                    </div>
                  )}
                </td>
                <td className="mk-mono mk-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
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

// A guest order carries its own contact snapshot; a signed-in one falls back to
// the profile. The phone is what sales actually acts on, so it is a dial link.
function renderCustomer(o, t) {
  const name = o.contactName || o.user?.name || o.user?.email || '—';
  const phone = o.contactPhone || o.user?.phone;
  const email = o.contactEmail || o.user?.email;
  const company = o.contactCompany || o.user?.company;
  return (
    <>
      <div style={{ fontWeight: 600 }}>{name}</div>
      {phone && (
        <div className="mk-mono" style={{ fontSize: 13 }}>
          <a href={`tel:${String(phone).replace(/[^\d+]/g, '')}`} style={{ color: 'var(--accent-ink)' }}>{phone}</a>
        </div>
      )}
      {company && <div className="mk-muted" style={{ fontSize: 12.5 }}>{company}</div>}
      {email && <div style={{ color: 'var(--accent-ink)', fontSize: 12.5 }}>{email}</div>}
      {!o.userId && (
        <span className="mk-tag" style={{ marginTop: 6, fontSize: 10.5 }}>{t('admin.order.guest')}</span>
      )}
    </>
  );
}
