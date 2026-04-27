---
phase: 02-admin-panel
plan: 06
type: execute
wave: 1
depends_on: [02]
files_modified:
  - src/components/admin/data-table.tsx
  - src/components/admin/data-table-pagination.tsx
  - src/components/admin/data-table-toolbar.tsx
  - tests/components/data-table.test.tsx
autonomous: true
requirements: [ADMIN-12]
must_haves:
  truths:
    - "DataTable<TData> generic component renders columns + rows from props with shadcn Table primitives"
    - "URL state is owned by nuqs (page, pageSize, q, sort) — not local component state"
    - "Server-paginated mode sets manualPagination/manualSorting/manualFiltering = true (Pitfall #8)"
    - "Pagination controls (prev/next/page-size) call setQuery so URL stays bookmarkable"
    - "Toolbar exposes a search input bound to the `q` URL param with debounce"
    - "Component is reused by every list page in Waves 2-4 (products, categories, manufacturers, spec-fields, submissions, audit)"
  artifacts:
    - path: "src/components/admin/data-table.tsx"
      provides: "Generic DataTable<TData, TValue> client component"
      contains: "useReactTable"
    - path: "src/components/admin/data-table-pagination.tsx"
      provides: "Pagination footer (prev/next + page-size select)"
      contains: "setPageIndex"
    - path: "src/components/admin/data-table-toolbar.tsx"
      provides: "Search input + slot for filter chips"
      contains: "parseAsString"
  key_links:
    - from: "src/components/admin/data-table.tsx"
      to: "@tanstack/react-table"
      via: "useReactTable + getCoreRowModel"
      pattern: "@tanstack/react-table"
    - from: "src/components/admin/data-table.tsx"
      to: "nuqs"
      via: "useQueryStates with parseAsInteger / parseAsString"
      pattern: "useQueryStates"
---

<objective>
Build the reusable DataTable primitive used by every admin list page (products, categories, manufacturers, spec-fields, audit log, submissions). Server-pagination shape by default (per CONTEXT D-17 + RESEARCH §Pattern 4); URL state via nuqs so filtered views are bookmarkable; shadcn Table primitives.

Purpose: One component for 6+ list pages — building it once means downstream plans (02-09 through 02-15) just author columns + the RSC fetch query. Without it, every list page would re-implement pagination/sort.
Output: 3 client component files + a vitest-DOM test asserting URL state changes on page-next.
</objective>

<execution_context>
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-admin-panel/02-CONTEXT.md
@.planning/phases/02-admin-panel/02-RESEARCH.md
@.planning/phases/02-admin-panel/02-PATTERNS.md
@CLAUDE.md
@src/app/[locale]/admin/layout.tsx
@src/components/ui/table.tsx
@src/components/ui/input.tsx
@src/components/ui/select.tsx
@src/components/ui/button.tsx

<interfaces>
From @tanstack/react-table 8.21.3:
```typescript
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, PaginationState, SortingState } from "@tanstack/react-table";
```

From nuqs 2.8.9:
```typescript
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
// NuqsAdapter is wrapped at admin layout level (plan 02-02 Task 2.2).
```

Page expectations (RSC parent):
```typescript
// app/[locale]/admin/products/page.tsx accepts searchParams: Promise<{ page?, pageSize?, q?, sort? }>
// fetches rows + total count, passes to DataTable as data + rowCount.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 6.1: Build DataTable + pagination + toolbar components</name>
  <files>src/components/admin/data-table.tsx, src/components/admin/data-table-pagination.tsx, src/components/admin/data-table-toolbar.tsx</files>
  <read_first>
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 4 (lines 519-585) — verbatim DataTable skeleton with critical `manualPagination/manualSorting/manualFiltering: true` flags
    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/components/admin/data-table.tsx (NEW)` — verbatim
    - src/components/ui/table.tsx (shadcn Table primitives — Table, TableHeader, TableBody, TableRow, TableHead, TableCell)
    - src/components/ui/select.tsx (page-size select)
    - src/components/ui/button.tsx (prev/next buttons)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pitfall 8 (manualPagination requirement)
  </read_first>
  <behavior>
    - DataTable<TData> renders a header row from `columns`, a body row per `data` item, and a footer with pagination + page count derived from `rowCount`.
    - Setting query state (`page`, `pageSize`, `q`) updates the URL via nuqs (no router.push).
    - `manualPagination=true, manualSorting=true, manualFiltering=true` so the parent RSC owns sort/filter (Pitfall #8).
    - On `pageIndex`/`pageSize` change, the component calls `setQuery({ page: newIndex+1, pageSize })`.
  </behavior>
  <action>
    Create `src/components/admin/data-table.tsx`:
    ```tsx
    "use client";

    import * as React from "react";
    import {
      ColumnDef, flexRender, getCoreRowModel, useReactTable,
      type PaginationState, type SortingState,
    } from "@tanstack/react-table";
    import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
    import {
      Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
    } from "@/components/ui/table";
    import { DataTableToolbar } from "./data-table-toolbar";
    import { DataTablePagination } from "./data-table-pagination";

    export interface DataTableProps<TData> {
      columns: ColumnDef<TData, unknown>[];
      data: TData[];
      rowCount: number;
      searchPlaceholder?: string;
      toolbarSlot?: React.ReactNode;
      defaultPageSize?: number;
    }

    export function DataTable<TData>({
      columns, data, rowCount, searchPlaceholder, toolbarSlot, defaultPageSize = 20,
    }: DataTableProps<TData>) {
      const [{ page, pageSize, q, sort }, setQuery] = useQueryStates({
        page: parseAsInteger.withDefault(1),
        pageSize: parseAsInteger.withDefault(defaultPageSize),
        q: parseAsString.withDefault(""),
        sort: parseAsString.withDefault(""),
      });

      const pagination: PaginationState = { pageIndex: page - 1, pageSize };
      const sorting: SortingState = sort
        ? [{ id: sort.replace(/^-/, ""), desc: sort.startsWith("-") }]
        : [];

      const table = useReactTable({
        data,
        columns,
        rowCount,
        state: { pagination, sorting, globalFilter: q },
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        onPaginationChange: (updater) => {
          const next = typeof updater === "function" ? updater(pagination) : updater;
          setQuery({ page: next.pageIndex + 1, pageSize: next.pageSize });
        },
        onSortingChange: (updater) => {
          const next = typeof updater === "function" ? updater(sorting) : updater;
          const first = next[0];
          setQuery({ sort: first ? `${first.desc ? "-" : ""}${first.id}` : "" });
        },
        onGlobalFilterChange: (value: string) => setQuery({ q: value, page: 1 }),
        getCoreRowModel: getCoreRowModel(),
      });

      return (
        <div className="space-y-4">
          <DataTableToolbar
            value={q}
            onChange={(v) => setQuery({ q: v, page: 1 })}
            placeholder={searchPlaceholder}
            extra={toolbarSlot}
          />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow><TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">No results.</TableCell></TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((c) => (
                        <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} />
        </div>
      );
    }
    ```

    Create `src/components/admin/data-table-toolbar.tsx`:
    ```tsx
    "use client";
    import * as React from "react";
    import { Input } from "@/components/ui/input";

    export function DataTableToolbar({
      value, onChange, placeholder = "Search…", extra,
    }: { value: string; onChange: (v: string) => void; placeholder?: string; extra?: React.ReactNode }) {
      const [local, setLocal] = React.useState(value);
      React.useEffect(() => setLocal(value), [value]);
      const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

      function handleChange(v: string) {
        setLocal(v);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onChange(v), 300);
      }

      return (
        <div className="flex items-center gap-2">
          <Input
            value={local}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className="max-w-sm"
            data-testid="datatable-search"
          />
          {extra}
        </div>
      );
    }
    ```

    Create `src/components/admin/data-table-pagination.tsx`:
    ```tsx
    "use client";
    import { type Table } from "@tanstack/react-table";
    import { Button } from "@/components/ui/button";
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

    export function DataTablePagination<TData>({ table }: { table: Table<TData> }) {
      const { pageIndex, pageSize } = table.getState().pagination;
      const total = table.getRowCount();
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return (
        <div className="flex items-center justify-between" data-testid="datatable-pagination">
          <div className="text-sm text-muted-foreground">
            Page {pageIndex + 1} of {totalPages} ({total} rows)
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={pageIndex === 0} data-testid="datatable-prev">Prev</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={pageIndex + 1 >= totalPages} data-testid="datatable-next">Next</Button>
          </div>
        </div>
      );
    }
    ```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit &amp;&amp; pnpm vitest run tests/components/data-table.test.tsx --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'manualPagination: true' src/components/admin/data-table.tsx` returns `1`
    - `grep -c 'manualSorting: true' src/components/admin/data-table.tsx` returns `1`
    - `grep -c 'manualFiltering: true' src/components/admin/data-table.tsx` returns `1`
    - `grep -c 'useQueryStates' src/components/admin/data-table.tsx` returns `1`
    - `grep -c 'data-testid="datatable-search"' src/components/admin/data-table-toolbar.tsx` returns `1`
    - `grep -c 'data-testid="datatable-prev"' src/components/admin/data-table-pagination.tsx` returns `1`
    - `grep -c 'data-testid="datatable-next"' src/components/admin/data-table-pagination.tsx` returns `1`
    - `pnpm tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>DataTable + pagination + toolbar exported as composable units; type-checks; ready for downstream list pages.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 6.2: Vitest-DOM test for URL state on page-next click</name>
  <files>tests/components/data-table.test.tsx</files>
  <read_first>
    - vitest.config.ts (Phase-1 — confirm jsdom environment is configured for component tests)
    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pattern 4 — the parent RSC pattern
  </read_first>
  <behavior>
    - Render DataTable with 3 mock rows + rowCount=50; click "Next" button; expect URL to update to `?page=2`.
    - Type into search input; expect debounced URL update to `?q=<typed>&page=1`.
  </behavior>
  <action>
    Create `tests/components/data-table.test.tsx`:
    ```tsx
    import { describe, it, expect, vi } from "vitest";
    import { render, screen, fireEvent, waitFor } from "@testing-library/react";
    import { DataTable } from "@/components/admin/data-table";
    import { NuqsTestingAdapter } from "nuqs/adapters/testing";
    import type { ColumnDef } from "@tanstack/react-table";

    type Row = { id: string; name: string };
    const cols: ColumnDef<Row>[] = [
      { id: "id", header: "ID", accessorKey: "id" },
      { id: "name", header: "Name", accessorKey: "name" },
    ];
    const data: Row[] = Array.from({ length: 3 }, (_, i) => ({ id: `id-${i}`, name: `Row ${i}` }));

    describe("DataTable URL state", () => {
      it("Next button advances ?page in the URL", async () => {
        const onUrlUpdate = vi.fn();
        render(
          <NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
            <DataTable columns={cols} data={data} rowCount={50} />
          </NuqsTestingAdapter>,
        );
        fireEvent.click(screen.getByTestId("datatable-next"));
        await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
        const lastCall = onUrlUpdate.mock.calls.at(-1)![0] as { searchParams: URLSearchParams };
        expect(lastCall.searchParams.get("page")).toBe("2");
      });

      it("typing in search debounces and writes ?q=<text>&page=1", async () => {
        const onUrlUpdate = vi.fn();
        render(
          <NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
            <DataTable columns={cols} data={data} rowCount={50} />
          </NuqsTestingAdapter>,
        );
        fireEvent.change(screen.getByTestId("datatable-search"), { target: { value: "needle" } });
        await waitFor(() => {
          const lastCall = onUrlUpdate.mock.calls.at(-1)?.[0] as { searchParams: URLSearchParams } | undefined;
          expect(lastCall?.searchParams.get("q")).toBe("needle");
        }, { timeout: 1000 });
      });
    });
    ```

    If `nuqs/adapters/testing` is not exported by version 2.8.9, fall back to a wrapper that uses `<NuqsAdapter>` from `nuqs/adapters/next/app` and a stubbed `next/navigation` mock — document the chosen path in the test file's leading comment.

    Add `@testing-library/react` and `@testing-library/jest-dom` to dependencies if not yet present (Phase-1 may not have included them). Add as devDependencies via `pnpm add -D @testing-library/react @testing-library/jest-dom jsdom` and configure vitest to use jsdom for tests under `tests/components/**`.
  </action>
  <verify>
    <automated>pnpm vitest run tests/components/data-table.test.tsx --reporter=basic</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm vitest run tests/components/data-table.test.tsx` exits 0
    - Both tests pass
    - File `tests/components/data-table.test.tsx` exists
  </acceptance_criteria>
  <done>DOM test confirms URL state updates on page-next + search-typing; DataTable behavior is locked.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| URL searchParams → DataTable state | untrusted query string |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-06-01 | Tampering | crafted ?page=99999 | accept | nuqs `parseAsInteger.withDefault(1)` clamps invalid values; the RSC parent issues `LIMIT/OFFSET` against bounded inputs. Out-of-bound page just shows empty results — not a security issue. |
| T-02-06-02 | Information Disclosure | search query persists in URL | accept | URL is meant to be shareable per CONTEXT D-17; admin URL is itself behind requireAdmin() |
| T-02-06-03 | DoS | very large `pageSize` | mitigate | Client offers fixed options [10,20,50,100]; server-side route MUST clamp `pageSize ≤ 100` (downstream plans enforce). |
</threat_model>

<verification>
- `pnpm tsc --noEmit` exits 0
- `pnpm vitest run tests/components/data-table.test.tsx` exits 0
</verification>

<success_criteria>
1. DataTable<TData> generic component compiled and exported.
2. URL state owned by nuqs; manual pagination/sorting/filtering all true.
3. Pagination + Toolbar split into composable sub-components.
4. URL-sync verified by DOM test.
</success_criteria>

<output>
After completion, create `.planning/phases/02-admin-panel/02-06-SUMMARY.md` with the final component API (props), the URL-state schema (page/pageSize/q/sort), and the testing adapter chosen.
</output>
