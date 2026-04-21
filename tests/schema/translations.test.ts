// FOUND-01 Wave 0 snapshot test.
// Source-level invariants, so we parse the schema files as text:
//   (a) no column declaration ends in _uz/_ru/_en on any table
//   (b) every *_translations table has composite primaryKey including locale
//   (c) every *_translations table has a CHECK(locale IN ('uz','ru','en'))
//   (d) the barrel imports resolve (smoke test — catches type errors via import)
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCHEMA_DIR = resolve(process.cwd(), 'src/db/schema');

function schemaFiles() {
  return readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => ({
      name: f,
      content: readFileSync(resolve(SCHEMA_DIR, f), 'utf8'),
    }));
}

describe('FOUND-01: translations siblings (no per-locale columns, composite PK, locale CHECK)', () => {
  it('no schema file contains columns ending in _uz, _ru, or _en', () => {
    for (const { name, content } of schemaFiles()) {
      const offenders = content.match(/['"]\w+_(uz|ru|en)['"]/g);
      expect(
        offenders,
        `${name} has per-locale columns: ${offenders?.join(', ')}`,
      ).toBeNull();
    }
  });

  it('every *_translations table declares composite primaryKey including locale', () => {
    for (const { name, content } of schemaFiles()) {
      const translationTables =
        content.match(
          /pgTable\(\s*['"][\w]+_translations['"],[\s\S]*?\]\s*\)/g,
        ) ?? [];
      for (const tableDef of translationTables) {
        expect(
          tableDef,
          `${name}: *_translations table missing primaryKey`,
        ).toMatch(/primaryKey\(\{\s*columns:\s*\[[^\]]*t\.locale/);
      }
    }
  });

  it('every *_translations table declares a CHECK constraint on locale IN (uz, ru, en)', () => {
    for (const { name, content } of schemaFiles()) {
      const translationTables =
        content.match(
          /pgTable\(\s*['"][\w]+_translations['"],[\s\S]*?\]\s*\)/g,
        ) ?? [];
      for (const tableDef of translationTables) {
        expect(
          tableDef,
          `${name}: *_translations table missing locale CHECK`,
        ).toMatch(
          /check\([^)]+,\s*sql`[^`]*locale[^`]*IN\s*\(\s*'uz'\s*,\s*'ru'\s*,\s*'en'\s*\)/,
        );
      }
    }
  });

  it('every schema file compiles (barrel imports resolve)', async () => {
    // Import the barrel — if any table has a type error, this throws
    const mod = await import('@/db/schema');
    expect(mod).toBeDefined();
    expect(mod.authUsers).toBeDefined();
    expect(mod.adminUsers).toBeDefined();
    expect(mod.products).toBeDefined();
    expect(mod.productTranslations).toBeDefined();
    expect(mod.categoryTranslations).toBeDefined();
    expect(mod.manufacturerTranslations).toBeDefined();
  });
});
