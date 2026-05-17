import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const quoteSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactPerson: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal('')),
  industry: z.string().max(80).optional().or(z.literal('')),
  specs: z.string().min(1).max(8000),
});

router.post('/', validate(quoteSchema), async (req, res, next) => {
  try {
    const q = await prisma.quoteRequest.create({
      data: {
        companyName: req.body.companyName,
        contactPerson: req.body.contactPerson,
        email: req.body.email,
        phone: req.body.phone || null,
        industry: req.body.industry || null,
        specs: req.body.specs,
      },
    });
    res.status(201).json({ id: q.id, createdAt: q.createdAt });
  } catch (e) { next(e); }
});

export default router;
