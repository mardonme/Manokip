import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { askAssistant } from '../lib/ai.js';
import { notifyOperatorLead } from '../lib/telegram.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  lang: z.enum(['ru', 'uz', 'en']).optional(),
  // Recent conversation turns for context. Capped to keep token cost bounded.
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().max(4000),
      }),
    )
    .max(12)
    .optional(),
  // Optional contact: when present and the AI needs a human, we send a lead.
  contact: z
    .object({
      name: z.string().max(120).optional().or(z.literal('')),
      phone: z.string().max(40).optional().or(z.literal('')),
    })
    .optional(),
});

router.post('/', validate(chatSchema), async (req, res, next) => {
  try {
    const { message, history, lang, contact } = req.body;

    const { reply, needsOperator } = await askAssistant({ message, history, lang });

    // If the assistant wants a human and the visitor left contact details,
    // fire a best-effort lead to the operator (Telegram). Never blocks the reply.
    let leadSent = false;
    if (needsOperator && contact && (contact.name || contact.phone)) {
      leadSent = true;
      notifyOperatorLead({
        question: message,
        name: contact.name,
        phone: contact.phone,
        lang,
      }).catch(() => {});
    }

    res.json({ reply, needsOperator, leadSent });
  } catch (e) {
    next(e);
  }
});

export default router;
