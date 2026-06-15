import 'dotenv/config';

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Telegram admin notifications (so'rovnoma / zakaz). Optional — when BOT_TOKEN
  // is unset, notifications are silently skipped.
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID || '',
  // Set TELEGRAM_POLLING=false to disable the /start chat-id helper bot loop.
  TELEGRAM_POLLING: process.env.TELEGRAM_POLLING !== 'false',
  // Google Gemini AI assistant. When GEMINI_API_KEY is unset, the /api/chat
  // endpoint degrades gracefully to an "operator" fallback.
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};
