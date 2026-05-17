// Tiny fetch wrapper for the Manokip backend.
// - Attaches Bearer token from localStorage if present
// - Appends ?lang= to GET requests based on the saved language
// - Always uses credentials: 'include' so the guest cart cookie works

const TOKEN_KEY = 'mk_token';
const LANG_KEY = 'mk_lang';

// In dev: empty string → uses Vite proxy at /api → http://localhost:4000
// In prod: set VITE_API_URL=https://your-render-app.onrender.com
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getLang() {
  return localStorage.getItem(LANG_KEY) || 'ru';
}
export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
}

function buildUrl(path, query) {
  const base = API_BASE || window.location.origin;
  const url = new URL(path, base);
  const lang = getLang();
  if (lang && !url.searchParams.has('lang')) url.searchParams.set('lang', lang);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, v);
    }
  }
  return API_BASE ? url.toString() : url.pathname + url.search;
}

async function request(method, path, { body, query } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export const api = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body) => request('POST', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
};
