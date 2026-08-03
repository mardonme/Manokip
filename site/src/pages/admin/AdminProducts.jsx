import React, { useCallback, useEffect, useState } from 'react';
import { api, mediaUrl } from '../../lib/api.js';
import { useLang } from '../../lib/LangContext.jsx';
import {
  AdminModal, Labeled, TextInput, TextArea, NumberInput, Select, ImageUpload,
  PrimaryBtn, LightBtn, AdminError, PageHead, RowActions, AdminLoading, AdminEmpty,
} from './ui.jsx';
import Icon from '../../components/ui/Icon.jsx';

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
  sku: '', model: '', variantEn: '', variantRu: '', variantUz: '',
  descEn: '', descRu: '', descUz: '',
  diameter: null, accuracy: '', imageUrl: null,
  availability: 'MADE_TO_ORDER', leadTimeDays: 14, categoryId: null, specs: [],
};

const AVAILABILITY = ['MADE_TO_ORDER', 'IN_STOCK', 'ON_REQUEST'];

// Flatten the nested category tree so sub-types are selectable, indenting
// children so the family they belong to stays obvious in the dropdown.
function flattenCats(items) {
  const out = [];
  for (const c of items) {
    out.push({ id: c.id, name: c.name, depth: 0 });
    for (const k of c.children || []) out.push({ id: k.id, name: k.name, depth: 1 });
  }
  return out;
}

export default function AdminProducts() {
  const { t } = useLang();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [specLabels, setSpecLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats, labels] = await Promise.all([
        fetchAllProducts(),
        api.get('/api/categories'),
        api.get('/api/admin/spec-labels'),
      ]);
      setProducts(prods);
      setCategories(flattenCats(cats.items || []));
      setSpecLabels(labels.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing({ ...EMPTY, categoryId: categories[0]?.id ?? null, _isNew: true });
    setErr(null);
  }

  // The listing omits spec rows (they'd bloat it), so refetch the single
  // product to populate the spec editor.
  async function openEdit(p) {
    setErr(null);
    setEditing({ id: p.id, _loading: true, ...EMPTY });
    try {
      const full = await api.get(`/api/products/${p.id}`);
      setEditing({
        id: full.id, sku: full.sku, model: full.model,
        variantEn: full.variantEn ?? '', variantRu: full.variantRu ?? '', variantUz: full.variantUz ?? '',
        descEn: full.descEn, descRu: full.descRu, descUz: full.descUz,
        diameter: full.diameter ?? null, accuracy: full.accuracy ?? '',
        imageUrl: full.imageUrl ?? null,
        availability: full.availability || 'MADE_TO_ORDER',
        leadTimeDays: full.leadTimeDays ?? null,
        categoryId: full.categoryId ?? full.category?.id ?? null,
        specs: (full.specs || []).map((s) => ({
          labelId: s.labelId, valueEn: s.valueEn, valueRu: s.valueRu, valueUz: s.valueUz,
        })),
      });
    } catch (e) { setErr(e.message); setEditing(null); }
  }
  function set(k, v) { setEditing((e) => ({ ...e, [k]: v })); }

  function setSpec(i, k, v) {
    setEditing((e) => {
      const specs = e.specs.slice();
      specs[i] = { ...specs[i], [k]: v };
      return { ...e, specs };
    });
  }
  function addSpec() {
    setEditing((e) => ({
      ...e,
      specs: [...e.specs, { labelId: specLabels[0]?.id ?? null, valueEn: '', valueRu: '', valueUz: '' }],
    }));
  }
  function removeSpec(i) {
    setEditing((e) => ({ ...e, specs: e.specs.filter((_, j) => j !== i) }));
  }

  async function save() {
    setSaving(true); setErr(null);
    const str = (v) => (v && String(v).trim() ? String(v).trim() : null);
    const payload = {
      sku: editing.sku, model: editing.model,
      variantEn: str(editing.variantEn), variantRu: str(editing.variantRu), variantUz: str(editing.variantUz),
      descEn: editing.descEn, descRu: editing.descRu, descUz: editing.descUz,
      diameter: editing.diameter === '' || editing.diameter == null ? null : Number(editing.diameter),
      accuracy: str(editing.accuracy),
      imageUrl: editing.imageUrl || null,
      availability: editing.availability,
      leadTimeDays: editing.leadTimeDays === '' || editing.leadTimeDays == null
        ? null : Number(editing.leadTimeDays),
      categoryId: Number(editing.categoryId),
      // Only complete rows are sent; the server rejects blank values anyway.
      specs: (editing.specs || [])
        .filter((s) => s.labelId && s.valueRu && s.valueUz && s.valueEn)
        .map((s, i) => ({
          labelId: Number(s.labelId),
          valueEn: s.valueEn, valueRu: s.valueRu, valueUz: s.valueUz,
          sortOrder: i,
        })),
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
  const catOptions = categories.map((c) => ({
    value: String(c.id), label: (c.depth ? '— ' : '') + c.name,
  }));
  const labelOptions = specLabels.map((l) => ({ value: String(l.id), label: l.labelRu }));

  return (
    <div>
      <PageHead title={t('admin.nav.products')} action={
        <PrimaryBtn onClick={openNew} disabled={categories.length === 0}><Icon name="plus" size={15} /> {t('admin.prod.new')}</PrimaryBtn>
      } />

      {loading ? <AdminLoading /> : products.length === 0 ? <AdminEmpty icon="layers" text={t('admin.empty')} /> : (
        <table className="mk-table">
          <thead>
            <tr>
              <th>{t('admin.prod.colModel')}</th>
              <th>SKU</th>
              <th>{t('admin.prod.colCategory')}</th>
              <th>{t('admin.prod.availability')}</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="mk-row" style={{ gap: 12 }}>
                    {p.imageUrl
                      ? <img src={mediaUrl(p.imageUrl)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', flexShrink: 0 }} />
                      : <div style={{ width: 40, height: 40, border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--surface-sunken)', flexShrink: 0 }} />}
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.model}</div>
                      <div className="mk-muted" style={{ fontSize: 12.5 }}>{p.desc}</div>
                    </div>
                  </div>
                </td>
                <td className="mk-mono" style={{ fontSize: 12 }}>{p.sku}</td>
                <td>{catName(p.categoryId ?? p.category?.id)}</td>
                <td style={{ fontSize: 12.5 }}>
                  {t(`avail.${p.availability || 'MADE_TO_ORDER'}`)}
                  {p.leadTimeDays != null && (
                    <span className="mk-mono" style={{ color: 'var(--ink-4)' }}> · {p.leadTimeDays} {t('avail.days')}</span>
                  )}
                </td>
                <RowActions onEdit={() => openEdit(p)} onDelete={() => remove(p)} />
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Labeled label={`${t('admin.prod.variant')} · RU`}><TextInput value={editing.variantRu} onChange={(v) => set('variantRu', v)} /></Labeled>
            <Labeled label={`${t('admin.prod.variant')} · UZ`}><TextInput value={editing.variantUz} onChange={(v) => set('variantUz', v)} /></Labeled>
            <Labeled label={`${t('admin.prod.variant')} · EN`}><TextInput value={editing.variantEn} onChange={(v) => set('variantEn', v)} /></Labeled>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Labeled label={t('admin.prod.category')}>
              <Select value={String(editing.categoryId ?? '')} onChange={(v) => set('categoryId', v)} options={catOptions} />
            </Labeled>
            <Labeled label={t('admin.prod.availability')}>
              <Select value={editing.availability} onChange={(v) => set('availability', v)}
                options={AVAILABILITY.map((a) => ({ value: a, label: t(`avail.${a}`) }))} />
            </Labeled>
            <Labeled label={t('admin.prod.diameter')} hint={t('admin.prod.filterHint')}>
              <NumberInput value={editing.diameter} onChange={(v) => set('diameter', v)} />
            </Labeled>
            <Labeled label={t('admin.prod.accuracy')} hint={t('admin.prod.filterHint')}>
              <TextInput value={editing.accuracy} onChange={(v) => set('accuracy', v)} />
            </Labeled>
            <Labeled label={t('admin.prod.leadTime')}>
              <NumberInput value={editing.leadTimeDays} onChange={(v) => set('leadTimeDays', v)} />
            </Labeled>
          </div>

          {/* Spec rows: pick an already-translated label, then type the value in
              all three languages. */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
            <div className="mk-between" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t('admin.prod.specs')}</h3>
              <LightBtn onClick={addSpec} disabled={specLabels.length === 0}>{t('admin.prod.addSpec')}</LightBtn>
            </div>
            {(editing.specs || []).length === 0 && (
              <div className="mk-muted" style={{ fontSize: 13 }}>{t('admin.prod.noSpecs')}</div>
            )}
            {(editing.specs || []).map((s, i) => (
              <div key={i} className="mk-spec-row">
                <Labeled label={t('admin.prod.specLabel')}>
                  <Select value={String(s.labelId ?? '')} onChange={(v) => setSpec(i, 'labelId', v)} options={labelOptions} />
                </Labeled>
                <Labeled label={`${t('admin.prod.specValue')} · RU`}><TextInput value={s.valueRu} onChange={(v) => setSpec(i, 'valueRu', v)} /></Labeled>
                <Labeled label={`${t('admin.prod.specValue')} · UZ`}><TextInput value={s.valueUz} onChange={(v) => setSpec(i, 'valueUz', v)} /></Labeled>
                <Labeled label={`${t('admin.prod.specValue')} · EN`}><TextInput value={s.valueEn} onChange={(v) => setSpec(i, 'valueEn', v)} /></Labeled>
                <button type="button" className="mk-iconbtn" onClick={() => removeSpec(i)} aria-label={t('admin.delete')}>
                  <Icon name="close" size={15} />
                </button>
              </div>
            ))}
          </div>
          <AdminError message={err} />
        </AdminModal>
      )}
    </div>
  );
}
