"use client";

// Plan 02-12 Task 12.2 — D-04 / ADMIN-10 visualization primitives.
//
// Two presentational client components consumed by the product editor + list:
//   <TranslationCompleteness percent={N} label?="..." />
//     Horizontal progress bar with width N% and a tone:
//       green ≥95, amber ≥50, red <50.   (D-04 thresholds — LOCKED)
//     Used by the product editor to render one bar per locale tab (plan 02-13b).
//   <TranslationDots completeness={{ uz, ru, en }} />
//     Three colored dots (one per locale) with per-dot tooltip
//     `${locale.toUpperCase()}: ${pct}%`. Renders in the products list's
//     "Translations" column (plan 02-13b).
//
// Pure presentational — no data fetching here. Consumers fetch values via
// findProductCompleteness / findCompletenessForProducts (see
// src/lib/translation-completeness.ts) in their RSC and pass the resolved
// percentages down as props. This keeps the components decoupled from any
// specific page's data flow.

import * as React from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  LOCALES,
  type CompletenessByLocale,
} from '@/lib/translation-completeness';

type Tone = 'green' | 'amber' | 'red';

// D-04 (LOCKED): green ≥95, amber ≥50, red <50.
function tone(percent: number): Tone {
  if (percent >= 95) return 'green';
  if (percent >= 50) return 'amber';
  return 'red';
}

const TONE_BG: Record<Tone, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

function clampPercent(percent: number): number {
  if (Number.isNaN(percent)) return 0;
  return Math.max(0, Math.min(100, percent));
}

export interface TranslationCompletenessProps {
  /** 0-100 percent; values outside the range are clamped. */
  percent: number;
  /** Optional inline label shown above the bar (e.g. locale code). */
  label?: string;
  className?: string;
}

/**
 * Horizontal progress bar for a single locale's completeness percent.
 *
 * Renders an outer track plus an inner fill colored by the D-04 tone
 * thresholds (green ≥95, amber ≥50, red <50).
 */
export function TranslationCompleteness({
  percent,
  label,
  className,
}: TranslationCompletenessProps) {
  const safePercent = clampPercent(percent);
  const t = tone(safePercent);

  return (
    <div
      className={cn('space-y-1', className)}
      data-testid={`completeness-${label ?? 'bar'}`}
    >
      {label && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span>{safePercent}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safePercent}
        aria-label={
          label ? `${label} translation completeness` : 'translation completeness'
        }
      >
        <div
          className={cn('h-full rounded transition-[width]', TONE_BG[t])}
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  );
}

export interface TranslationDotsProps {
  completeness: CompletenessByLocale;
  className?: string;
}

/**
 * Three colored dots — one per locale — for the products list "Translations"
 * column. Each dot has a tooltip showing `${LOCALE}: ${pct}%`.
 */
export function TranslationDots({
  completeness,
  className,
}: TranslationDotsProps) {
  return (
    <TooltipProvider>
      <div
        className={cn('flex items-center gap-1', className)}
        data-testid="completeness-dots"
      >
        {LOCALES.map((locale) => {
          const pct = clampPercent(completeness[locale]);
          const t = tone(pct);
          const labelText = `${locale.toUpperCase()}: ${pct}%`;
          return (
            <Tooltip key={locale}>
              <TooltipTrigger
                aria-label={labelText}
                className={cn(
                  'inline-block h-2 w-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  TONE_BG[t],
                )}
              />
              <TooltipContent>{labelText}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
