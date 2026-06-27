import { Router } from 'express';
import { prisma } from '../prisma.js';
import { normalizeLang, pickCategory } from '../lib/i18n.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const lang = normalizeLang(req.query.lang);
    const cats = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    // Categories change rarely — let the browser cache them so repeat
    // navigations don't refetch (lang lives in the URL, so each is cached apart).
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ items: cats.map((c) => pickCategory(c, lang)) });
  } catch (e) { next(e); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const lang = normalizeLang(req.query.lang);
    const cat = await prisma.category.findUnique({ where: { slug: req.params.slug } });
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(pickCategory(cat, lang));
  } catch (e) { next(e); }
});

export default router;
