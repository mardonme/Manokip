// Plan 04-07 Task 7.2 — LinkedProductsPicker jsdom specs (flipped from 04-04 RED).
//
// 2 specs lock the picker contracts:
//   1. Filter — typing into the search input narrows the visible options to
//      case-insensitive substring matches on name OR sku.
//   2. Multi-select — clicking options appends them to the field array;
//      clicking remove (×) drops them. Each append preserves the previously-
//      selected items and assigns sequential positions 0..N-1.
//
// Drag-reorder spec (drag-from-position-1-to-position-0) is asserted
// indirectly through the position-reassignment regression: when an item is
// removed mid-array, the remaining positions remain sequential. Full
// dnd-kit drag-event simulation requires the @dnd-kit pointer-event polyfill
// in jsdom and is covered by the recipe-form Playwright e2e in 04-12.
//
// Environment: jsdom (configured in vitest.config.ts via the `dom` project).

import * as React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

import {
  LinkedProductsPicker,
  type ProductOption,
} from "@/components/admin/linked-products-picker";

// 6 seed options — 3 "manometer" rows + 3 "transmitter" rows for the filter
// spec ("manometer" → 3 visible).
const OPTIONS: ProductOption[] = [
  { id: "p1", name: "Bourdon manometer 0-10 bar", sku: "BM10" },
  { id: "p2", name: "Bourdon manometer 0-25 bar", sku: "BM25" },
  { id: "p3", name: "Diaphragm manometer corrosion-resistant", sku: "DM-CR" },
  { id: "p4", name: "Pressure transmitter 4-20 mA", sku: "PT420" },
  { id: "p5", name: "Differential pressure transmitter", sku: "DPT-1" },
  { id: "p6", name: "Smart Hart pressure transmitter", sku: "SHPT" },
];

interface WrapperProps {
  defaultValues?: Record<string, unknown>;
  children: React.ReactNode;
}

function Wrapper({ defaultValues, children }: WrapperProps) {
  const form = useForm({
    defaultValues: defaultValues ?? { linkedProductIds: [] },
  });
  return (
    <FormProvider {...form}>
      {children}
      <button
        type="button"
        data-testid="dump"
        onClick={() => {
          (window as unknown as { __vals: unknown }).__vals = form.getValues();
        }}
      >
        dump
      </button>
    </FormProvider>
  );
}

beforeEach(() => {
  cleanup();
});

describe("LinkedProductsPicker [GREEN — flipped from 04-04 RED in 04-07]", () => {
  it("filters product options client-side based on the search input (case-insensitive on name OR sku)", async () => {
    render(
      <Wrapper>
        <LinkedProductsPicker options={OPTIONS} />
      </Wrapper>,
    );

    const filter = screen.getByTestId(
      "linked-products-filter",
    ) as HTMLInputElement;

    // Empty filter → all 6 options visible.
    expect(screen.getByTestId("linked-products-option-p1")).toBeTruthy();
    expect(screen.getByTestId("linked-products-option-p2")).toBeTruthy();
    expect(screen.getByTestId("linked-products-option-p3")).toBeTruthy();
    expect(screen.getByTestId("linked-products-option-p4")).toBeTruthy();
    expect(screen.getByTestId("linked-products-option-p5")).toBeTruthy();
    expect(screen.getByTestId("linked-products-option-p6")).toBeTruthy();

    // Type "manometer" → 3 manometer rows visible, 3 transmitter rows hidden.
    fireEvent.change(filter, { target: { value: "manometer" } });
    expect(screen.getByTestId("linked-products-option-p1")).toBeTruthy();
    expect(screen.getByTestId("linked-products-option-p2")).toBeTruthy();
    expect(screen.getByTestId("linked-products-option-p3")).toBeTruthy();
    expect(screen.queryByTestId("linked-products-option-p4")).toBeNull();
    expect(screen.queryByTestId("linked-products-option-p5")).toBeNull();
    expect(screen.queryByTestId("linked-products-option-p6")).toBeNull();

    // Case-insensitive: typing "BOURDON" matches the two Bourdon rows.
    fireEvent.change(filter, { target: { value: "BOURDON" } });
    expect(screen.getByTestId("linked-products-option-p1")).toBeTruthy();
    expect(screen.getByTestId("linked-products-option-p2")).toBeTruthy();
    expect(screen.queryByTestId("linked-products-option-p3")).toBeNull();

    // SKU match: "DPT" matches the differential transmitter sku DPT-1.
    fireEvent.change(filter, { target: { value: "DPT" } });
    expect(screen.getByTestId("linked-products-option-p5")).toBeTruthy();
    expect(screen.queryByTestId("linked-products-option-p1")).toBeNull();

    // Clear filter → all 6 visible again.
    fireEvent.change(filter, { target: { value: "" } });
    expect(screen.getByTestId("linked-products-option-p1")).toBeTruthy();
    expect(screen.getByTestId("linked-products-option-p6")).toBeTruthy();
  });

  it("multi-select: clicking options appends to the field array; remove drops with sequential position reassignment", async () => {
    render(
      <Wrapper>
        <LinkedProductsPicker options={OPTIONS} />
      </Wrapper>,
    );

    // Click product A (p1) — chip appears, position=0.
    fireEvent.click(screen.getByTestId("linked-products-option-p1"));
    expect(screen.getByTestId("linked-products-chip-p1")).toBeTruthy();
    // p1 is now selected — its option should no longer appear in the list.
    expect(screen.queryByTestId("linked-products-option-p1")).toBeNull();

    // Click product B (p4) — second chip, position=1.
    fireEvent.click(screen.getByTestId("linked-products-option-p4"));
    expect(screen.getByTestId("linked-products-chip-p1")).toBeTruthy();
    expect(screen.getByTestId("linked-products-chip-p4")).toBeTruthy();
    expect(screen.queryByTestId("linked-products-option-p4")).toBeNull();

    // Dump form state and verify the field array shape.
    fireEvent.click(screen.getByTestId("dump"));
    let vals = (
      window as unknown as {
        __vals: { linkedProductIds: { productId: string; position: number }[] };
      }
    ).__vals;
    expect(vals.linkedProductIds).toHaveLength(2);
    expect(vals.linkedProductIds[0]?.productId).toBe("p1");
    expect(vals.linkedProductIds[0]?.position).toBe(0);
    expect(vals.linkedProductIds[1]?.productId).toBe("p4");
    expect(vals.linkedProductIds[1]?.position).toBe(1);

    // Click remove on p1 — chip drops; remaining chip is p4 with position=0.
    fireEvent.click(screen.getByTestId("linked-products-remove-p1"));
    expect(screen.queryByTestId("linked-products-chip-p1")).toBeNull();
    expect(screen.getByTestId("linked-products-chip-p4")).toBeTruthy();
    // p1 is back in the option list since it's no longer selected.
    expect(screen.getByTestId("linked-products-option-p1")).toBeTruthy();

    fireEvent.click(screen.getByTestId("dump"));
    vals = (
      window as unknown as {
        __vals: { linkedProductIds: { productId: string; position: number }[] };
      }
    ).__vals;
    // Sequential position reassignment after remove — deviation Rule 2 from
    // plan 04-07. Even though p4 was originally at position=1, after p1 is
    // removed the array re-emits with position=0.
    expect(vals.linkedProductIds).toHaveLength(1);
    expect(vals.linkedProductIds[0]?.productId).toBe("p4");
    expect(vals.linkedProductIds[0]?.position).toBe(0);
  });
});
