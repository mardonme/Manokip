import { describe, it, expect } from 'vitest';
import { config as loadDotenv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.test for this test run if present, else fall back to .env.example shape checks only
loadDotenv({ path: '.env.test' });
loadDotenv({ path: '.env' });

describe('env-validation — FOUND-04 + T-SEC-ENV', () => {
  it('DATABASE_URL uses Neon pooled (-pooler) hostname when set', () => {
    if (!process.env.DATABASE_URL) return; // skip if not set locally
    expect(process.env.DATABASE_URL).toMatch(/-pooler\./);
  });

  it('DATABASE_URL_DIRECT does NOT use -pooler when set', () => {
    if (!process.env.DATABASE_URL_DIRECT) return;
    expect(process.env.DATABASE_URL_DIRECT).not.toMatch(/-pooler\./);
  });

  it('CLOUDINARY_API_SECRET must never be exposed as NEXT_PUBLIC_*', () => {
    const publicVars = Object.keys(process.env).filter((k) => k.startsWith('NEXT_PUBLIC_'));
    const leaked = publicVars.find((k) => /CLOUDINARY|AUTH_SECRET|AUTH_RESEND|DATABASE_URL/i.test(k));
    expect(leaked, `Secret leak: ${leaked} is exposed to client bundle`).toBeUndefined();
  });

  it('src/env.ts defines CLOUDINARY_API_SECRET only in server: block', () => {
    const envFile = readFileSync(resolve(process.cwd(), 'src/env.ts'), 'utf8');
    const serverBlock = envFile.match(/server:\s*{[\s\S]*?},\s*client:/)?.[0] ?? '';
    const clientBlock = envFile.match(/client:\s*{[\s\S]*?},\s*experimental__runtimeEnv:/)?.[0] ?? '';
    expect(serverBlock).toMatch(/CLOUDINARY_API_SECRET/);
    expect(clientBlock).not.toMatch(/CLOUDINARY_API_SECRET/);
    expect(clientBlock).not.toMatch(/AUTH_SECRET/);
    expect(clientBlock).not.toMatch(/AUTH_RESEND_KEY/);
    expect(clientBlock).not.toMatch(/DATABASE_URL/);
  });
});
