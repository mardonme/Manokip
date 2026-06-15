import { env } from '../env.js';

const API_BASE = env.BOT_TOKEN
  ? `https://api.telegram.org/bot${env.BOT_TOKEN}`
  : null;

/**
 * Telegram bot notifications.
 *
 * Sending is intentionally best-effort: every public function swallows its own
 * errors and only logs them, so a Telegram outage (or a misconfigured token /
 * chat id) can never break order or quote creation. Callers fire-and-forget.
 */

// Telegram uses HTML parse mode here, so user-supplied text must be escaped to
// avoid breaking the markup (or injecting tags).
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Low-level send to a specific chat. Never throws.
 * @returns {Promise<boolean>} true when Telegram accepted the message.
 */
async function sendToChat(chatId, text) {
  if (!API_BASE) {
    console.warn('[telegram] BOT_TOKEN not set — skipping notification');
    return false;
  }
  if (!chatId) {
    console.warn('[telegram] no chat id — skipping notification');
    return false;
  }
  try {
    const resp = await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error(`[telegram] sendMessage failed (${resp.status}): ${body}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[telegram] sendMessage error:', e?.message || e);
    return false;
  }
}

/**
 * Send a notification to the configured admin chat. Never throws.
 */
export async function sendAdminMessage(text) {
  return sendToChat(env.ADMIN_CHAT_ID, text);
}

/** Format and send a new quote request (so'rovnoma) notification. */
export async function notifyQuoteRequest(quote) {
  const lines = [
    '🆕 <b>Yangi so\'rovnoma</b> (Quote request)',
    '',
    `🏢 <b>Kompaniya:</b> ${escapeHtml(quote.companyName)}`,
    `👤 <b>Kontakt:</b> ${escapeHtml(quote.contactPerson)}`,
    `✉️ <b>Email:</b> ${escapeHtml(quote.email)}`,
  ];
  if (quote.phone) lines.push(`📞 <b>Telefon:</b> ${escapeHtml(quote.phone)}`);
  if (quote.industry) lines.push(`🏭 <b>Soha:</b> ${escapeHtml(quote.industry)}`);
  lines.push('', '📝 <b>Talablar:</b>', escapeHtml(quote.specs));
  lines.push('', `🆔 #${quote.id}`);
  return sendAdminMessage(lines.join('\n'));
}

/**
 * Format and send an AI-assistant operator hand-off (the bot could not help, or
 * the visitor asked for a human). Best-effort like the rest of this module.
 * @param {object} lead { question, name, phone, lang }
 */
export async function notifyOperatorLead(lead) {
  const lines = [
    '🤖➡️🧑 <b>AI yordamchi — operator soʻrovi</b>',
    '',
    `❓ <b>Savol:</b> ${escapeHtml(lead.question)}`,
  ];
  if (lead.name) lines.push(`👤 <b>Ism:</b> ${escapeHtml(lead.name)}`);
  if (lead.phone) lines.push(`📞 <b>Telefon:</b> ${escapeHtml(lead.phone)}`);
  if (lead.lang) lines.push(`🌐 <b>Til:</b> ${escapeHtml(lead.lang)}`);
  return sendAdminMessage(lines.join('\n'));
}

/**
 * Format and send a new order (zakaz) notification.
 * @param {object} order  Prisma order with `items` included.
 * @param {object} [user] Optional user (email/name/phone/company) for context.
 */
export async function notifyOrder(order, user) {
  const lines = [
    '🛒 <b>Yangi buyurtma</b> (Order)',
    '',
    `🆔 <b>Buyurtma:</b> #${order.id}`,
  ];
  if (user) {
    lines.push(`👤 <b>Mijoz:</b> ${escapeHtml(user.name || user.email)}`);
    lines.push(`✉️ <b>Email:</b> ${escapeHtml(user.email)}`);
    if (user.phone) lines.push(`📞 <b>Telefon:</b> ${escapeHtml(user.phone)}`);
    if (user.company) lines.push(`🏢 <b>Kompaniya:</b> ${escapeHtml(user.company)}`);
  }
  if (order.notes) lines.push('', `📝 <b>Izoh:</b> ${escapeHtml(order.notes)}`);

  const items = order.items || [];
  if (items.length) {
    lines.push('', '<b>Mahsulotlar:</b>');
    for (const it of items) {
      lines.push(
        `• ${escapeHtml(it.productModel)} × ${it.qty} — ${escapeHtml(it.priceText)}`,
      );
    }
  }
  return sendAdminMessage(lines.join('\n'));
}

/**
 * Long-poll for bot updates so an admin can DM /start and get the chat id to
 * paste into ADMIN_CHAT_ID. Lightweight; runs only when a token is present.
 * Never throws — on any error it backs off and retries.
 */
export function startTelegramPolling() {
  if (!API_BASE) {
    console.warn('[telegram] BOT_TOKEN not set — bot polling disabled');
    return;
  }
  if (env.TELEGRAM_POLLING === false) {
    console.log('[telegram] polling disabled via TELEGRAM_POLLING=false');
    return;
  }

  let offset = 0;
  let stopped = false;

  async function loop() {
    while (!stopped) {
      try {
        const resp = await fetch(
          `${API_BASE}/getUpdates?timeout=30&offset=${offset}`,
          { method: 'GET' },
        );
        if (!resp.ok) {
          // 409 = another getUpdates/webhook is active; back off and retry.
          await sleep(5000);
          continue;
        }
        const data = await resp.json();
        for (const update of data.result || []) {
          offset = update.update_id + 1;
          await handleUpdate(update);
        }
      } catch (e) {
        console.error('[telegram] polling error:', e?.message || e);
        await sleep(5000);
      }
    }
  }

  async function handleUpdate(update) {
    const msg = update.message;
    if (!msg || !msg.text) return;
    const chatId = msg.chat?.id;
    const text = msg.text.trim();
    if (text === '/start' || text.startsWith('/start') || text === '/chatid') {
      await sendToChat(
        chatId,
        [
          '👋 Salom! Bu Mardin admin xabarnoma boti.',
          '',
          'Sizning chat ID:',
          `<code>${escapeHtml(chatId)}</code>`,
          '',
          'Buni server <code>.env</code> faylidagi <code>ADMIN_CHAT_ID</code> ga qo\'ying va serverni qayta ishga tushiring.',
        ].join('\n'),
      );
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  loop();
  console.log('[telegram] bot polling started (send /start to the bot to get your chat id)');
}
