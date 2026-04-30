// Plan 03-06 Task 6.2 — Header search box client island (SRCH-03 UI).
//
// Replaces the disabled <Input data-testid="search-placeholder" /> stub that
// Plan 03-03 shipped in src/components/public/site-header.tsx so layout
// doesn't shift when this island lands. The placeholder's data-testid is
// retired; this component uses data-testid="search-input" which is the
// e2e/playwright hook downstream specs target.
//
// Behavior:
//   - typed input → 200ms debounced fetch to /api/search/autocomplete
//   - <2 char query → no fetch, dropdown closes
//   - dropdown shows ≤10 suggestions; SKU matches render with a small
//     highlighted "SKU M-100" chip + manufacturer/category breadcrumb chips
//     (D-06)
//   - clicking a suggestion navigates to /[locale]/products/<slug> via the
//     locale-aware @/i18n/navigation router
//   - submitting the form (Enter) navigates to /[locale]/search?q=<query>
//     so the search results page handles the SKU short-circuit + cascade
//     fallback consistently
//   - blur closes the dropdown after a 150ms delay so onMouseDown on a
//     suggestion has time to fire before the list unmounts
//
// Note on locale prop: <Link>/router from @/i18n/navigation auto-prefixes the
// active locale, but the autocomplete API needs the explicit locale to pick
// the right pg_config + per-locale tsvector row, so it's plumbed through as
// a prop from the RSC parent.

'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import type { AutocompleteSuggestion } from '@/lib/search';

export interface SearchBoxProps {
  locale: 'uz' | 'ru' | 'en';
  placeholder: string;
}

export function SearchBox({ locale, placeholder }: SearchBoxProps) {
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/search/autocomplete?q=${encodeURIComponent(q)}&locale=${locale}`,
        );
        if (r.ok) {
          const data = (await r.json()) as {
            suggestions?: AutocompleteSuggestion[];
          };
          setSuggestions(data.suggestions ?? []);
          setOpen(true);
        }
      } catch {
        // best-effort — dropping autocomplete on network errors is fine,
        // the user can still hit Enter to navigate to the full results page.
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, locale]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`, { locale });
  }

  function selectSuggestion(slug: string) {
    setOpen(false);
    router.push(`/products/${slug}`, { locale });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative w-72"
      role="search"
      data-testid="search-form"
    >
      <Input
        type="search"
        aria-label={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Delay so onMouseDown on a list item fires before we unmount.
          setTimeout(() => setOpen(false), 150);
        }}
        data-testid="search-input"
      />
      {open && suggestions.length > 0 ? (
        <ul
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-96 overflow-auto"
          data-testid="search-suggestions"
        >
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={() => selectSuggestion(s.slug)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{s.name}</span>
                  {s.isSkuMatch && s.sku ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      SKU {s.sku}
                    </span>
                  ) : null}
                </div>
                {s.manufacturerName || s.categoryName ? (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    {s.manufacturerName ? <span>{s.manufacturerName}</span> : null}
                    {s.manufacturerName && s.categoryName ? <span>·</span> : null}
                    {s.categoryName ? <span>{s.categoryName}</span> : null}
                  </div>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
