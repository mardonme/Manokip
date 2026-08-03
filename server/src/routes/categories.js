import { Router } from 'express';
import { prisma } from '../prisma.js';
import { normalizeLang, pickCategory } from '../lib/i18n.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const lang = normalizeLang(req.query.lang);
    // ?flat=1 returns every category in one list (the admin category picker
    // needs that); by default the storefront gets families with nested children.
    const flat = String(req.query.flat || '') === '1';
    const cats = await prisma.category.findMany({
      where: flat ? undefined : { parentId: null },
      include: flat ? undefined : { children: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    // Categories change rarely — let the browser cache them so repeat
    // navigations don't refetch (lang lives in the URL, so each is cached apart).
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ items: cats.map((c) => pickCategory(c, lang)) });
  } catch (e) { next(e); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const lang = normalizeLang(req.query.lang);
    const cat = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: { children: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    });
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(pickCategory(cat, lang));
  } catch (e) { next(e); }
});

export default router;
