import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireUser, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.use(requireUser, requireAdmin);

// ---------- Image uploads ----------
// Files land in server/uploads and are served statically at /uploads (see index.js).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
  'image/gif': '.gif', 'image/avif': '.avif',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype] || '.jpg';
      cb(null, crypto.randomBytes(12).toString('hex') + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Unsupported image type (use JPG, PNG, WebP, GIF or AVIF)'));
  },
});

router.post('/uploads', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const msg = err instanceof multer.MulterError
        ? (err.code === 'LIMIT_FILE_SIZE' ? 'Image too large (max 5 MB)' : err.message)
        : (err.message || 'Upload failed');
      return next(new HttpError(400, msg));
    }
    if (!req.file) return next(new HttpError(400, 'No file uploaded'));
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// ---------- Products ----------
const productCreateSchema = z.object({
  sku: z.string().min(1).max(120),
  model: z.string().min(1).max(120),
  descEn: z.string().min(1),
  descRu: z.string().min(1),
  descUz: z.string().min(1),
  range: z.string().min(1).max(120),
  diameter: z.number().int().nullable().optional(),
  priceText: z.string().min(1).max(80),
  priceMinor: z.number().int().nullable().optional(),
  accuracy: z.string().max(40).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  inStock: z.boolean().optional(),
  stockCount: z.number().int().min(0).optional(),
  categoryId: z.number().int().positive(),
});

const productUpdateSchema = productCreateSchema.partial();

router.post('/products', validate(productCreateSchema), async (req, res, next) => {
  try {
    const p = await prisma.product.create({ data: req.body });
    res.status(201).json(p);
  } catch (e) { next(e); }
});

router.patch('/products/:id', validate(productUpdateSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const p = await prisma.product.update({ where: { id }, data: req.body });
    res.json(p);
  } catch (e) {
    if (e.code === 'P2025') return next(new HttpError(404, 'Product not found'));
    next(e);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.product.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return next(new HttpError(404, 'Product not found'));
    next(e);
  }
});

// ---------- Categories ----------
const categoryCreateSchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  nameEn: z.string().min(1),
  nameRu: z.string().min(1),
  nameUz: z.string().min(1),
  count: z.number().int().min(0).optional(),
});
const categoryUpdateSchema = categoryCreateSchema.partial();

router.post('/categories', validate(categoryCreateSchema), async (req, res, next) => {
  try {
    const c = await prisma.category.create({ data: req.body });
    res.status(201).json(c);
  } catch (e) { next(e); }
});

router.patch('/categories/:id', validate(categoryUpdateSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const c = await prisma.category.update({ where: { id }, data: req.body });
    res.json(c);
  } catch (e) {
    if (e.code === 'P2025') return next(new HttpError(404, 'Category not found'));
    next(e);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.category.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2003') return next(new HttpError(409, 'Category has products'));
    if (e.code === 'P2025') return next(new HttpError(404, 'Category not found'));
    next(e);
  }
});

// ---------- Quotes ----------
router.get('/quotes', async (req, res, next) => {
  try {
    const items = await prisma.quoteRequest.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ items });
  } catch (e) { next(e); }
});

const quoteStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'closed']),
});

router.patch('/quotes/:id', validate(quoteStatusSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const q = await prisma.quoteRequest.update({ where: { id }, data: { status: req.body.status } });
    res.json(q);
  } catch (e) {
    if (e.code === 'P2025') return next(new HttpError(404, 'Quote not found'));
    next(e);
  }
});

// ---------- Orders ----------
router.get('/orders', async (req, res, next) => {
  try {
    const items = await prisma.order.findMany({
      include: { items: true, user: { select: { id: true, email: true, name: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (e) { next(e); }
});

const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'FULFILLED', 'CANCELLED']),
});

router.patch('/orders/:id', validate(orderStatusSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const o = await prisma.order.update({ where: { id }, data: { status: req.body.status } });
    res.json(o);
  } catch (e) {
    if (e.code === 'P2025') return next(new HttpError(404, 'Order not found'));
    next(e);
  }
});

export default router;
