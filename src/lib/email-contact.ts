// Resend dispatcher for the contact-form (Phase 5 plan 05-02; CTA-02).
//
// Two send paths, both fire-and-forget per D-10 (Pitfall 4):
//   sendAdminNotification — English-only template; recipient list comes from
//     ADMIN_NOTIFY_EMAILS env (comma-separated). Empty/unset → silent skip
//     (D-07 + Pitfall 5: Resend rejects empty `to` arrays).
//   sendVisitorAutoReply  — locale-parameterized template; sent to the email
//     the visitor entered.
//
// `fireAdminNotification` / `fireVisitorAutoReply` are the void-returning
// wrappers `submitContactForm` calls AFTER the DB insert commits, so a Resend
// outage never blocks the visitor's ok:true (D-10). Errors caught and reported
// to Sentry; never re-thrown.
//
// `react: <Component .../>` accepts a React element directly; Resend renders
// to HTML server-side via @react-email/render (peer-injected). No need to
// `render()` manually like auth.config.ts does — that pattern only exists
// because Auth.js's Resend provider takes raw HTML.
//
// FROM address: reuse RESEND_FROM_EMAIL (Phase 1 verified domain). Do not
// invent a new env var.

import { Resend } from 'resend';
import * as Sentry from '@sentry/nextjs';
import { env } from '@/env';
import ContactAdminEmail, {
  SUBJECT as ADMIN_SUBJECT,
} from '@/emails/contact-admin';
import ContactAutoReply, {
  SUBJECTS as AUTO_SUBJECTS,
} from '@/emails/contact-auto-reply';

const resend = new Resend(env.AUTH_RESEND_KEY);
const FROM = env.RESEND_FROM_EMAIL;

interface AdminPayload {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  message: string;
  sourcePage: string;
  locale: 'uz' | 'ru' | 'en';
  submittedAt: Date;
}

interface AutoReplyPayload {
  to: string;
  name: string;
  productContext?: string;
  locale: 'uz' | 'ru' | 'en';
}

export async function sendAdminNotification(payload: AdminPayload): Promise<void> {
  // D-07 / Pitfall 5 — empty list = skip. Do NOT call Resend with [] (rejects).
  const recipients = (env.ADMIN_NOTIFY_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) return;

  await resend.emails.send({
    from: FROM,
    to: recipients,
    subject: ADMIN_SUBJECT,
    react: ContactAdminEmail(payload),
  });
}

export async function sendVisitorAutoReply(args: AutoReplyPayload): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: args.to,
    subject: AUTO_SUBJECTS[args.locale],
    react: ContactAutoReply({
      name: args.name,
      productContext: args.productContext,
      locale: args.locale,
    }),
  });
}

// Fire-and-forget wrappers — visitor never waits on Resend (D-10, Pitfall 4).
// `void` annotation tells eslint we deliberately ignore the returned promise;
// `.catch` swallows + Sentry-reports so an outage never throws into the action.
export function fireAdminNotification(payload: AdminPayload): void {
  void sendAdminNotification(payload).catch((e) => {
    Sentry.captureException(e);
  });
}

export function fireVisitorAutoReply(args: AutoReplyPayload): void {
  void sendVisitorAutoReply(args).catch((e) => {
    Sentry.captureException(e);
  });
}
