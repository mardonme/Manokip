export const LANGS = ['ru', 'uz', 'en'];

export function normalizeLang(raw) {
  const v = String(raw || '').toLowerCase();
  return LANGS.includes(v) ? v : 'ru';
}

const byLang = (lang, ru, uz, en) => (lang === 'ru' ? ru : lang === 'uz' ? uz : en);

export function pickCategory(c, lang) {
  return {
    id: c.id,
    slug: c.slug,
    name: byLang(lang, c.nameRu, c.nameUz, c.nameEn),
    nameEn: c.nameEn,
    nameRu: c.nameRu,
    nameUz: c.nameUz,
    count: c.count,
    sortOrder: c.sortOrder,
    parentId: c.parentId ?? null,
    children: Array.isArray(c.children) ? c.children.map((k) => pickCategory(k, lang)) : undefined,
  };
}

export function pickSpec(s, lang) {
  return {
    id: s.id,
    labelId: s.labelId,
    slug: s.label?.slug,
    label: s.label ? byLang(lang, s.label.labelRu, s.label.labelUz, s.label.labelEn) : undefined,
    labelEn: s.label?.labelEn,
    labelRu: s.label?.labelRu,
    labelUz: s.label?.labelUz,
    value: byLang(lang, s.valueRu, s.valueUz, s.valueEn),
    valueEn: s.valueEn,
    valueRu: s.valueRu,
    valueUz: s.valueUz,
    sortOrder: s.sortOrder,
  };
}

export function pickProduct(p, lang) {
  return {
    id: p.id,
    sku: p.sku,
    model: p.model,
    variant: byLang(lang, p.variantRu, p.variantUz, p.variantEn) || null,
    variantEn: p.variantEn,
    variantRu: p.variantRu,
    variantUz: p.variantUz,
    desc: byLang(lang, p.descRu, p.descUz, p.descEn),
    descEn: p.descEn,
    descRu: p.descRu,
    descUz: p.descUz,
    diameter: p.diameter,
    dia: p.diameter,
    accuracy: p.accuracy,
    acc: p.accuracy,
    imageUrl: p.imageUrl,
    availability: p.availability,
    leadTimeDays: p.leadTimeDays,
    specs: Array.isArray(p.specs) ? p.specs.map((s) => pickSpec(s, lang)) : undefined,
    cat: p.category ? byLang(lang, p.category.nameRu, p.category.nameUz, p.category.nameEn) : undefined,
    category: p.category ? pickCategory(p.category, lang) : undefined,
    categoryId: p.categoryId,
    reviewsCount: typeof p._count?.reviews === 'number' ? p._count.reviews : undefined,
    avgRating: p.avgRating,
    createdAt: p.createdAt,
  };
}
