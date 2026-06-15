import React, { useCallback, useEffect, useState } from 'react';
import { api, mediaUrl } from '../../lib/api.js';
import { useLang } from '../../lib/LangContext.jsx';
import {
  AdminModal, Labeled, TextInput, TextArea, NumberInput, Select, ImageUpload,
  PrimaryBtn, LightBtn, AdminError, tableStyles,
} from './ui.jsx';

// Fetch every product across pages (storefront caps limit at 60).
async function fetchAllProducts() {
  const first = await api.get('/api/products', { page: 1, limit: 60 });
  let items = first.items || [];
  const pages = first.pages || 1;
  for (let p = 2; p <= pages; p++) {
    const next = await api.get('/api/products', { page: p, limit: 60 });
    items = items.concat(next.items || []);
  }
  return items;
}

const EMPTY = {
  sku: '', model: '', descEn: '', descRu: '', descUz: '', range: '',
  diameter: null, priceText: '', priceMinor: null, accuracy: '',
  imageUrl: null, inStock: true, stockCount: 0, categoryId: null,
};

export default function AdminProducts() {
  const { t } = useLang();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {…product} | EMPTY (with _isNew)
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([fetchAllProducts(), api.get('/api/categories')]);
      setProducts(prods);
      setCategories(cats.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    const defaultCat = categories[0]?.id ?? null;
    setEditing({ ...EMPTY, categoryId: defaultCat, _isNew: true });
    setErr(null);
  }
  function openEdit(p) {
    setEditing({
      id: p.id, sku: p.sku, model: p.model,
      descEn: p.descEn, descRu: p.descRu, descUz: p.descUz,
      range: p.range, diameter: p.diameter ?? null,
      priceText: p.priceText, priceMinor: p.priceMinor ?? null,
      accuracy: p.accuracy ?? '', imageUrl: p.imageUrl ?? null,
      inStock: p.inStock, stockCount: p.stockCount ?? 0,
      categoryId: p.categoryId ?? p.category?.id ?? null,
    });
    setErr(null);
  }

  function set(k, v) { setEditing((e) => ({ ...e, [k]: v })); }

  async function save() {
    setSaving(true); setErr(null);
    const payload = {
      sku: editing.sku, model: editing.model,
      descEn: editing.descEn, descRu: editing.descRu, descUz: editing.descUz,
      range: editing.range,
      diameter: editing.diameter === '' || editing.diameter == null ? null : Number(editing.diameter),
      priceText: editing.priceText,
      priceMinor: editing.priceMinor === '' || editing.priceMinor == null ? null : Number(editing.priceMinor),
      accuracy: editing.accuracy ? editing.accuracy : null,
      imageUrl: editing.imageUrl || null,
      inStock: !!editing.inStock,
      stockCount: Number(editing.stockCount) || 0,
      categoryId: Number(editing.categoryId),
    };
    try {
      if (editing._isNew) await api.post('/api/admin/products', payload);
      else await api.patch(`/api/admin/products/${editing.id}`, payload);
      setEditing(null);
      await load();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  async function remove(p) {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try { await api.delete(`/api/admin/products/${p.id}`); await load(); }
    catch (e) { window.alert(`${t('admin.error')} ${e.message}`); }
  }

  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';
  const catOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{t('admin.nav.products')}</h1>
        <PrimaryBtn onClick={openNew} disabled={categories.length === 0}>+ {t('admin.prod.new')}</PrimaryBtn>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: '#74777e' }}>{t('admin.loading')}</div>
      ) : products.length === 0 ? (
        <div style={{ padding: 40, color: '#74777e' }}>{t('admin.empty')}</div>
      ) : (
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>{t('admin.prod.colModel')}</th>
              <th style={tableStyles.th}>SKU</th>
              <th style={tableStyles.th}>{t('admin.prod.colCategory')}</th>
              <th style={tableStyles.th}>{t('admin.prod.colPrice')}</th>
              <th style={tableStyles.th}>{t('admin.prod.colStock')}</th>
              <th style={{ ...tableStyles.th, textAlign: 'right' }} />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td style={tableStyles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {p.imageUrl ? (
                      <img src={mediaUrl(p.imageUrl)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', border: '1px solid var(--line)', borderRadius: 4, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, border: '1px solid var(--line)', borderRadius: 4, background: '#fafaf7', flexShrink: 0 }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.model}</div>
                      <div style={{ color: '#74777e', fontSize: 12.5 }}>{p.desc}</div>
                    </div>
                  </div>
                </td>
                <td style={{ ...tableStyles.td, fontFamily: 'JetBrains Mono', fontSize: 12 }}>{p.sku}</td>
                <td style={tableStyles.td}>{catName(p.categoryId ?? p.category?.id)}</td>
                <td style={{ ...tableStyles.td, fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>{p.priceText}</td>
                <td style={{ ...tableStyles.td, fontFamily: 'JetBrains Mono', fontSize: 12.5 }}>{p.inStock ? p.stockCount : '—'}</td>
                <td style={{ ...tableStyles.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => openEdit(p)} style={linkBtn}>{t('admin.edit')}</button>
                  <button onClick={() => remove(p)} style={{ ...linkBtn, color: '#b8531a' }}>{t('admin.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <AdminModal
          title={editing._isNew ? t('admin.prod.new') : t('admin.prod.edit')}
          onClose={() => setEditing(null)}
          footer={<>
            <LightBtn onClick={() => setEditing(null)}>{t('admin.cancel')}</LightBtn>
            <PrimaryBtn onClick={save} disabled={saving}>{saving ? t('admin.saving') : t('admin.save')}</PrimaryBtn>
          </>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Labeled label={t('admin.prod.sku')}><TextInput value={editing.sku} onChange={(v) => set('sku', v)} /></Labeled>
            <Labeled label={t('admin.prod.model')}><TextInput value={editing.model} onChange={(v) => set('model', v)} /></Labeled>
          </div>
          <Labeled label={t('admin.prod.image')} hint={t('admin.prod.imageHint')}>
            <ImageUpload value={editing.imageUrl} onChange={(v) => set('imageUrl', v)} onError={setErr} />
          </Labeled>
          <Labeled label={t('admin.prod.descEn')}><TextArea value={editing.descEn} onChange={(v) => set('descEn', v)} /></Labeled>
          <Labeled label={t('admin.prod.descRu')}><TextArea value={editing.descRu} onChange={(v) => set('descRu', v)} /></Labeled>
          <Labeled label={t('admin.prod.descUz')}><TextArea value={editing.descUz} onChange={(v) => set('descUz', v)} /></Labeled>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Labeled label={t('admin.prod.range')}><TextInput value={editing.range} onChange={(v) => set('range', v)} /></Labeled>
            <Labeled label={t('admin.prod.category')}>
              <Select value={String(editing.categoryId ?? '')} onChange={(v) => set('categoryId', v)} options={catOptions} />
            </Labeled>
            <Labeled label={t('admin.prod.diameter')}><NumberInput value={editing.diameter} onChange={(v) => set('diameter', v)} /></Labeled>
            <Labeled label={t('admin.prod.accuracy')}><TextInput value={editing.accuracy} onChange={(v) => set('accuracy', v)} /></Labeled>
            <Labeled label={t('admin.prod.priceText')}><TextInput value={editing.priceText} onChange={(v) => set('priceText', v)} /></Labeled>
            <Labeled label={t('admin.prod.priceMinor')}><NumberInput value={editing.priceMinor} onChange={(v) => set('priceMinor', v)} /></Labeled>
            <Labeled label={t('admin.prod.stockCount')}><NumberInput value={editing.stockCount} onChange={(v) => set('stockCount', v)} /></Labeled>
            <Labeled label={t('admin.prod.inStock')}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', fontSize: 14 }}>
                <input type="checkbox" checked={!!editing.inStock} onChange={(e) => set('inStock', e.target.checked)} />
                {t('admin.prod.inStock')}
              </label>
            </Labeled>
          </div>
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
