import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../prisma.js';
import { HttpError } from './error.js';

async function attach(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function optionalUser(req, res, next) {
  req.user = await attach(req);
  next();
}

export async function requireUser(req, res, next) {
  const user = await attach(req);
  if (!user) return next(new HttpError(401, 'Authentication required'));
  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new HttpError(403, 'Admin only'));
  }
  next();
}
