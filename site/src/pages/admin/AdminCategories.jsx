import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useLang } from '../../lib/LangContext.jsx';
import {
  AdminModal, Labeled, TextInput, NumberInput,
  PrimaryBtn, LightBtn, AdminError, tableStyles,
} from './ui.jsx';

const EMPTY = { slug: '', nameEn: '', nameRu: '', nameUz: '', count: 0 };

export default function AdminCategories() {
  const { t } = useLang();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await api.get('/api/categories');
      setCategories(cats.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing({ ...EMPTY, _isNew: true }); setErr(null); }
  function openEdit(c) {
    setEditing({ id: c.id, slug: c.slug, nameEn: c.nameEn, nameRu: c.nameRu, nameUz: c.nameUz, count: c.count ?? 0 });
    setErr(null);
  }
  function set(k, v) { setEditing((e) => ({ ...e, [k]: v })); }

  async function save() {
    setSaving(true); setErr(null);
    const payload = {
      slug: editing.slug, nameEn: editing.nameEn, nameRu: editing.nameRu,
      nameUz: editing.nameUz, count: Number(editing.count) || 0,
    };
    try {
      if (editing._isNew) await api.post('/api/admin/categories', payload);
      else await api.patch(`/api/admin/categories/${editing.id}`, payload);
      setEditing(null);
      await load();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  async function remove(c) {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try { await api.delete(`/api/admin/categories/${c.id}`); await load(); }
    catch (e) {
      const msg = e.status === 409 ? t('admin.cat.hasProducts') : e.message;
      window.alert(`${t('admin.error')} ${msg}`);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{t('admin.nav.categories')}</h1>
        <PrimaryBtn onClick={openNew}>+ {t('admin.cat.new')}</PrimaryBtn>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: '#74777e' }}>{t('admin.loading')}</div>
      ) : categories.length === 0 ? (
        <div style={{ padding: 40, color: '#74777e' }}>{t('admin.empty')}</div>
      ) : (
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>{t('admin.cat.nameEn')}</th>
              <th style={tableStyles.th}>Slug</th>
              <th style={tableStyles.th}>{t('admin.cat.count')}</th>
              <th style={{ ...tableStyles.th, textAlign: 'right' }} />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td style={tableStyles.td}>
                  <div style={{ fontWeight: 600 }}>{c.nameEn}</div>
                  <div style={{ color: '#74777e', fontSize: 12.5 }}>{c.nameRu} · {c.nameUz}</div>
                </td>
                <td style={{ ...tableStyles.td, fontFamily: 'JetBrains Mono', fontSize: 12 }}>{c.slug}</td>
                <td style={{ ...tableStyles.td, fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>{c.count}</td>
                <td style={{ ...tableStyles.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => openEdit(c)} style={linkBtn}>{t('admin.edit')}</button>
                  <button onClick={() => remove(c)} style={{ ...linkBtn, color: '#b8531a' }}>{t('admin.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <AdminModal
          title={editing._isNew ? t('admin.cat.new') : t('admin.cat.edit')}
          onClose={() => setEditing(null)}
          footer={<>
            <LightBtn onClick={() => setEditing(null)}>{t('admin.cancel')}</LightBtn>
            <PrimaryBtn onClick={save} disabled={saving}>{saving ? t('admin.saving') : t('admin.save')}</PrimaryBtn>
          </>}
        >
          <Labeled label={t('admin.cat.slug')}>
            <TextInput value={editing.slug} onChange={(v) => set('slug', v.toLowerCase())} placeholder="manometers" />
          </Labeled>
          <Labeled label={t('admin.cat.nameEn')}><TextInput value={editing.nameEn} onChange={(v) => set('nameEn', v)} /></Labeled>
          <Labeled label={t('admin.cat.nameRu')}><TextInput value={editing.nameRu} onChange={(v) => set('nameRu', v)} /></Labeled>
          <Labeled label={t('admin.cat.nameUz')}><TextInput value={editing.nameUz} onChange={(v) => set('nameUz', v)} /></Labeled>
          <Labeled label={t('admin.cat.count')}><NumberInput value={editing.count} onChange={(v) => set('count', v)} /></Labeled>
          <AdminError message={err} />
        </AdminModal>
      )}
    </div>
  );
}

const linkBtn = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 13, color: '#1240e5', marginLeft: 14, padding: 0,
};
