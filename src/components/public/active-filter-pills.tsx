'use client';

// Plan 03-04 Task 4.2 — Active filter pills (CAT-05).
//
// Reads every filter URL key declared by the per-locale schema, renders one
// removable Badge per active value, and a "Reset all" button. Pill text uses
// the per-locale label resolved server-side.
//
// nuqs `useQueryStates` is used per filter so each filter's clear is just
// `setState({ [key]: null })`. Reset-all clears every key in one batch update.

import {
  useQueryStates,
  parseAsFloat,
  parseAsArrayOf,
  parseAsString,
  parseAsBoolean,
} from 'nuqs';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';
import type { CategoryFilterSchemaEntry } from '@/lib/catalog';

export interface ActiveFilterPillsProps {
  filterSchema: CategoryFilterSchemaEntry[];
}

interface RangeEntryProps {
  entry: CategoryFilterSchemaEntry;
}

function RangePills({ entry }: RangeEntryProps) {
  const [state, setState] = useQueryStates({
    [`${entry.key}_min`]: parseAsFloat,
    [`${entry.key}_max`]: parseAsFloat,
  });
  const min = state[`${entry.key}_min`] as number | null;
  const max = state[`${entry.key}_max`] as number | null;

  return (
    <>
      {min !== null ? (
        <Pill
          label={`${entry.label} ≥ ${min}${entry.unit ? ` ${entry.unit}` : ''}`}
          onClear={() => setState({ [`${entry.key}_min`]: null })}
          testId={`pill-${entry.key}-min`}
        />
      ) : null}
      {max !== null ? (
        <Pill
          label={`${entry.label} ≤ ${max}${entry.unit ? ` ${entry.unit}` : ''}`}
          onClear={() => setState({ [`${entry.key}_max`]: null })}
          testId={`pill-${entry.key}-max`}
        />
      ) : null}
    </>
  );
}

function SelectPills({ entry }: RangeEntryProps) {
  const [state, setState] = useQueryStates({
    [entry.key]: parseAsArrayOf(parseAsString),
  });
  const selected = (state[entry.key] as string[] | null) ?? [];
  const optionByKey = new Map(
    (entry.options ?? []).map((o) => [o.key, o.label]),
  );

  if (selected.length === 0) return null;

  return (
    <>
      {selected.map((key) => (
        <Pill
          key={key}
          label={`${entry.label}: ${optionByKey.get(key) ?? key}`}
          onClear={() => {
            const remaining = selected.filter((k) => k !== key);
            setState({
              [entry.key]: remaining.length === 0 ? null : remaining,
            });
          }}
          testId={`pill-${entry.key}-${key}`}
        />
      ))}
    </>
  );
}

function TogglePills({ entry }: RangeEntryProps) {
  const [state, setState] = useQueryStates({
    [entry.key]: parseAsBoolean,
  });
  const v = state[entry.key] as boolean | null;
  if (v !== true) return null;

  return (
    <Pill
      label={entry.label}
      onClear={() => setState({ [entry.key]: null })}
      testId={`pill-${entry.key}`}
    />
  );
}

function Pill({
  label,
  onClear,
  testId,
}: {
  label: string;
  onClear: () => void;
  testId: string;
}) {
  return (
    <Badge variant="secondary" className="h-7 gap-1 pr-1" data-testid={testId}>
      <span>{label}</span>
      <button
        type="button"
        aria-label="Remove filter"
        className="ml-1 inline-flex size-4 items-center justify-center rounded hover:bg-slate-300/40"
        onClick={onClear}
      >
        <XIcon className="size-3" />
      </button>
    </Badge>
  );
}

export function ActiveFilterPills({ filterSchema }: ActiveFilterPillsProps) {
  const t = useTranslations('public.catalog');

  // Reset-all uses one batched setState call per filter group. We can't
  // dynamically build a single useQueryStates from runtime data, so we
  // delegate to each pill row's setter via a coordinated location-replace.
  const resetAll = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const params = url.searchParams;
    // Strip every per-filter key + its _min/_max companions.
    for (const entry of filterSchema) {
      params.delete(entry.key);
      params.delete(`${entry.key}_min`);
      params.delete(`${entry.key}_max`);
    }
    url.search = params.toString();
    window.history.replaceState(null, '', url.toString());
    // Force a soft refresh so RSC re-fetches.
    window.location.assign(url.toString());
  };

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2"
      data-testid="active-filter-pills"
    >
      {filterSchema.map((entry) => {
        if (entry.filterKind === 'range') {
          return <RangePills key={entry.key} entry={entry} />;
        }
        if (entry.filterKind === 'select') {
          return <SelectPills key={entry.key} entry={entry} />;
        }
        if (entry.filterKind === 'toggle') {
          return <TogglePills key={entry.key} entry={entry} />;
        }
        return null;
      })}
      <Button
        variant="ghost"
        size="sm"
        onClick={resetAll}
        data-testid="reset-all-filters"
        className="text-xs text-slate-500"
      >
        {t('resetAll')}
      </Button>
    </div>
  );
}
