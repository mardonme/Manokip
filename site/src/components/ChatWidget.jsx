import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLang } from '../lib/LangContext.jsx';
import { sendChatMessage } from '../lib/api.js';

const BLUE = '#1240e5';
const DARK = '#14161b';
const DIM = '#74777e';
const LINE = '#e5e1d8';

export default function ChatWidget() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', text}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contact, setContact] = useState({ name: '', phone: '' });
  const [leadSent, setLeadSent] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Seed the greeting the first time the panel opens.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', text: t('chat.greeting') }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the conversation scrolled to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, showContact, leadSent]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const nextMessages = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      // Send recent turns (excluding the synthetic greeting) for context.
      const history = nextMessages
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text }));
      const res = await sendChatMessage(text, history);
      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply }]);
      if (res.needsOperator) setShowContact(true);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: t('chat.error') }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, messages, t]);

  const submitContact = useCallback(async () => {
    if (!contact.name.trim() && !contact.phone.trim()) return;
    setLoading(true);
    try {
      // Re-send the last user question so the operator gets context.
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      await sendChatMessage(lastUser?.text || '—', [], {
        name: contact.name.trim(),
        phone: contact.phone.trim(),
      });
      setLeadSent(true);
      setShowContact(false);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: t('chat.error') }]);
    } finally {
      setLoading(false);
    }
  }, [contact, messages, t]);

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('chat.open')}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 80,
          width: 58, height: 58, borderRadius: '50%', border: 'none',
          background: BLUE, color: '#fff', cursor: 'pointer',
          boxShadow: '0 8px 28px rgba(18,64,229,0.42)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'fixed', bottom: 92, right: 24, zIndex: 80,
            width: 'min(380px, calc(100vw - 32px))', height: 'min(560px, calc(100vh - 130px))',
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(20,22,27,0.28)',
            display: 'flex', flexDirection: 'column',
            border: `1px solid ${LINE}`,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ background: DARK, color: '#fff', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: BLUE,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="11.5" fill="none" stroke="#fff" strokeWidth="1.4" />
                <circle cx="14" cy="14" r="2.2" fill="#fff" />
                <line x1="14" y1="14" x2="20" y2="8.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: '0.01em' }}>{t('chat.title')}</div>
              <div style={{ fontSize: 11.5, color: '#a7a9af', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3ecf6a', display: 'inline-block' }} />
                {t('chat.subtitle')}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ background: 'transparent', border: 'none', color: '#a7a9af', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}
            >×</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', background: '#faf9f6', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.text} />
            ))}
            {loading && <Typing />}

            {leadSent && (
              <div style={{ alignSelf: 'center', fontSize: 12.5, color: '#1e7a3e', background: '#e7f6ec', border: '1px solid #bfe6cc', borderRadius: 10, padding: '8px 12px', margin: '4px 0' }}>
                {t('chat.leadSent')}
              </div>
            )}

            {showContact && !leadSent && (
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12.5, color: DARK, fontWeight: 600 }}>{t('chat.operatorPrompt')}</div>
                <input
                  value={contact.name}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                  placeholder={t('chat.name')}
                  style={fieldStyle}
                />
                <input
                  value={contact.phone}
                  onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                  placeholder={t('chat.phone')}
                  inputMode="tel"
                  style={fieldStyle}
                />
                <button
                  onClick={submitContact}
                  disabled={loading || (!contact.name.trim() && !contact.phone.trim())}
                  style={{
                    background: BLUE, color: '#fff', border: 'none', borderRadius: 8,
                    padding: '9px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    opacity: !contact.name.trim() && !contact.phone.trim() ? 0.5 : 1,
                  }}
                >{t('chat.contactSend')}</button>
              </div>
            )}
          </div>

          {/* Composer */}
          <div style={{ borderTop: `1px solid ${LINE}`, padding: 10, display: 'flex', gap: 8, background: '#fff' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('chat.placeholder')}
              style={{
                flex: 1, border: `1px solid ${LINE}`, borderRadius: 999,
                padding: '10px 14px', fontSize: 13.5, outline: 'none', color: DARK,
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label={t('chat.send')}
              style={{
                width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
                background: input.trim() ? BLUE : LINE, color: '#fff', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const fieldStyle = {
  border: `1px solid ${LINE}`, borderRadius: 8, padding: '8px 11px',
  fontSize: 13, outline: 'none', color: DARK, fontFamily: 'inherit',
};

function Bubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '84%' }}>
      <div
        style={{
          background: isUser ? BLUE : '#fff',
          color: isUser ? '#fff' : DARK,
          border: isUser ? 'none' : `1px solid ${LINE}`,
          borderRadius: 14,
          borderBottomRightRadius: isUser ? 4 : 14,
          borderBottomLeftRadius: isUser ? 14 : 4,
          padding: '9px 13px', fontSize: 13.5, lineHeight: 1.5,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div style={{ alignSelf: 'flex-start', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, borderBottomLeftRadius: 4, padding: '11px 14px', display: 'flex', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%', background: DIM,
            animation: 'mk-typing 1.2s infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{'@keyframes mk-typing{0%,60%,100%{opacity:0.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'}</style>
    </div>
  );
}
