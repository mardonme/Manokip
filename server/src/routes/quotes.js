import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { notifyQuoteRequest } from '../lib/telegram.js';

const router = Router();

// A request costs the visitor two fields: who to ask for and what to dial.
// Company and email stay in the form but never block sending.
const quoteSchema = z.object({
  companyName: z.string().trim().max(200).optional().or(z.literal('')),
  contactPerson: z.string().trim().min(2).max(200),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(40).refine(
    (v) => (v.match(/\d/g) || []).length >= 7,
    'Enter a phone number we can call back',
  ),
  industry: z.string().trim().max(80).optional().or(z.literal('')),
  specs: z.string().trim().min(1).max(8000),
});

router.post('/', validate(quoteSchema), async (req, res, next) => {
  try {
    const q = await prisma.quoteRequest.create({
      data: {
        companyName: req.body.companyName || null,
        contactPerson: req.body.contactPerson,
        email: req.body.email || null,
        phone: req.body.phone,
        industry: req.body.industry || null,
        specs: req.body.specs,
      },
    });
    // Fire-and-forget: a Telegram failure must not break quote creation.
    notifyQuoteRequest(q).catch(() => {});
    res.status(201).json({ id: q.id, createdAt: q.createdAt });
  } catch (e) { next(e); }
});

export default router;
