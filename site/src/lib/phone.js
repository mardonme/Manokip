// Uzbek phone numbers, formatted as the visitor types.
//
// Display form: +998 90 123 45 67 — country code, two-digit operator code,
// then 3-2-2. Everything here works on digits, never on the punctuation, so a
// pasted "+998(90)123-45-67", "998901234567" or a bare "901234567" all land on
// the same value. Foreign numbers are left alone: someone who starts with "+"
// and a different country code is not writing an Uzbek number.
//
// No React here on purpose — the rules are testable on their own.

export const UZ_COUNTRY = '998';
export const UZ_NATIONAL_LEN = 9;   // 90 123 45 67
const UZ_TRUNK = '8';               // old domestic prefix: 8 90 123 45 67

export function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Read whatever is in the field.
 * @returns {{isUz:boolean, digits:string, national:string, complete:boolean}}
 */
export function parsePhone(value) {
  const raw = String(value ?? '');
  const hasPlus = raw.trimStart().startsWith('+');
  const digits = onlyDigits(raw);

  // "9", "99", "998" are prefixes of the Uzbek code, so they stay Uzbek while
  // the number is still being typed.
  const looksUz = !digits || UZ_COUNTRY.startsWith(digits) || digits.startsWith(UZ_COUNTRY);
  if (hasPlus && !looksUz) {
    return {
      isUz: false,
      digits,
      national: '',
      // E.164: at most 15 digits, and nothing under 7 is dialable.
      complete: digits.length >= 7 && digits.length <= 15,
    };
  }

  let national = digits;
  if (digits.startsWith(UZ_COUNTRY) && digits.length > UZ_COUNTRY.length) {
    // A leading 998 followed by anything is read as the country code. It is
    // ambiguous in theory (99 is also an operator code, so national numbers
    // like 99 8xx xx xx start with 998) but writing the country code is by far
    // the common case; those subscribers get the right result by typing +998.
    national = digits.slice(UZ_COUNTRY.length);
  } else if (digits.length === UZ_NATIONAL_LEN + 1 && digits.startsWith(UZ_TRUNK)) {
    national = digits.slice(1);
  }
  national = national.slice(0, UZ_NATIONAL_LEN);

  return { isUz: true, digits, national, complete: national.length === UZ_NATIONAL_LEN };
}

/** The value to show in the input for whatever was typed or pasted. */
export function formatPhone(value) {
  const raw = String(value ?? '');
  const digits = onlyDigits(raw);
  // A lone "+" is someone starting an international number — keep it.
  if (!digits) return raw.trimStart().startsWith('+') ? '+' : '';

  // While the digits are still a prefix of the country code we cannot know
  // whether the visitor is writing "+998…" or a national number starting with
  // 9 — so show what they typed and decide on the next keystroke. Without this
  // the field would prepend +998 to the 9 of "998…" and double the code.
  if (digits.length <= UZ_COUNTRY.length && UZ_COUNTRY.startsWith(digits)) {
    return (raw.trimStart().startsWith('+') ? '+' : '') + digits;
  }

  const { isUz, national } = parsePhone(raw);
  if (!isUz) return raw.replace(/[^\d+\s()-]/g, '');
  if (!national) return `+${UZ_COUNTRY} `;

  const groups = [
    national.slice(0, 2),
    national.slice(2, 5),
    national.slice(5, 7),
    national.slice(7, 9),
  ].filter(Boolean);
  return `+${UZ_COUNTRY} ${groups.join(' ')}`;
}

/** Can sales actually call this back? */
export function isPhoneComplete(value) {
  return parsePhone(value).complete;
}

/** Dialable form for tel: links — +998901234567. */
export function phoneToTel(value) {
  const { isUz, digits, national } = parsePhone(value);
  // Keep the country code even on a half-typed number, so the link is never
  // "+90" for someone who only got as far as the operator code.
  if (isUz) return national ? `+${UZ_COUNTRY}${national}` : '';
  return digits ? `+${digits}` : '';
}
