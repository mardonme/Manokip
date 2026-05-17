import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getLang, setLang as persistLang } from './api.js';
import { t as translate } from './i18n.js';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(getLang());

  const setLang = useCallback((next) => {
    if (next === lang) return;
    persistLang(next);
    setLangState(next);
    // Reload so all server-driven content (categories, product descs) refetches in the new language.
    window.location.reload();
  }, [lang]);

  const t = useCallback((key) => translate(key, lang), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}
