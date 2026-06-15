import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useLang } from '../../lib/LangContext.jsx';
import { Select, StatusPill, tableStyles } from './ui.jsx';

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
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 20px' }}>{t('admin.nav.quotes')}</h1>

      {loading ? (
        <div style={{ padding: 40, color: '#74777e' }}>{t('admin.loading')}</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 40, color: '#74777e' }}>{t('admin.empty')}</div>
      ) : (
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>{t('admin.quote.company')}</th>
              <th style={tableStyles.th}>{t('admin.quote.contact')}</th>
              <th style={tableStyles.th}>{t('admin.quote.specs')}</th>
              <th style={tableStyles.th}>{t('admin.quote.date')}</th>
              <th style={tableStyles.th}>{t('admin.quote.status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => (
              <tr key={q.id}>
                <td style={tableStyles.td}>
                  <div style={{ fontWeight: 600 }}>{q.companyName}</div>
                  {q.industry && <div style={{ color: '#74777e', fontSize: 12.5 }}>{q.industry}</div>}
                </td>
                <td style={tableStyles.td}>
                  <div>{q.contactPerson}</div>
                  <div style={{ color: '#1240e5', fontSize: 12.5 }}>{q.email}</div>
                  {q.phone && <div className="mk-mono" style={{ color: '#74777e', fontSize: 12 }}>{q.phone}</div>}
                </td>
                <td style={{ ...tableStyles.td, maxWidth: 360, whiteSpace: 'pre-wrap', color: '#3a3d44' }}>{q.specs}</td>
                <td style={{ ...tableStyles.td, fontFamily: 'JetBrains Mono', fontSize: 12, color: '#74777e', whiteSpace: 'nowrap' }}>
                  {new Date(q.createdAt).toLocaleDateString()}
                </td>
                <td style={{ ...tableStyles.td, whiteSpace: 'nowrap' }}>
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
