import { Router } from 'express';
import { prisma } from '../prisma.js';
import { normalizeLang, pickProduct } from '../lib/i18n.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const lang = normalizeLang(req.query.lang);
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1);
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit ?? '24', 10) || 24));
    const skip = (page - 1) * limit;

    // Conditions go into AND so the category and search clauses, which both use
    // OR internally, can't overwrite each other.
    const and = [];
    if (req.query.category) {
      const slug = String(req.query.category);
      // A family slug must also match products filed under its sub-categories.
      and.push({ OR: [{ category: { slug } }, { category: { parent: { slug } } }] });
    }
    if (req.query.accuracy) {
      and.push({ accuracy: String(req.query.accuracy) });
    }
    const minDia = req.query.minDia ? parseInt(req.query.minDia, 10) : null;
    const maxDia = req.query.maxDia ? parseInt(req.query.maxDia, 10) : null;
    if (minDia || maxDia) {
      const diameter = {};
      if (minDia) diameter.gte = minDia;
      if (maxDia) diameter.lte = maxDia;
      and.push({ diameter });
    }
    if (req.query.q) {
      const ci = { contains: String(req.query.q), mode: 'insensitive' };
      and.push({
        OR: [
          { model: ci }, { sku: ci },
          { descEn: ci }, { descRu: ci }, { descUz: ci },
          { variantEn: ci }, { variantRu: ci }, { variantUz: ci },
        ],
      });
    }
    const where = and.length ? { AND: and } : {};

    // The catalogue carries no prices, so sorting is by listing order, model
    // name or recency.
    const SORTS = {
      popular: { id: 'asc' },
      model_asc: [{ model: 'asc' }, { id: 'asc' }],
      model_desc: [{ model: 'desc' }, { id: 'asc' }],
      newest: { createdAt: 'desc' },
    };
    const orderBy = SORTS[String(req.query.sort)] || SORTS.popular;

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { category: true, _count: { select: { reviews: true } } },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    // Short browser cache for product listings; admin edits surface within a minute.
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({
      items: items.map((p) => pickProduct(p, lang)),
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const lang = normalizeLang(req.query.lang);
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Bad id' });
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        // Specs are only loaded here, not in the listing — 28 products carry
        // ~470 spec rows between them and the grid never shows them.
        specs: { include: { label: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        category: { include: { parent: true } },
        _count: { select: { reviews: true } },
      },
    });
    if (!p) return res.status(404).json({ error: 'Product not found' });
    const agg = await prisma.review.aggregate({
      where: { productId: id },
      _avg: { rating: true },
    });
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(pickProduct({ ...p, avgRating: agg._avg.rating }, lang));
  } catch (e) { next(e); }
});

export default router;
