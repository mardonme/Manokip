import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const { user, openSignIn } = useAuth();

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/api/cart');
      setCart(data);
    } catch {
      setCart({ items: [], count: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // When user signs in, ask the server to merge the guest cart in.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const merged = await api.post('/api/cart/merge', {});
        setCart(merged);
      } catch {
        refresh();
      }
    })();
  }, [user, refresh]);

  const add = useCallback(async (productId, qty = 1) => {
    const data = await api.post('/api/cart/items', { productId, qty });
    setCart(data);
  }, []);

  const update = useCallback(async (productId, qty) => {
    const data = await api.patch(`/api/cart/items/${productId}`, { qty });
    setCart(data);
  }, []);

  const remove = useCallback(async (productId) => {
    const data = await api.delete(`/api/cart/items/${productId}`);
    setCart(data);
  }, []);

  const checkout = useCallback(async (notes) => {
    try {
      const order = await api.post('/api/orders', { notes });
      await refresh();
      return { ok: true, order };
    } catch (e) {
      if (e.status === 401) {
        openSignIn();
        return { ok: false, needsSignIn: true };
      }
      throw e;
    }
  }, [refresh, openSignIn]);

  return (
    <CartContext.Provider value={{ cart, loading, add, update, remove, checkout, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
