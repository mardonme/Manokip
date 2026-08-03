import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useLang } from '../../lib/LangContext.jsx';
import {
  AdminModal, Labeled, TextInput, NumberInput,
  PrimaryBtn, LightBtn, AdminError, PageHead, RowActions, AdminLoading, AdminEmpty,
} from './ui.jsx';
import Icon from '../../components/ui/Icon.jsx';

const EMPTY = { slug: '', labelEn: '', labelRu: '', labelUz: '', sortOrder: 0 };

export default function AdminSpecLabels() {
  const { t } = useLang();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/spec-labels');
      const items = (res.items || []).slice()
        .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.id - b.id));
      setLabels(items);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing({ ...EMPTY, _isNew: true }); setErr(null); }
  function openEdit(l) {
    setEditing({
      id: l.id, slug: l.slug, labelEn: l.labelEn, labelRu: l.labelRu,
      labelUz: l.labelUz, sortOrder: l.sortOrder ?? 0,
    });
    setErr(null);
  }
  function set(k, v) { setEditing((e) => ({ ...e, [k]: v })); }

  async function save() {
    setSaving(true); setErr(null);
    const payload = {
      slug: editing.slug, labelEn: editing.labelEn, labelRu: editing.labelRu,
      labelUz: editing.labelUz, sortOrder: Number(editing.sortOrder) || 0,
    };
    try {
      if (editing._isNew) await api.post('/api/admin/spec-labels', payload);
      else await api.patch(`/api/admin/spec-labels/${editing.id}`, payload);
      setEditing(null);
      await load();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  // A label still referenced by a product spec comes back as 409 — the server
  // message names the usage count, so pass it through verbatim.
  async function remove(l) {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try { await api.delete(`/api/admin/spec-labels/${l.id}`); await load(); }
    catch (e) { window.alert(`${t('admin.error')} ${e.message}`); }
  }

  return (
    <div>
      <PageHead title={t('admin.labels.title')} action={
        <PrimaryBtn onClick={openNew}><Icon name="plus" size={15} /> {t('admin.labels.new')}</PrimaryBtn>
      } />

      {loading ? <AdminLoading rows={4} /> : labels.length === 0 ? <AdminEmpty icon="file" text={t('admin.empty')} /> : (
        <table className="mk-table">
          <thead>
            <tr>
              <th>RU</th>
              <th>UZ</th>
              <th>EN</th>
              <th>{t('admin.labels.slug')}</th>
              <th>{t('admin.labels.used')}</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {labels.map((l) => (
              <tr key={l.id}>
                <td style={{ fontWeight: 600 }}>{l.labelRu}</td>
                <td>{l.labelUz}</td>
                <td>{l.labelEn}</td>
                <td className="mk-mono" style={{ fontSize: 12 }}>{l.slug}</td>
                <td className="mk-mono" style={{ fontSize: 12.5 }}>{l._count?.specs ?? 0}</td>
                <RowActions onEdit={() => openEdit(l)} onDelete={() => remove(l)} />
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <AdminModal
          title={editing._isNew ? t('admin.labels.new') : t('admin.labels.title')}
          onClose={() => setEditing(null)}
          footer={<>
            <LightBtn onClick={() => setEditing(null)}>{t('admin.cancel')}</LightBtn>
            <PrimaryBtn onClick={save} disabled={saving}>{saving ? t('admin.saving') : t('admin.save')}</PrimaryBtn>
          </>}
        >
          <Labeled label={t('admin.labels.slug')}>
            <TextInput value={editing.slug} onChange={(v) => set('slug', v.toLowerCase())} placeholder="case-material" />
          </Labeled>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Labeled label={`${t('admin.labels.title')} · RU`}><TextInput value={editing.labelRu} onChange={(v) => set('labelRu', v)} /></Labeled>
            <Labeled label={`${t('admin.labels.title')} · UZ`}><TextInput value={editing.labelUz} onChange={(v) => set('labelUz', v)} /></Labeled>
            <Labeled label={`${t('admin.labels.title')} · EN`}><TextInput value={editing.labelEn} onChange={(v) => set('labelEn', v)} /></Labeled>
          </div>
          <Labeled label="Sort"><NumberInput value={editing.sortOrder} onChange={(v) => set('sortOrder', v)} /></Labeled>
          <AdminError message={err} />
        </AdminModal>
      )}
    </div>
  );
}
