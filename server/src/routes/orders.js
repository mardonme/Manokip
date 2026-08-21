import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { optionalUser, requireUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { notifyOrder } from '../lib/telegram.js';
import { findRequestCart } from './cart.js';

const router = Router();

const optionalText = (max) => z.string().trim().max(max).optional();

const orderLineSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(9999).default(1),
});

// Everything is optional in the schema: a signed-in customer may send nothing
// but notes (name/phone fall back to the profile), a guest sends name + phone.
// The real requirement — a name and a reachable phone — is enforced below so
// the error message can say which fallback was missing.
const checkoutSchema = z.object({
  name: optionalText(120),
  phone: optionalText(40),
  email: z.string().trim().max(200).optional(),
  company: optionalText(200),
  notes: optionalText(2000),
  // "Order now" from a product page: these lines are ordered directly and the
  // cart is left untouched. Absent → check out the cart.
  items: z.array(orderLineSchema).min(1).max(50).optional(),
}).strict();

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

/** A phone is usable if it carries enough digits to dial — formatting is free. */
function countDigits(value) {
  return (String(value).match(/\d/g) || []).length;
}

/** Collapse repeated products so "2 × MP-100" arrives as one line. */
function mergeLines(items) {
  const byProduct = new Map();
  for (const { productId, qty } of items) {
    byProduct.set(productId, (byProduct.get(productId) || 0) + qty);
  }
  return byProduct;
}

router.post('/', optionalUser, validate(checkoutSchema), async (req, res, next) => {
  try {
    const body = req.body;
    const name = body.name || req.user?.name || '';
    const phone = body.phone || req.user?.phone || '';
    const email = body.email || req.user?.email || '';
    const company = body.company || req.user?.company || '';

    if (name.length < 2) {
      throw new HttpError(400, 'Name is required', [{ path: 'name', message: 'Enter your name' }]);
    }
    if (countDigits(phone) < 7) {
      throw new HttpError(400, 'A valid phone number is required', [
        { path: 'phone', message: 'Enter a phone number we can call back' },
      ]);
    }
    if (email && !EMAIL_RE.test(email)) {
      throw new HttpError(400, 'Invalid email', [{ path: 'email', message: 'Check the email address' }]);
    }

    // Two sources of lines: a direct "order now" payload, or the cart.
    let lines;
    let cartIdToClear = null;

    if (body.items?.length) {
      const wanted = mergeLines(body.items);
      const products = await prisma.product.findMany({
        where: { id: { in: [...wanted.keys()] } },
        select: { id: true, model: true },
      });
      if (products.length !== wanted.size) throw new HttpError(404, 'Product not found');
      lines = products.map((p) => ({
        productId: p.id,
        qty: wanted.get(p.id),
        productModel: p.model,
      }));
    } else {
      const cart = await findRequestCart(req);
      if (!cart) throw new HttpError(400, 'Cart is empty');
      cartIdToClear = cart.id;
      lines = cart.items.map((it) => ({
        productId: it.productId,
        qty: it.qty,
        productModel: it.product.model,
      }));
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user?.id ?? null,
        contactName: name,
        contactPhone: phone,
        contactEmail: email || null,
        contactCompany: company || null,
        notes: body.notes || null,
        items: { create: lines },
      },
      include: { items: true },
    });

    if (cartIdToClear) {
      await prisma.cartItem.deleteMany({ where: { cartId: cartIdToClear } });
    }

    // Fire-and-forget: a Telegram failure must not break order creation.
    notifyOrder(order).catch(() => {});

    res.status(201).json(order);
  } catch (e) { next(e); }
});

// Order history stays an account feature — a guest gets their number in the
// confirmation and the sales call-back, not a server-side list.
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
