// DataTable URL-state integration tests.
//
// Uses NuqsTestingAdapter from `nuqs/adapters/testing` (nuqs 2.8.9) — the
// canonical way to assert URL writes from nuqs-driven components without
// booting a Next App-Router runtime. The adapter installs a memory-backed
// search-params store and emits `onUrlUpdate` whenever any nuqs hook writes
// to the URL via setQueryStates / setQuery.
//
// Environment: jsdom (configured in vitest.config.ts via the `dom` project).
// React Testing Library 16+ pairs with React 19 (act-aware fireEvent).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/admin/data-table";

type Row = { id: string; name: string };

const cols: ColumnDef<Row>[] = [
  { id: "id", header: "ID", accessorKey: "id" },
  { id: "name", header: "Name", accessorKey: "name" },
];

const data: Row[] = Array.from({ length: 3 }, (_, i) => ({
  id: `id-${i}`,
  name: `Row ${i}`,
}));

describe("DataTable URL state", () => {
  it("renders header row and a body row per data item", () => {
    render(
      <NuqsTestingAdapter>
        <DataTable columns={cols} data={data} rowCount={50} />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByText("ID")).toBeDefined();
    expect(screen.getByText("Name")).toBeDefined();
    // Three rows in the body, plus one header row = 4 row-shaped elements.
    for (let i = 0; i < data.length; i++) {
      expect(screen.getByText(`Row ${i}`)).toBeDefined();
    }
  });

  it("renders an empty-state placeholder when data is empty", () => {
    render(
      <NuqsTestingAdapter>
        <DataTable columns={cols} data={[]} rowCount={0} />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByText(/no results/i)).toBeDefined();
  });

  it("Next button advances ?page=2 in the URL", async () => {
    const onUrlUpdate = vi.fn();
    render(
      <NuqsTestingAdapter onUrlUpdate={onUrlUpdate} hasMemory>
        <DataTable columns={cols} data={data} rowCount={50} />
      </NuqsTestingAdapter>,
    );
    fireEvent.click(screen.getByTestId("datatable-next"));
    await waitFor(() => {
      expect(onUrlUpdate).toHaveBeenCalled();
    });
    const lastCall = onUrlUpdate.mock.calls.at(-1)![0] as {
      searchParams: URLSearchParams;
    };
    expect(lastCall.searchParams.get("page")).toBe("2");
  });

  it("typing in the search input debounces and writes ?q=<text>&page=1", async () => {
    const onUrlUpdate = vi.fn();
    render(
      <NuqsTestingAdapter onUrlUpdate={onUrlUpdate} hasMemory>
        <DataTable columns={cols} data={data} rowCount={50} />
      </NuqsTestingAdapter>,
    );
    fireEvent.change(screen.getByTestId("datatable-search"), {
      target: { value: "needle" },
    });
    await waitFor(
      () => {
        const lastCall = onUrlUpdate.mock.calls.at(-1)?.[0] as
          | { searchParams: URLSearchParams }
          | undefined;
        expect(lastCall?.searchParams.get("q")).toBe("needle");
      },
      { timeout: 1500 },
    );
    // The toolbar resets pagination on a new query. nuqs strips default
    // values from URLs (page default = 1), so the URL records this as "no
    // ?page=" rather than "?page=1" — both are semantically page 1.
    const lastCall = onUrlUpdate.mock.calls.at(-1)![0] as {
      searchParams: URLSearchParams;
    };
    const pageParam = lastCall.searchParams.get("page");
    expect(pageParam === null || pageParam === "1").toBe(true);
  });

  it("Prev button is disabled on the first page", () => {
    render(
      <NuqsTestingAdapter>
        <DataTable columns={cols} data={data} rowCount={50} />
      </NuqsTestingAdapter>,
    );
    const prev = screen.getByTestId("datatable-prev") as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it("pagination footer shows the row count and computed page count", () => {
    render(
      <NuqsTestingAdapter>
        <DataTable
          columns={cols}
          data={data}
          rowCount={50}
          defaultPageSize={20}
        />
      </NuqsTestingAdapter>,
    );
    // 50 rows / 20 per page = 3 pages total.
    expect(screen.getByText(/page 1 of 3/i)).toBeDefined();
    expect(screen.getByText(/50 rows/i)).toBeDefined();
  });
});
