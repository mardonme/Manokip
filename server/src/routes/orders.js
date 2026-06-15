import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { notifyOrder } from '../lib/telegram.js';

const router = Router();

const checkoutSchema = z.object({
  notes: z.string().max(2000).optional(),
});

router.post('/', requireUser, validate(checkoutSchema), async (req, res, next) => {
  try {
    // The user's authoritative cart
    let cart = await prisma.cart.findFirst({
      where: { userId: req.user.id },
      include: { items: { include: { product: true } } },
    });

    // If they never had one (rare — usually /api/cart creates it on first GET),
    // fall back to the cookie token, attach to user, then proceed.
    if (!cart || cart.items.length === 0) {
      const guestToken = req.cookies?.mk_cart;
      if (guestToken) {
        const guest = await prisma.cart.findUnique({
          where: { token: guestToken },
          include: { items: { include: { product: true } } },
        });
        if (guest && !guest.userId && guest.items.length > 0) {
          cart = guest;
        }
      }
    }

    if (!cart || cart.items.length === 0) {
      throw new HttpError(400, 'Cart is empty');
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        notes: req.body.notes,
        items: {
          create: cart.items.map((it) => ({
            productId: it.productId,
            qty: it.qty,
            priceText: it.product.priceText,
            productModel: it.product.model,
          })),
        },
      },
      include: { items: true },
    });

    // Clear the cart used for this checkout
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Fire-and-forget: a Telegram failure must not break order creation.
    notifyOrder(order, req.user).catch(() => {});

    res.status(201).json(order);
  } catch (e) { next(e); }
});

router.get('/', requireUser, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: orders });
  } catch (e) { next(e); }
});

router.get('/:id', requireUser, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (e) { next(e); }
});

export default router;
