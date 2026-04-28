"use client";

// Plan 02-09 Task 9.1 — LocaleTabs (D-01 / RESEARCH §Pattern 5).
//
// Reusable 3-locale tab strip for the marquee admin editor pattern: every
// translatable entity (categories, manufacturers, spec-fields, products,
// recipes, industries) shares the same RHF + Tabs combination — one form
// instance, three tabs that swap only the translatable fields in place,
// shared (non-translated) fields render once outside the tab strip.
//
// Caller passes a render-prop `(locale) => ReactNode` rather than three
// children so the per-locale subtree is parameterized by locale (so the
// form fields can use `translations.${locale}.name` etc. without three
// near-identical copies).
//
// Per-tab error count badge: counts the keys in `formState.errors` scoped
// to the locale so the active tab is obvious when validation fails on a
// non-active locale (Pitfall: silent validation errors hidden behind an
// inactive tab — surfaced by the badge, not blocked by it).
//
// Consumers in this phase: 02-09 (categories), 02-10 (manufacturers),
// 02-11 (spec-fields + groups), 02-13b (products).

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { FieldErrors } from "react-hook-form";

export type Locale = "uz" | "ru" | "en";
export const LOCALES: Locale[] = ["uz", "ru", "en"];

export interface LocaleTabsProps {
  /**
   * Optional per-locale slice of `formState.errors`. Each entry's key count
   * is rendered as a destructive Badge next to the locale label so admins
   * see at-a-glance which locale tab still has unresolved validation.
   */
  errors?: Partial<Record<Locale, FieldErrors | undefined>>;
  /** Initial active tab. Defaults to `uz` (project default locale). */
  defaultValue?: Locale;
  /**
   * Render-prop scoped per locale — emits the per-locale field subtree.
   * Receives the locale string so callers can produce
   * `translations.${locale}.name` / `.slug` / `.description` field names.
   */
  children: (locale: Locale) => React.ReactNode;
}

export function LocaleTabs({
  errors,
  defaultValue = "uz",
  children,
}: LocaleTabsProps) {
  const errorCount = (l: Locale) => Object.keys(errors?.[l] ?? {}).length;

  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        {LOCALES.map((l) => {
          const count = errorCount(l);
          return (
            <TabsTrigger key={l} value={l} data-testid={`tab-${l}`}>
              {l.toUpperCase()}
              {count > 0 ? (
                <Badge variant="destructive" className="ml-2">
                  {count}
                </Badge>
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {LOCALES.map((l) => (
        <TabsContent key={l} value={l} className="space-y-3 pt-4">
          {children(l)}
        </TabsContent>
      ))}
    </Tabs>
  );
}
