// Ordering without an account.
//
// The storefront takes an order from a name and a phone number alone, so those
// two values are the only thing worth keeping — locally, in this browser, so a
// returning visitor never retypes them. Nothing here talks to the server; the
// account (and the server-side order history it unlocks) stays optional.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { isPhoneComplete } from './phone.js';

const CONTACT_KEY = 'mk_contact';
const ORDERS_KEY = 'mk_recent_orders';
const MAX_LOCAL_ORDERS = 10;

const EMPTY_CONTACT = { name: '', phone: '', email: '', company: '' };

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback; // private mode / storage disabled — degrade to "no memory"
  }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function readContact() {
  const saved = readJson(CONTACT_KEY, null);
  return saved && typeof saved === 'object' ? { ...EMPTY_CONTACT, ...saved } : { ...EMPTY_CONTACT };
}

export function saveContact(contact) {
  writeJson(CONTACT_KEY, {
    name: (contact.name || '').trim(),
    phone: (contact.phone || '').trim(),
    email: (contact.email || '').trim(),
    company: (contact.company || '').trim(),
  });
}

/**
 * A phone we can actually ring back: a complete Uzbek number (9 national
 * digits) or a plausible international one. See lib/phone.js for the rules.
 */
export function isPhoneValid(value) {
  return isPhoneComplete(value);
}

export function isNameValid(value) {
  return String(value || '').trim().length >= 2;
}

/**
 * Keep a slim copy of what was just ordered, so a guest can reopen /orders and
 * still see their request number instead of an empty "sign in" wall.
 */
export function rememberOrder(order) {
  if (!order?.id) return;
  const entry = {
    id: order.id,
    createdAt: order.createdAt || new Date().toISOString(),
    status: order.status || 'PENDING',
    notes: order.notes || null,
    items: (order.items || []).map((it) => ({ productModel: it.productModel, qty: it.qty })),
  };
  const list = readJson(ORDERS_KEY, []).filter((o) => o?.id !== entry.id);
  writeJson(ORDERS_KEY, [entry, ...list].slice(0, MAX_LOCAL_ORDERS));
}

export function readRecentOrders() {
  const list = readJson(ORDERS_KEY, []);
  return Array.isArray(list) ? list.filter((o) => o && o.id) : [];
}

/**
 * Contact-form state for every order surface (cart, quick order, contact page).
 * Seeded from the last order and topped up from the profile once auth resolves,
 * so a signed-in customer sees their details already filled in.
 */
export function useOrderContact() {
  const { user } = useAuth();
  const [contact, setContact] = useState(readContact);

  useEffect(() => {
    if (!user) return;
    setContact((c) => ({
      name: c.name || user.name || '',
      phone: c.phone || user.phone || '',
      email: c.email || user.email || '',
      company: c.company || user.company || '',
    }));
  }, [user]);

  const set = useCallback((key, value) => {
    setContact((c) => ({ ...c, [key]: value }));
  }, []);

  return { contact, set, setContact };
}

/**
 * Turn an API failure into per-field form errors.
 *
 * The server answers validation problems with `{ error, details:[{path,message}] }`
 * in English; the storefront is not, so nothing from the server is ever shown
 * raw — every case maps onto a translated message, and onto the field that
 * caused it whenever the server says which one.
 */
export function orderErrorToFields(err, t) {
  if (!err) return { form: t('order.err.generic') };
  // fetch() itself failed (offline, DNS, CORS) — no HTTP status was reached.
  if (err.status === undefined) return { form: t('order.err.network') };
  if (err.status === 429) return { form: t('order.err.tooMany') };

  const fields = {};
  for (const detail of Array.isArray(err.details) ? err.details : []) {
    const key = String(detail.path || '').split('.')[0];
    if (key === 'name' || key === 'contactPerson') fields.name = t('order.err.name');
    else if (key === 'phone') fields.phone = t('order.err.phone');
    else if (key === 'email') fields.email = t('order.err.email');
    else if (key === 'specs') fields.message = t('contact.form.err.message');
  }
  if (Object.keys(fields).length) return fields;

  const message = String(err.message || '');
  if (/cart is empty/i.test(message)) return { form: t('order.err.emptyCart') };
  if (/product not found/i.test(message)) return { form: t('order.err.product') };
  if (/name/i.test(message)) return { name: t('order.err.name') };
  if (/phone/i.test(message)) return { phone: t('order.err.phone') };
  if (/email/i.test(message)) return { email: t('order.err.email') };
  return { form: t('order.err.generic') };
}

/** Put the cursor on the first field that failed, so the fix is one keystroke away. */
export function focusFirstError(idPrefix, errors) {
  const first = ['name', 'phone', 'email', 'company', 'message'].find((k) => errors?.[k]);
  if (!first) return;
  const el = document.getElementById(`${idPrefix}-${first}`);
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
