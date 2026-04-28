"use client";

// Generic DataTable<TData> — the reusable primitive consumed by every admin
// list page in Waves 2-4 (products, categories, manufacturers, spec-fields,
// submissions, audit). Authored once; downstream plans only declare columns
// and let the parent RSC fetch a server-paginated slice.
//
// URL state contract (nuqs):
//   - page      (parseAsInteger, default 1)        — 1-indexed page number
//   - pageSize  (parseAsInteger, default 20)       — clamped client-side to
//                                                    the page-size select
//   - q         (parseAsString,  default "")       — debounced search query
//   - sort      (parseAsString,  default "")       — `<column>` asc, or
//                                                    `-<column>` desc.
//                                                    Empty string = no sort.
//
// All four params live in the URL so admin filtered views are shareable +
// bookmarkable per CONTEXT D-17. Default values are *omitted* from the URL
// (nuqs strips them on serialise), keeping clean URLs for first-time visits.
//
// Server-pagination contract (Pitfall #8):
//   - manualPagination = true   → table never reorders rows itself; the
//                                 parent RSC is the source of truth for what
//                                 belongs on this page.
//   - manualSorting    = true   → sort header clicks bubble up via
//                                 `setQuery({ sort })`; the RSC re-fetches.
//   - manualFiltering  = true   → search input drives `setQuery({ q })`; the
//                                 RSC applies the filter and returns the
//                                 already-filtered rows.
//   Without these flags TanStack would reshuffle the already-paginated slice
//   client-side, producing a broken UX where pagination lies about totals.

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

export interface DataTableProps<TData> {
  /** TanStack column definitions. */
  columns: ColumnDef<TData, unknown>[];
  /** Already-paginated row slice from the parent RSC. */
  data: TData[];
  /** Total row count across all pages (used for page-count math). */
  rowCount: number;
  /** Placeholder text for the toolbar search input. */
  searchPlaceholder?: string;
  /** Optional filter chips rendered next to the search input. */
  toolbarSlot?: React.ReactNode;
  /** Default page size when the URL omits ?pageSize. */
  defaultPageSize?: number;
  /** Page-size dropdown options. Defaults to [10,20,50,100]. */
  pageSizeOptions?: number[];
  /**
   * Server-pagination switch (Open Q §3 of plan 02-11). Defaults to `true`
   * — every existing call-site passes the parent RSC's already-paginated
   * slice and TanStack just renders it. Pass `false` for small lists that
   * fit in a single fetch (e.g. spec-fields, ~80 rows expected) so the
   * client sorts / paginates / filters in-memory; the parent RSC simply
   * fetches *all* rows and provides them as `data`.
   */
  manualPagination?: boolean;
}

export function DataTable<TData>({
  columns,
  data,
  rowCount,
  searchPlaceholder,
  toolbarSlot,
  defaultPageSize = 20,
  pageSizeOptions,
  manualPagination = true,
}: DataTableProps<TData>) {
  const [{ page, pageSize, q, sort }, setQuery] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(defaultPageSize),
    q: parseAsString.withDefault(""),
    sort: parseAsString.withDefault(""),
  });

  // Translate URL state into TanStack's internal shapes. `pageIndex` is
  // 0-based in TanStack but we keep 1-based numbers in the URL so users see
  // ?page=1 rather than ?page=0 (matches how every other admin tool URLs
  // pagination).
  const pagination: PaginationState = React.useMemo(
    () => ({ pageIndex: Math.max(0, page - 1), pageSize }),
    [page, pageSize],
  );

  const sorting: SortingState = React.useMemo(() => {
    if (!sort) return [];
    const desc = sort.startsWith("-");
    const id = desc ? sort.slice(1) : sort;
    return id ? [{ id, desc }] : [];
  }, [sort]);

  const table = useReactTable<TData>({
    data,
    columns,
    rowCount,
    state: {
      pagination,
      sorting,
      globalFilter: q,
    },
    // Server-pagination flags — see file-header note + Pitfall #8. The
    // three flags are tied to the same opt-in (`manualPagination` prop):
    // either ALL three are server-driven (the default) or ALL three are
    // client-driven (small in-memory tables like spec-fields).
    manualPagination,
    manualSorting: manualPagination,
    manualFiltering: manualPagination,
    // Client-side row models — only attached when `manualPagination` is
    // false; otherwise the parent RSC owns the slice and TanStack must not
    // recompute pagination locally.
    ...(manualPagination
      ? {}
      : {
          getPaginationRowModel: getPaginationRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          getSortedRowModel: getSortedRowModel(),
        }),
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      void setQuery({
        page: next.pageIndex + 1,
        pageSize: next.pageSize,
      });
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      void setQuery({
        sort: first ? `${first.desc ? "-" : ""}${first.id}` : "",
      });
    },
    onGlobalFilterChange: (value: string) => {
      void setQuery({ q: value, page: 1 });
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        value={q}
        onChange={(next) => {
          // Reset to page 1 whenever the query changes — otherwise
          // "search → still on page 5 of stale results" is a silent UX bug.
          void setQuery({ q: next, page: 1 });
        }}
        placeholder={searchPlaceholder}
        extra={toolbarSlot}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8 text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        table={table}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  );
}
