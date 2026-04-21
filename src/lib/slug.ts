// Phase 1 stub for Phase 2 slug UX (auto-generate + collision suffix).
// Normalizes Uzbek Latin apostrophe variants to U+02BB (ʻ — modifier letter turned comma)
// after `o` or `g`, so the same human input always yields the same slug regardless of
// which apostrophe the user types. Per PROJECT.md / CLAUDE.md Uzbek Latin guardrail.
//
// Examples:
//   toSlug("O'lcham asboblari")  => "oʻlcham-asboblari"
//   toSlug("Bogʻlam")             => "bogʻlam"
//   toSlug("Bog’lam")             => "bogʻlam"
//   toSlug("Pressure Gauge v2")   => "pressure-gauge-v2"

const UZ_APOSTROPHE = 'ʻ'; // ʻ — modifier letter turned comma (U+02BB)
// Apostrophe variants: ' (straight '), ʼ (ʼ), ’ (’), ` (`)
const APOSTROPHE_VARIANTS = /['ʼ’`]/g;

export function toSlug(input: string): string {
  if (!input) return '';

  // Step 1: lowercase early so the o/g check is case-insensitive.
  let s = input.toLowerCase();

  // Step 2: replace apostrophe variants with U+02BB ONLY when preceded by o or g.
  // Char-by-char scan via replace callback keeps this ES2018-compatible (no lookbehind).
  s = s.replace(APOSTROPHE_VARIANTS, (match, offset: number) => {
    const prev = offset > 0 ? s[offset - 1] : '';
    if (prev === 'o' || prev === 'g') return UZ_APOSTROPHE;
    return match; // leave unchanged elsewhere — strip step below will remove it
  });

  // Step 3: NFD-decompose + drop combining marks. U+02BB is NOT a combining mark, so it survives.
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Step 4: collapse any run of non-[a-z0-9 + U+02BB] to a single hyphen.
  const allowed = new RegExp(`[^a-z0-9${UZ_APOSTROPHE}]+`, 'g');
  s = s.replace(allowed, '-');

  // Step 5: trim leading/trailing hyphens.
  s = s.replace(/^-+|-+$/g, '');

  return s;
}
