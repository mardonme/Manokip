'use client';

// Plan 03-04 Task 4.2 — Faceted filter sidebar (CAT-04, CAT-05).
//
// Driven by the per-locale schema resolved server-side in
// src/lib/catalog.ts:getCategoryFilterSchema. Each filter group's label
// arrives pre-translated via the spec_field_translations JOIN, and each
// enum option's label arrives pre-translated via
// spec_field_enum_option_translations. The client island NEVER does its own
// i18n lookup for spec/option labels — that would re-introduce the
// translation-bag anti-pattern. Locale comes through the server-resolved
// schema only.
//
// URL-state contract (CAT-05): nuqs `useQueryStates` per filter kind:
//   - range filter `${key}_min` / `${key}_max` → parseAsFloat
//   - select filter `${key}` → parseAsArrayOf(parseAsString)
//   - toggle filter `${key}` → parseAsBoolean
// Setting null on any key strips the param from the URL (nuqs default).
//
// Mobile: below the lg breakpoint the sidebar collapses into a Sheet drawer
// per D-02 (sketch 002 variant A). Desktop renders inline as a 280px column.
//
// Group expand/collapse uses native <details>/<summary> — same pattern as
// CategoryNav in plan 03-03; works without JS, supports SSR cleanly.

import {
  useQueryStates,
  parseAsFloat,
  parseAsArrayOf,
  parseAsString,
  parseAsBoolean,
} from 'nuqs';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { FilterIcon } from 'lucide-react';
import type { CategoryFilterSchemaEntry } from '@/lib/catalog';
import type { EnumFacet } from '@/lib/facets';

export type FacetData = Record<
  string,
  | EnumFacet[]
  | { min: number; max: number }
  | { trueCount: number; falseCount: number }
  | undefined
>;

export interface FilterSidebarProps {
  filterSchema: CategoryFilterSchemaEntry[];
  facetData: FacetData;
}

/* -----------------------------------------------------------------------------
 * Range filter group
 * ---------------------------------------------------------------------------*/

function RangeGroup({
  entry,
  range,
}: {
  entry: CategoryFilterSchemaEntry;
  range?: { min: number; max: number };
}) {
  const minKey = `${entry.key}_min`;
  const maxKey = `${entry.key}_max`;
  const [state, setState] = useQueryStates({
    [minKey]: parseAsFloat,
    [maxKey]: parseAsFloat,
  });

  const min = state[minKey] as number | null;
  const max = state[maxKey] as number | null;

  return (
    <details className="group/filter-group" open data-filter-key={entry.key}>
      <summary className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100">
        {entry.label}
        {entry.unit ? (
          <span className="ml-2 text-xs text-slate-500">{entry.unit}</span>
        ) : null}
      </summary>
      <div className="px-2 pt-2 pb-3">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            placeholder={range ? String(range.min) : 'min'}
            aria-label={`${entry.label} min`}
            name={`${entry.key}_min`}
            data-testid={`filter-${entry.key}-min`}
            defaultValue={min ?? ''}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              setState({
                [minKey]: v === '' ? null : Number(v),
              });
            }}
          />
          <span className="text-xs text-slate-500">—</span>
          <Input
            type="number"
            inputMode="decimal"
            placeholder={range ? String(range.max) : 'max'}
            aria-label={`${entry.label} max`}
            name={`${entry.key}_max`}
            data-testid={`filter-${entry.key}-max`}
            defaultValue={max ?? ''}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              setState({
                [maxKey]: v === '' ? null : Number(v),
              });
            }}
          />
        </div>
        {range ? (
          <div className="mt-2 text-xs text-slate-500" data-testid={`filter-${entry.key}-range`}>
            {range.min} – {range.max}
            {entry.unit ? ` ${entry.unit}` : ''}
          </div>
        ) : null}
      </div>
    </details>
  );
}

/* -----------------------------------------------------------------------------
 * Select (enum) filter group
 * ---------------------------------------------------------------------------*/

const TOP_OPTIONS_LIMIT = 6;

function SelectGroup({
  entry,
  facets,
}: {
  entry: CategoryFilterSchemaEntry;
  facets?: EnumFacet[];
}) {
  const t = useTranslations('public.catalog');
  const [state, setState] = useQueryStates({
    [entry.key]: parseAsArrayOf(parseAsString),
  });
  const [expanded, setExpanded] = useState(false);

  const selected = (state[entry.key] as string[] | null) ?? [];
  const options = entry.options ?? [];
  const visible = expanded ? options : options.slice(0, TOP_OPTIONS_LIMIT);
  const hidden = options.length - visible.length;
  const facetByValue = new Map(facets?.map((f) => [f.value, f.count]) ?? []);

  const toggle = (key: string) => {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];
    setState({
      [entry.key]: next.length === 0 ? null : next,
    });
  };

  return (
    <details className="group/filter-group" open data-filter-key={entry.key}>
      <summary className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100">
        {entry.label}
      </summary>
      <ul className="px-2 pt-2 pb-3 space-y-1.5">
        {visible.map((opt) => {
          const count = facetByValue.get(opt.key) ?? 0;
          const id = `filter-${entry.key}-${opt.key}`;
          const checked = selected.includes(opt.key);
          return (
            <li key={opt.key} className="flex items-center justify-between">
              <label htmlFor={id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <Checkbox
                  id={id}
                  data-testid={id}
                  checked={checked}
                  onCheckedChange={() => toggle(opt.key)}
                />
                {opt.label}
              </label>
              <span className="text-xs text-slate-500 tabular-nums">
                {count}
              </span>
            </li>
          );
        })}
        {hidden > 0 ? (
          <li>
            <Button
              variant="link"
              size="sm"
              className="px-2"
              onClick={() => setExpanded(true)}
            >
              {t('showMore', { n: hidden })}
            </Button>
          </li>
        ) : null}
      </ul>
    </details>
  );
}

/* -----------------------------------------------------------------------------
 * Toggle (bool) filter group
 * ---------------------------------------------------------------------------*/

function ToggleGroup({ entry }: { entry: CategoryFilterSchemaEntry }) {
  const [state, setState] = useQueryStates({
    [entry.key]: parseAsBoolean,
  });
  const value = state[entry.key] as boolean | null;

  return (
    <div className="px-2 py-1.5 flex items-center justify-between" data-filter-key={entry.key}>
      <label
        htmlFor={`filter-${entry.key}`}
        className="text-sm font-medium text-slate-800"
      >
        {entry.label}
      </label>
      <Switch
        id={`filter-${entry.key}`}
        data-testid={`filter-${entry.key}`}
        checked={value === true}
        onCheckedChange={(next: boolean) =>
          setState({ [entry.key]: next ? true : null })
        }
      />
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Sidebar body
 * ---------------------------------------------------------------------------*/

function FilterGroups({ filterSchema, facetData }: FilterSidebarProps) {
  return (
    <div className="flex flex-col gap-1">
      {filterSchema.map((entry) => {
        if (entry.filterKind === 'range') {
          const range = facetData[entry.key];
          const rangeData =
            range && 'min' in range && typeof range.min === 'number'
              ? (range as { min: number; max: number })
              : undefined;
          return <RangeGroup key={entry.key} entry={entry} range={rangeData} />;
        }
        if (entry.filterKind === 'select') {
          const fdata = facetData[entry.key];
          const enumFacets = Array.isArray(fdata) ? fdata : undefined;
          return (
            <SelectGroup key={entry.key} entry={entry} facets={enumFacets} />
          );
        }
        if (entry.filterKind === 'toggle') {
          return <ToggleGroup key={entry.key} entry={entry} />;
        }
        return null;
      })}
    </div>
  );
}

export function FilterSidebar(props: FilterSidebarProps) {
  const t = useTranslations('public.catalog');
  return (
    <>
      {/* Desktop sidebar (>= lg) */}
      <aside className="hidden lg:block w-[280px] shrink-0" data-testid="filter-sidebar">
        <FilterGroups {...props} />
      </aside>
      {/* Mobile drawer (< lg) — Sheet button + content */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="sm" className="gap-2">
                <FilterIcon className="size-4" />
                {t('filters')}
              </Button>
            }
          />
          <SheetContent
            side="left"
            className="w-[320px] overflow-y-auto p-4"
            data-testid="filter-sidebar-drawer"
          >
            <h2 className="mb-3 text-base font-semibold text-slate-800">
              {t('filters')}
            </h2>
            <FilterGroups {...props} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
