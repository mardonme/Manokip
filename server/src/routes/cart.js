import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../prisma.js';
import { optionalUser, requireUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';
import { env } from '../env.js';

const router = Router();

const COOKIE = 'mk_cart';
const isProd = env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

function genToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Resolve the cart for the current request.
// - If the user is signed in: use/create the user-owned cart and merge any guest cart.
// - Else: use/create a cart bound to the cookie token.
async function resolveCart(req, res) {
  if (req.user) {
    // Ensure user has a cart
    let cart = await prisma.cart.findFirst({ where: { userId: req.user.id } });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { token: genToken(), userId: req.user.id },
      });
    }

    // If there's a guest cart cookie, merge it in
    const guestToken = req.cookies?.[COOKIE];
    if (guestToken && guestToken !== cart.token) {
      const guest = await prisma.cart.findUnique({
        where: { token: guestToken },
        include: { items: true },
      });
      if (guest && guest.id !== cart.id && !guest.userId) {
        await mergeCarts(guest.id, cart.id);
      }
      // After merging, the user cart's token is canonical
      res.clearCookie(COOKIE);
    }
    return cart.id;
  }

  // Guest path
  let token = req.cookies?.[COOKIE];
  let cart = token ? await prisma.cart.findUnique({ where: { token } }) : null;
  if (!cart) {
    token = genToken();
    cart = await prisma.cart.create({ data: { token } });
    res.cookie(COOKIE, token, COOKIE_OPTS);
  }
  return cart.id;
}

async function mergeCarts(fromId, toId) {
  const fromItems = await prisma.cartItem.findMany({ where: { cartId: fromId } });
  for (const item of fromItems) {
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: toId, productId: item.productId } },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: existing.qty + item.qty },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: toId, productId: item.productId, qty: item.qty },
      });
    }
  }
  await prisma.cart.delete({ where: { id: fromId } });
}

async function loadCartView(cartId) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: { include: { category: true } },
        },
        orderBy: { id: 'asc' },
      },
    },
  });
  if (!cart) return { items: [], total: 0, count: 0 };
  return {
    id: cart.id,
    items: cart.items.map((it) => ({
      productId: it.productId,
      qty: it.qty,
      model: it.product.model,
      desc: it.product.descEn,
      range: it.product.range,
      diameter: it.product.diameter,
      priceText: it.product.priceText,
      priceMinor: it.product.priceMinor,
      sku: it.product.sku,
      categoryName: it.product.category?.nameEn,
    })),
    count: cart.items.reduce((n, it) => n + it.qty, 0),
  };
}

router.get('/', optionalUser, async (req, res, next) => {
  try {
    const cartId = await resolveCart(req, res);
    const view = await loadCartView(cartId);
    res.json(view);
  } catch (e) { next(e); }
});

const addSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(9999).default(1),
});

router.post('/items', optionalUser, validate(addSchema), async (req, res, next) => {
  try {
    const { productId, qty } = req.body;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new HttpError(404, 'Product not found');
    const cartId = await resolveCart(req, res);

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: existing.qty + qty },
      });
    } else {
      await prisma.cartItem.create({ data: { cartId, productId, qty } });
    }

    const view = await loadCartView(cartId);
    res.status(201).json(view);
  } catch (e) { next(e); }
});

const patchSchema = z.object({ qty: z.number().int().min(0).max(9999) });

router.patch('/items/:productId', optionalUser, validate(patchSchema), async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const cartId = await resolveCart(req, res);
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
    if (!existing) throw new HttpError(404, 'Item not in cart');
    if (req.body.qty === 0) {
      await prisma.cartItem.delete({ where: { id: existing.id } });
    } else {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: req.body.qty } });
    }
    const view = await loadCartView(cartId);
    res.json(view);
  } catch (e) { next(e); }
});

router.delete('/items/:productId', optionalUser, async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const cartId = await resolveCart(req, res);
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
    if (existing) await prisma.cartItem.delete({ where: { id: existing.id } });
    const view = await loadCartView(cartId);
    res.json(view);
  } catch (e) { next(e); }
});

// Called by the frontend right after sign-in to merge the guest cart in.
router.post('/merge', requireUser, async (req, res, next) => {
  try {
    const cartId = await resolveCart(req, res); // handles merge internally
    const view = await loadCartView(cartId);
    res.json(view);
  } catch (e) { next(e); }
});

export default router;
