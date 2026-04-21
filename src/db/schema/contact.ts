// Contact form submissions — no translations sibling; messages are stored
// as-received in whichever language the visitor typed.
// sourcePage records the URL the visitor submitted from (CTA-03 Phase 5).
import { pgTable, bigserial, text, timestamp } from 'drizzle-orm/pg-core';

export const contactSubmissions = pgTable('contact_submission', {
  id: bigserial({ mode: 'bigint' }).primaryKey(),
  name: text(),
  company: text(),
  email: text(),
  phone: text(),
  message: text().notNull(),
  locale: text(),
  sourcePage: text('source_page'),
  submittedAt: timestamp('submitted_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp('read_at', { withTimezone: true }),
});
