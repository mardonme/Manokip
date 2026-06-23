import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useLang } from '../../lib/LangContext.jsx';
import {
  AdminModal, Labeled, TextInput, NumberInput,
  PrimaryBtn, LightBtn, AdminError, PageHead, RowActions, AdminLoading, AdminEmpty,
} from './ui.jsx';
import Icon from '../../components/ui/Icon.jsx';

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
      <PageHead title={t('admin.nav.categories')} action={
        <PrimaryBtn onClick={openNew}><Icon name="plus" size={15} /> {t('admin.cat.new')}</PrimaryBtn>
      } />

      {loading ? <AdminLoading rows={4} /> : categories.length === 0 ? <AdminEmpty icon="sliders" text={t('admin.empty')} /> : (
        <table className="mk-table">
          <thead>
            <tr>
              <th>{t('admin.cat.nameEn')}</th>
              <th>Slug</th>
              <th>{t('admin.cat.count')}</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{c.nameEn}</div>
                  <div className="mk-muted" style={{ fontSize: 12.5 }}>{c.nameRu} · {c.nameUz}</div>
                </td>
                <td className="mk-mono" style={{ fontSize: 12 }}>{c.slug}</td>
                <td className="mk-mono" style={{ fontSize: 12.5 }}>{c.count}</td>
                <RowActions onEdit={() => openEdit(c)} onDelete={() => remove(c)} />
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
