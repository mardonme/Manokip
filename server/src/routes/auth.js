import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import { validate } from '../middleware/validate.js';
import { requireUser } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(200),
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional(),
  company: z.string().max(200).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    company: u.company,
    role: u.role,
    createdAt: u.createdAt,
  };
}

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name, phone, company } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'Email already registered');
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, phone, company },
    });
    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, 'Invalid credentials');
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');
    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});

router.get('/me', requireUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
