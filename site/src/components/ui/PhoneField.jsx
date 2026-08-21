import React, { useLayoutEffect, useRef } from 'react';
import { UZ_COUNTRY, formatPhone, onlyDigits, parsePhone } from '../../lib/phone.js';

function isDigit(ch) {
  const code = ch.charCodeAt(0);
  return code >= 48 && code <= 57;
}

/**
 * The caret position that leaves exactly `n` digits after it.
 *
 * Counted from the END on purpose: the formatter inserts "+998 " in front of
 * what the visitor typed, so anything counted from the start shifts by three
 * digits the moment the country code appears.
 */
function caretWithDigitsAfter(text, n) {
  if (n <= 0) return text.length;
  let seen = 0;
  for (let i = text.length - 1; i >= 0; i -= 1) {
    if (isDigit(text[i])) {
      seen += 1;
      if (seen === n) return i;
    }
  }
  return 0;
}

/**
 * Phone input that formats Uzbek numbers as they are typed:
 * "333332800", "998333332800" and a pasted "+998(33)333-28-00" all become
 * +998 33 333 28 00. A number that starts with another country code is left
 * exactly as typed.
 */
export default function PhoneField({
  id, label, value, onChange, error, required = false, hint,
  placeholder = '+998 90 123 45 67', autoComplete = 'tel', inputRef: externalRef,
}) {
  const innerRef = useRef(null);
  const inputRef = externalRef || innerRef;
  const trailingDigits = useRef(null);

  // Every keystroke rewrites the value, which would otherwise drop the caret at
  // the end of the field. Restoring it by trailing-digit count makes it survive
  // both the spaces and the "+998 " the formatter inserts.
  useLayoutEffect(() => {
    const target = trailingDigits.current;
    trailingDigits.current = null;
    const el = inputRef.current;
    if (target == null || !el || document.activeElement !== el) return;
    const pos = caretWithDigitsAfter(el.value, target);
    el.setSelectionRange(pos, pos);
  });

  function handleChange(e) {
    const el = e.target;
    const typed = el.value;
    const caret = el.selectionStart ?? typed.length;
    let digits = onlyDigits(typed);
    const digitsBefore = onlyDigits(typed.slice(0, caret)).length;
    const digitsAfter = digits.length - digitsBefore;

    // Backspace on a space deletes no digit, and the formatter would put that
    // space straight back — so take the digit in front of it instead, which is
    // what the key is expected to do. It sits before the caret, so the trailing
    // count used to restore the caret does not change.
    if (e.nativeEvent?.inputType === 'deleteContentBackward'
      && digits === onlyDigits(value) && digitsBefore > 0) {
      digits = digits.slice(0, digitsBefore - 1) + digits.slice(digitsBefore);
    }

    const hasPlus = typed.trimStart().startsWith('+');
    const next = parsePhone(typed).isUz
      ? formatPhone((hasPlus ? '+' : '') + digits)
      : typed.replace(/[^\d+\s()-]/g, ''); // foreign number — keep it as written

    // The formatter can ADD the country code and can DROP digits past the 9th
    // national one. Only the drop eats into the tail, so the trailing count has
    // to shed exactly that much or the caret lands one digit too far left.
    const resultDigits = onlyDigits(next);
    const added = resultDigits.startsWith(UZ_COUNTRY) && !digits.startsWith(UZ_COUNTRY)
      ? UZ_COUNTRY.length : 0;
    const dropped = Math.max(0, digits.length + added - resultDigits.length);

    trailingDigits.current = Math.max(0, digitsAfter - dropped);
    onChange(next);
  }

  return (
    <label className="mk-field" htmlFor={id}>
      <span className="mk-label">
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </span>
      <input
        ref={inputRef}
        id={id}
        className="mk-input"
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : (hint ? `${id}-hint` : undefined)}
      />
      {error
        ? <span id={`${id}-err`} className="mk-error" role="alert">{error}</span>
        : hint ? <span id={`${id}-hint`} className="mk-help">{hint}</span> : null}
    </label>
  );
}
