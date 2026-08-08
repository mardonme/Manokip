import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// The saved list is ids-only over the wire: the client renders the products
// through GET /api/products?ids=…, the same code path guests use for their
// localStorage list, so both states share one renderer and one translation.
async function listIds(userId) {
  const rows = await prisma.savedItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { productId: true },
  });
  return rows.map((r) => r.productId);
}

router.get('/', requireUser, async (req, res, next) => {
  try {
    res.json({ ids: await listIds(req.user.id) });
  } catch (e) { next(e); }
});

router.put('/:productId', requireUser, async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Bad id' });
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await prisma.savedItem.upsert({
      where: { userId_productId: { userId: req.user.id, productId } },
      update: {},
      create: { userId: req.user.id, productId },
    });
    res.json({ ids: await listIds(req.user.id) });
  } catch (e) { next(e); }
});

router.delete('/:productId', requireUser, async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Bad id' });
    await prisma.savedItem.deleteMany({ where: { userId: req.user.id, productId } });
    res.json({ ids: await listIds(req.user.id) });
  } catch (e) { next(e); }
});

const mergeSchema = z.object({
  productIds: z.array(z.number().int().positive()).max(500).default([]),
}).strict();

// Called by the frontend right after sign-in with the guest localStorage list.
// Ids that no longer exist in the catalog are silently dropped.
router.post('/merge', requireUser, validate(mergeSchema), async (req, res, next) => {
  try {
    const wanted = [...new Set(req.body.productIds)];
    if (wanted.length) {
      const existing = await prisma.product.findMany({
        where: { id: { in: wanted } },
        select: { id: true },
      });
      await prisma.savedItem.createMany({
        data: existing.map((p) => ({ userId: req.user.id, productId: p.id })),
        skipDuplicates: true,
      });
    }
    res.json({ ids: await listIds(req.user.id) });
  } catch (e) { next(e); }
});

export default router;
