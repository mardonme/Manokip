'use client';

// Plan 03-03 Task 3.2 — Locale switcher client island (CAT-01).
//
// Three-button group (UZ / RU / EN) site-wide. Uses next-intl's locale-aware
// useRouter + usePathname so router.replace(pathname, { locale }) preserves
// the current path while swapping the locale prefix (the "switch language,
// stay where you are" UX contract from CONTEXT.md §"specifics").
//
// Exposes data-testid attributes (`locale-{code}`) for the e2e specs in
// tests/e2e/locale-switcher.spec.ts.

import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/metadata';

const LOCALES: readonly Locale[] = ['uz', 'ru', 'en'] as const;

export interface LocaleSwitcherProps {
  currentLocale: Locale;
}

export function LocaleSwitcher({ currentLocale }: LocaleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div
      className="flex gap-1"
      role="group"
      aria-label="Locale switcher"
      data-testid="locale-switcher"
    >
      {LOCALES.map((l) => (
        <Button
          key={l}
          variant={l === currentLocale ? 'default' : 'outline'}
          size="sm"
          onClick={() => router.replace(pathname, { locale: l })}
          aria-pressed={l === currentLocale}
          aria-label={`Switch to ${l.toUpperCase()}`}
          data-testid={`locale-${l}`}
        >
          {l.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
