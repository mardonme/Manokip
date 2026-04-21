// FOUND-02 Wave 0 snapshot test.
// Invariants locked here:
//   (a) specDataTypeEnum is EXACTLY ['number','text','enum','bool'] — no 'range'
//   (b) specFilterKindEnum = ['range','select','toggle'] — 'range' lives on
//       filter_kind, not data_type (D-17)
//   (c) productSpecValues exposes typed value columns (numValue, textValue,
//       boolValue, enumValue) + unit + isExtra + extraKey — NEVER an opaque
//       `value TEXT` column (the JSONB-spec-bag anti-pattern equivalent)
import { describe, it, expect } from 'vitest';
import {
  specDataTypeEnum,
  specFilterKindEnum,
  productSpecValues,
} from '@/db/schema';

describe('FOUND-02: spec_field shape + typed product_spec_values', () => {
  it('specDataTypeEnum has exactly [number, text, enum, bool] — no range (D-16)', () => {
    expect([...specDataTypeEnum.enumValues].sort()).toEqual([
      'bool',
      'enum',
      'number',
      'text',
    ]);
    expect(specDataTypeEnum.enumValues).not.toContain('range');
  });

  it('specFilterKindEnum has [range, select, toggle] (D-17)', () => {
    expect([...specFilterKindEnum.enumValues].sort()).toEqual([
      'range',
      'select',
      'toggle',
    ]);
  });

  it('productSpecValues exposes typed value columns and no opaque value', () => {
    const colNames = Object.keys(productSpecValues).filter(
      (k) => !k.startsWith('_'),
    );
    expect(colNames).toEqual(
      expect.arrayContaining([
        'numValue',
        'textValue',
        'boolValue',
        'enumValue',
        'unit',
        'isExtra',
        'extraKey',
      ]),
    );
    expect(colNames).not.toContain('value');
  });
});
