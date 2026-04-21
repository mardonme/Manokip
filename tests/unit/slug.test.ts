import { describe, it, expect } from 'vitest';
import { toSlug } from '@/lib/slug';

describe('toSlug — Uzbek Latin apostrophe normalization', () => {
  it('normalizes U+0027 after o/g to U+02BB', () => {
    expect(toSlug("O'lcham asboblari")).toBe('oʻlcham-asboblari');
    expect(toSlug("Bog'lam")).toBe('bogʻlam');
  });

  it('normalizes U+02BC (ʼ) after o/g to U+02BB', () => {
    expect(toSlug('Oʼlcham')).toBe('oʻlcham');
    expect(toSlug('Bogʼlam')).toBe('bogʻlam');
  });

  it('normalizes U+2019 (’) after o/g to U+02BB', () => {
    expect(toSlug('O’lcham')).toBe('oʻlcham');
    expect(toSlug('Bog’lam')).toBe('bogʻlam');
  });

  it('normalizes U+0060 (`) after o/g to U+02BB', () => {
    expect(toSlug('O`lcham')).toBe('oʻlcham');
    expect(toSlug('Bog`lam')).toBe('bogʻlam');
  });

  it('preserves an existing U+02BB (round-trip)', () => {
    const already = 'oʻlcham-asboblari';
    expect(toSlug(already)).toBe(already);
  });

  it('does NOT convert apostrophes elsewhere — they are stripped as non-allowed chars', () => {
    // 'it's' => the ' is not after o/g, so it stays an apostrophe, which the
    // non-[a-z0-9ʻ] pass then replaces with a hyphen.
    expect(toSlug("it's raining")).toBe('it-s-raining');
  });

  it('lowercases and replaces whitespace/punctuation with hyphens', () => {
    expect(toSlug('Pressure Gauge v2')).toBe('pressure-gauge-v2');
    expect(toSlug('  Hello, world!  ')).toBe('hello-world');
  });

  it('strips diacritics via NFD (é → e, ñ → n)', () => {
    expect(toSlug('Café Niño')).toBe('cafe-nino');
  });

  it('collapses multiple separators into a single hyphen', () => {
    expect(toSlug('a   b---c___d')).toBe('a-b-c-d');
  });

  it('trims leading and trailing hyphens', () => {
    expect(toSlug('---hello---')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(toSlug('')).toBe('');
  });

  it('handles all three known Uzbek Latin apostrophe variants in one input', () => {
    // Mixed: U+0027, U+02BC, U+2019
    const input = "O'zbek Oʼzbek O’zbek";
    expect(toSlug(input)).toBe('oʻzbek-oʻzbek-oʻzbek');
  });
});
