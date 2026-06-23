import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useLang } from '../../lib/LangContext.jsx';
import { Select, StatusPill, PageHead, AdminLoading, AdminEmpty } from './ui.jsx';

const STATUSES = ['new', 'contacted', 'closed'];
const TONE = { new: 'blue', contacted: 'amber', closed: 'green' };

export default function AdminQuotes() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/quotes');
      setItems(data.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(q, status) {
    setItems((list) => list.map((it) => (it.id === q.id ? { ...it, status } : it)));
    try { await api.patch(`/api/admin/quotes/${q.id}`, { status }); }
    catch (e) { window.alert(`${t('admin.error')} ${e.message}`); load(); }
  }

  const statusOptions = STATUSES.map((s) => ({ value: s, label: t(`admin.quote.status.${s}`) }));

  return (
    <div>
      <PageHead title={t('admin.nav.quotes')} />

      {loading ? <AdminLoading /> : items.length === 0 ? <AdminEmpty icon="message" text={t('admin.empty')} /> : (
        <table className="mk-table">
          <thead>
            <tr>
              <th>{t('admin.quote.company')}</th>
              <th>{t('admin.quote.contact')}</th>
              <th>{t('admin.quote.specs')}</th>
              <th>{t('admin.quote.date')}</th>
              <th>{t('admin.quote.status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => (
              <tr key={q.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{q.companyName}</div>
                  {q.industry && <div className="mk-muted" style={{ fontSize: 12.5 }}>{q.industry}</div>}
                </td>
                <td>
                  <div>{q.contactPerson}</div>
                  <div style={{ color: 'var(--accent-ink)', fontSize: 12.5 }}>{q.email}</div>
                  {q.phone && <div className="mk-mono mk-muted" style={{ fontSize: 12 }}>{q.phone}</div>}
                </td>
                <td className="mk-muted" style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{q.specs}</td>
                <td className="mk-mono mk-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(q.createdAt).toLocaleDateString()}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ marginBottom: 6 }}><StatusPill label={t(`admin.quote.status.${q.status}`)} tone={TONE[q.status]} /></div>
                  <Select value={q.status} onChange={(v) => setStatus(q, v)} options={statusOptions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
