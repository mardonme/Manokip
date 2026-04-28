"use client";

// DataTable pagination footer — prev / next buttons + page-size select.
//
// All state is derived from the TanStack Table instance the parent
// <DataTable> threads through. Calling `table.previousPage()` /
// `table.nextPage()` / `table.setPageSize(n)` invokes the
// onPaginationChange callback that <DataTable> wires to nuqs, so URL writes
// happen without this component talking to nuqs directly. This keeps the
// pagination footer reusable in any future client-paginated context (small
// admin lists where the row count is bounded) without code change.

import { type Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getRowCount();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirst = pageIndex === 0;
  const isLast = pageIndex + 1 >= totalPages;

  return (
    <div
      className="flex items-center justify-between"
      data-testid="datatable-pagination"
    >
      <div className="text-sm text-muted-foreground">
        Page {pageIndex + 1} of {totalPages} ({total} rows)
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(next) => {
            table.setPageSize(Number(next));
          }}
        >
          <SelectTrigger className="w-28" data-testid="datatable-page-size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => table.previousPage()}
          disabled={isFirst}
          data-testid="datatable-prev"
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => table.nextPage()}
          disabled={isLast}
          data-testid="datatable-next"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
