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

// ---------- Spec labels (shared dictionary) ----------
const specLabelSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  labelEn: z.string().min(1).max(200),
  labelRu: z.string().min(1).max(200),
  labelUz: z.string().min(1).max(200),
  sortOrder: z.number().int().optional(),
}).strict();
const specLabelUpdateSchema = specLabelSchema.partial().strict();

router.get('/spec-labels', async (req, res, next) => {
  try {
    const items = await prisma.specLabel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { specs: true } } },
    });
    res.json({ items });
  } catch (e) { next(e); }
});

router.post('/spec-labels', validate(specLabelSchema), async (req, res, next) => {
  try {
    res.status(201).json(await prisma.specLabel.create({ data: req.body }));
  } catch (e) { next(e); }
});

router.patch('/spec-labels/:id', validate(specLabelUpdateSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    res.json(await prisma.specLabel.update({ where: { id }, data: req.body }));
  } catch (e) {
    if (e.code === 'P2025') return next(new HttpError(404, 'Spec label not found'));
    next(e);
  }
});

router.delete('/spec-labels/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const used = await prisma.productSpec.count({ where: { labelId: id } });
    if (used > 0) {
      throw new HttpError(409, `Label is used by ${used} product spec row(s)`);
    }
    await prisma.specLabel.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return next(new HttpError(404, 'Spec label not found'));
    next(e);
  }
});

// ---------- Products ----------
// Spec rows arrive with the product and replace the existing set wholesale —
// simpler for the admin form than diffing individual rows client-side.
const specRowSchema = z.object({
  labelId: z.number().int().positive(),
  valueEn: z.string().min(1).max(400),
  valueRu: z.string().min(1).max(400),
  valueUz: z.string().min(1).max(400),
  sortOrder: z.number().int().optional(),
}).strict();

const productCreateSchema = z.object({
  sku: z.string().min(1).max(120),
  model: z.string().min(1).max(200),
  variantEn: z.string().max(200).nullable().optional(),
  variantRu: z.string().max(200).nullable().optional(),
  variantUz: z.string().max(200).nullable().optional(),
  descEn: z.string().min(1),
  descRu: z.string().min(1),
  descUz: z.string().min(1),
  diameter: z.number().int().nullable().optional(),
  accuracy: z.string().max(80).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  availability: z.enum(['MADE_TO_ORDER', 'IN_STOCK', 'ON_REQUEST']).optional(),
  leadTimeDays: z.number().int().min(0).max(365).nullable().optional(),
  categoryId: z.number().int().positive(),
  specs: z.array(specRowSchema).max(80).optional(),
}).strict();

const productUpdateSchema = productCreateSchema.partial().strict();

const withSpecs = {
  specs: { include: { label: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
  category: true,
};

router.post('/products', validate(productCreateSchema), async (req, res, next) => {
  try {
    const { specs = [], ...data } = req.body;
    const p = await prisma.product.create({
      data: {
        ...data,
        specs: { create: specs.map((s, i) => ({ ...s, sortOrder: s.sortOrder ?? i })) },
      },
      include: withSpecs,
    });
    res.status(201).json(p);
  } catch (e) { next(e); }
});

router.patch('/products/:id', validate(productUpdateSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { specs, ...data } = req.body;
    const p = await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data });
      if (specs) {
        await tx.productSpec.deleteMany({ where: { productId: id } });
        await tx.productSpec.createMany({
          data: specs.map((s, i) => ({ ...s, productId: id, sortOrder: s.sortOrder ?? i })),
        });
      }
      return tx.product.findUnique({ where: { id }, include: withSpecs });
    });
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
  // null = top-level family; otherwise the family this sub-category sits under.
  parentId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
  count: z.number().int().min(0).optional(),
}).strict();
const categoryUpdateSchema = categoryCreateSchema.partial().strict();

// The storefront renders exactly two levels (family → type). Reject anything
// that would nest deeper, point at itself, or give children to a sub-category.
async function assertValidParent(parentId, selfId) {
  if (parentId == null) return;
  if (selfId != null && parentId === selfId) {
    throw new HttpError(400, 'Category cannot be its own parent');
  }
  const parent = await prisma.category.findUnique({ where: { id: parentId } });
  if (!parent) throw new HttpError(400, 'Parent category not found');
  if (parent.parentId != null) {
    throw new HttpError(400, 'Categories nest only two levels deep');
  }
  if (selfId != null) {
    const kids = await prisma.category.count({ where: { parentId: selfId } });
    if (kids > 0) {
      throw new HttpError(400, 'A category with sub-categories cannot itself have a parent');
    }
  }
}

router.post('/categories', validate(categoryCreateSchema), async (req, res, next) => {
  try {
    await assertValidParent(req.body.parentId ?? null, null);
    const c = await prisma.category.create({ data: req.body });
    res.status(201).json(c);
  } catch (e) { next(e); }
});

router.patch('/categories/:id', validate(categoryUpdateSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if ('parentId' in req.body) await assertValidParent(req.body.parentId, id);
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
}).strict();

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
      include: { items: true, user: { select: { id: true, email: true, name: true, phone: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (e) { next(e); }
});

const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'FULFILLED', 'CANCELLED']),
}).strict();

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
