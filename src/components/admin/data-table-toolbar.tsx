"use client";

// DataTable toolbar — the search-input slot above every admin list page.
//
// Owns no URL state itself. The parent <DataTable> passes the controlled
// `value` (read from the nuqs `q` URL parameter) and an `onChange` callback
// that updates the URL via `setQuery({ q, page: 1 })`. The toolbar maintains
// only a transient *local* state for the input element so typing feels
// instantaneous; URL writes are debounced (300ms) to avoid spamming history
// entries on every keystroke.
//
// Reused by every list page in Waves 2-4 (products, categories, manufacturers,
// spec-fields, submissions, audit). Pages may inject extra filter chips
// through the `extra` slot (e.g. status filter, date range pickers) — those
// chips drive the same URL store via their own nuqs hooks.

import * as React from "react";

import { Input } from "@/components/ui/input";

interface DataTableToolbarProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  extra?: React.ReactNode;
}

export function DataTableToolbar({
  value,
  onChange,
  placeholder = "Search…",
  extra,
}: DataTableToolbarProps) {
  // Mirror controlled value locally so each keystroke renders without
  // waiting for the URL round-trip; the debounced effect below pushes the
  // settled value back to the parent (and from there into the URL).
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => {
    setLocal(value);
  }, [value]);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(next: string) {
    setLocal(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(next);
    }, 300);
  }

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Input
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="max-w-sm"
        data-testid="datatable-search"
        aria-label={placeholder}
      />
      {extra}
    </div>
  );
}
