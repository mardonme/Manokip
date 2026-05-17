export const LANGS = ['ru', 'uz', 'en'];

export function normalizeLang(raw) {
  const v = String(raw || '').toLowerCase();
  return LANGS.includes(v) ? v : 'ru';
}

export function pickCategory(c, lang) {
  const name = lang === 'ru' ? c.nameRu : lang === 'uz' ? c.nameUz : c.nameEn;
  return {
    id: c.id,
    slug: c.slug,
    name,
    nameEn: c.nameEn,
    nameRu: c.nameRu,
    nameUz: c.nameUz,
    count: c.count,
  };
}

export function pickProduct(p, lang) {
  const desc = lang === 'ru' ? p.descRu : lang === 'uz' ? p.descUz : p.descEn;
  return {
    id: p.id,
    sku: p.sku,
    model: p.model,
    desc,
    descEn: p.descEn,
    descRu: p.descRu,
    descUz: p.descUz,
    range: p.range,
    diameter: p.diameter,
    dia: p.diameter,
    price: p.priceText,
    priceText: p.priceText,
    priceMinor: p.priceMinor,
    accuracy: p.accuracy,
    acc: p.accuracy,
    inStock: p.inStock,
    stockCount: p.stockCount,
    cat: p.category ? (lang === 'ru' ? p.category.nameRu : lang === 'uz' ? p.category.nameUz : p.category.nameEn) : undefined,
    category: p.category ? pickCategory(p.category, lang) : undefined,
    categoryId: p.categoryId,
    reviewsCount: typeof p._count?.reviews === 'number' ? p._count.reviews : undefined,
    avgRating: p.avgRating,
    createdAt: p.createdAt,
  };
}
