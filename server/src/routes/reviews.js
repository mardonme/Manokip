import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';

const router = Router({ mergeParams: true });

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().min(1).max(4000),
});

router.get('/', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Bad product id' });
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '20', 10) || 20));

    const [total, items, agg] = await Promise.all([
      prisma.review.count({ where: { productId } }),
      prisma.review.findMany({
        where: { productId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.aggregate({ where: { productId }, _avg: { rating: true } }),
    ]);

    res.json({
      items: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        createdAt: r.createdAt,
        author: r.user.name || r.user.email.split('@')[0],
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      avgRating: agg._avg.rating,
    });
  } catch (e) { next(e); }
});

router.post('/', requireUser, validate(reviewSchema), async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Bad product id' });
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new HttpError(404, 'Product not found');

    const dupe = await prisma.review.findUnique({
      where: { productId_userId: { productId, userId: req.user.id } },
    });
    if (dupe) throw new HttpError(409, 'You already reviewed this product');

    const review = await prisma.review.create({
      data: {
        productId,
        userId: req.user.id,
        rating: req.body.rating,
        body: req.body.body,
      },
    });
    res.status(201).json({
      id: review.id,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
      author: req.user.name || req.user.email.split('@')[0],
    });
  } catch (e) { next(e); }
});

export default router;
