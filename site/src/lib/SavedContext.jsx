import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api } from './api.js';
import { useAuth } from './AuthContext.jsx';

// Saved-products list. Guests keep it in localStorage (instant, survives the
// session); signed-in users keep it on the server. Right after sign-in the
// guest list is merged into the account and the local copy cleared, so the
// list follows the user across devices from then on.

const KEY = 'mk_saved';
const SavedContext = createContext(null);

function readLocal() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
}

function writeLocal(ids) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* private mode */ }
}

export function SavedProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [ids, setIds] = useState(readLocal);

  // Effects and toggle() need the latest list without re-binding callbacks.
  const idsRef = useRef(ids);
  useEffect(() => { idsRef.current = ids; });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIds(readLocal()); return; }
    let cancelled = false;
    (async () => {
      try {
        const guest = readLocal();
        // Merge is idempotent server-side, so a StrictMode double-run is harmless.
        const data = guest.length
          ? await api.post('/api/saved/merge', { productIds: guest })
          : await api.get('/api/saved');
        if (cancelled) return;
        if (guest.length) writeLocal([]);
        setIds(data.ids || []);
      } catch {
        // API unreachable — keep the current list; the next toggle retries.
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  // Toggles optimistically and returns the new state (true = now saved).
  // Reverts and rethrows if the server rejects the change.
  const toggle = useCallback(async (productId) => {
    const prev = idsRef.current;
    const wasSaved = prev.includes(productId);
    const next = wasSaved ? prev.filter((x) => x !== productId) : [productId, ...prev];
    setIds(next);
    if (!user) {
      writeLocal(next);
      return !wasSaved;
    }
    try {
      const data = wasSaved
        ? await api.delete(`/api/saved/${productId}`)
        : await api.put(`/api/saved/${productId}`, {});
      setIds(data.ids || next);
      return !wasSaved;
    } catch (e) {
      setIds(prev);
      throw e;
    }
  }, [user]);

  const isSaved = useCallback((productId) => ids.includes(productId), [ids]);

  return (
    <SavedContext.Provider value={{ ids, count: ids.length, isSaved, toggle }}>
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used inside SavedProvider');
  return ctx;
}
