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

    const where = {};
    if (req.query.category) {
      where.category = { slug: String(req.query.category) };
    }
    if (req.query.accuracy) {
      where.accuracy = String(req.query.accuracy);
    }
    const minDia = req.query.minDia ? parseInt(req.query.minDia, 10) : null;
    const maxDia = req.query.maxDia ? parseInt(req.query.maxDia, 10) : null;
    if (minDia || maxDia) {
      where.diameter = {};
      if (minDia) where.diameter.gte = minDia;
      if (maxDia) where.diameter.lte = maxDia;
    }
    if (req.query.q) {
      const q = String(req.query.q);
      const ci = { contains: q, mode: 'insensitive' };
      where.OR = [
        { model: ci },
        { descEn: ci },
        { descRu: ci },
        { descUz: ci },
        { sku: ci },
      ];
    }

    // Sort: popular (default), price low→high, price high→low, newest.
    const SORTS = {
      popular: { id: 'asc' },
      price_asc: [{ priceMinor: 'asc' }, { id: 'asc' }],
      price_desc: [{ priceMinor: 'desc' }, { id: 'asc' }],
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
      include: { category: true, _count: { select: { reviews: true } } },
    });
    if (!p) return res.status(404).json({ error: 'Product not found' });
    const agg = await prisma.review.aggregate({
      where: { productId: id },
      _avg: { rating: true },
    });
    res.json(pickProduct({ ...p, avgRating: agg._avg.rating }, lang));
  } catch (e) { next(e); }
});

export default router;
