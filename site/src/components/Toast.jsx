import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((title, message = '', type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title, message, duration) => {
    addToast(title, message, 'success', duration);
  }, [addToast]);

  const error = useCallback((title, message, duration) => {
    addToast(title, message, 'error', duration);
  }, [addToast]);

  const info = useCallback((title, message, duration) => {
    addToast(title, message, 'info', duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info }}>
      {children}
      <div className="mk-toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`mk-toast mk-toast-${toast.type}`} role="status">
            <div className="mk-toast-body">
              <div className="mk-toast-title">{toast.title}</div>
              {toast.message && <div className="mk-toast-message">{toast.message}</div>}
            </div>
            <button
              className="mk-toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
