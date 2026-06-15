import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './env.js';
import { notFound, errorHandler } from './middleware/error.js';
import { startTelegramPolling } from './lib/telegram.js';

import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import categoriesRoutes from './routes/categories.js';
import reviewsRoutes from './routes/reviews.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import quotesRoutes from './routes/quotes.js';
import chatRoutes from './routes/chat.js';
import adminRoutes, { UPLOAD_DIR } from './routes/admin.js';

const app = express();

app.disable('x-powered-by');
// Render (and most PaaS) terminate TLS at a proxy; trust it so req.secure
// and Secure cookies behave correctly.
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Mild rate limiting on write-heavy / auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
// Chat is AI-token-bearing, so keep it tighter to curb abuse.
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 15 });

// Uploaded product images. CORP cross-origin so the storefront can embed them
// when it runs on a different origin (VITE_API_URL) than the API.
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '7d',
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/products/:id/reviews', reviewsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/cart', writeLimiter, cartRoutes);
app.use('/api/orders', writeLimiter, ordersRoutes);
app.use('/api/quotes', writeLimiter, quotesRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[manokip-server] listening on http://localhost:${env.PORT}`);
  // Lightweight long-poll so an admin can DM the bot /start to obtain the
  // chat id needed for ADMIN_CHAT_ID. No-op when BOT_TOKEN is unset.
  startTelegramPolling();
});
