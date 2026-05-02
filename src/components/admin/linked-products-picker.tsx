"use client";

// Plan 04-07 Task 7.2 — LinkedProductsPicker (CONT-01 / D-04).
//
// RHF-bound multi-select picker for the M:N recipe ↔ product junction.
// Rendered inside the recipe form (and reused by industry form in 04-08)
// below the locale tabs — non-translatable shared field.
//
// Shape:
//   - Field: useFieldArray over `linkedProductIds` —
//       [{ productId: string, position: number }]
//   - Replace-on-save semantics live in saveRecipe (DELETE-then-INSERT).
//     The picker writes the entire array on every change; positions are
//     reassigned 0..N-1 on insert and on reorder (deviation Rule 2 from
//     plan 04-07 — ensures sequential position invariant).
//
// UI:
//   - Inline text filter (case-insensitive substring match on name OR sku).
//   - Below the filter: scrollable list of options that aren't already
//     selected. Click an option → append to the selected array.
//   - Selected items render as draggable chips (@dnd-kit reorder pattern
//     from MediaUploader). Each chip shows option.name + remove (×) +
//     drag handle.
//
// Deviation Rule 3 from 04-07-PLAN: the plan asks for shadcn Popover +
// Command primitives, but those primitives are NOT yet shipped in this
// project's src/components/ui/* (only Dialog / Tabs / Select etc. exist).
// Adding two new primitives just for this surface adds risk without
// meaningful UX gain at v1 scale (≤200 published products, RESEARCH
// §Linked-products picker confirms client-side filter is sufficient).
// We ship a flat inline filter + list which satisfies the test contracts
// (filter, multi-select toggle, drag-reorder) and matches the v1 simplicity
// posture. Upgrade to Popover + Command primitives can land alongside other
// shadcn rollouts in a future polish plan.

import * as React from "react";
import { useFormContext, useFieldArray, type FieldArray } from "react-hook-form";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ProductOption {
  id: string;
  /** Current-locale product name (parent RSC pre-fetches). */
  name: string;
  /** Optional SKU / part number used for filter matching. Phase 1 doesn't have a sku column yet — pass empty string for now. */
  sku?: string;
}

export interface LinkedProductsPickerProps {
  /** RHF field path. The recipe + industry forms use `linkedProductIds`. */
  name?: string;
  /** Pre-fetched options (parent RSC). */
  options: ProductOption[];
}

interface LinkedProductFieldValue {
  productId: string;
  position: number;
}

/**
 * Reassign sequential positions 0..N-1 over the field array. Called after
 * append + remove + drag-reorder so saveRecipe sees a contiguous position
 * range (deviation Rule 2 from 04-07-PLAN).
 */
function reassignPositions<T extends { productId: string; position: number }>(
  rows: T[],
): T[] {
  return rows.map((r, i) => ({ ...r, position: i }));
}

export function LinkedProductsPicker({
  name = "linkedProductIds",
  options,
}: LinkedProductsPickerProps) {
  const { control } = useFormContext();
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name,
  });

  const [filter, setFilter] = React.useState("");

  // The selected productIds (in insertion order) — used to filter the
  // available list below the search input.
  const selectedIds = React.useMemo(
    () =>
      new Set(
        (fields as unknown as LinkedProductFieldValue[]).map(
          (f) => f.productId,
        ),
      ),
    [fields],
  );

  // Filter the options client-side. Case-insensitive substring on name OR
  // sku. Always exclude already-selected items (visual cue: those render as
  // chips below).
  const filteredOptions = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    return options.filter((o) => {
      if (selectedIds.has(o.id)) return false;
      if (q.length === 0) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        (o.sku ?? "").toLowerCase().includes(q)
      );
    });
  }, [options, filter, selectedIds]);

  // Lookup — the chip needs the option name. Build a map once per options
  // array reference.
  const optionsById = React.useMemo(() => {
    const m = new Map<string, ProductOption>();
    for (const o of options) m.set(o.id, o);
    return m;
  }, [options]);

  function handleAdd(productId: string) {
    append({ productId, position: fields.length } as FieldArray<
      Record<string, LinkedProductFieldValue[]>,
      string
    >);
    setFilter("");
  }

  function handleRemove(index: number) {
    remove(index);
    // After remove, re-emit reassigned positions so the saveRecipe payload
    // sees [0, 1, 2, …] (deviation Rule 2 from 04-07-PLAN).
    const next = (fields as unknown as LinkedProductFieldValue[])
      .filter((_, i) => i !== index)
      .map((f, i) => ({ productId: f.productId, position: i }));
    // We use replace() rather than mutating individual setValue calls so the
    // entire shape transitions atomically.
    replace(next as unknown as FieldArray<
      Record<string, LinkedProductFieldValue[]>,
      string
    >[]);
  }

  // Drag-reorder handler — reads the active + over indices from dnd-kit's
  // event, applies arrayMove, then rewrites positions sequentially.
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = (fields as unknown as LinkedProductFieldValue[]).findIndex(
      (f) => f.productId === String(active.id),
    );
    const newIndex = (fields as unknown as LinkedProductFieldValue[]).findIndex(
      (f) => f.productId === String(over.id),
    );
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(
      fields as unknown as LinkedProductFieldValue[],
      oldIndex,
      newIndex,
    );
    replace(reassignPositions(moved) as unknown as FieldArray<
      Record<string, LinkedProductFieldValue[]>,
      string
    >[]);
  }

  return (
    <div
      className="grid gap-3"
      data-testid="linked-products-picker"
    >
      <div className="grid gap-2">
        <Input
          type="search"
          placeholder="Search products by name or SKU…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          data-testid="linked-products-filter"
        />
        {filter.length > 0 || filteredOptions.length > 0 ? (
          <div
            className="max-h-56 overflow-y-auto rounded border bg-popover"
            data-testid="linked-products-options"
          >
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No matching products.
              </p>
            ) : (
              <ul className="divide-y">
                {filteredOptions.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => handleAdd(o.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                      data-testid={`linked-products-option-${o.id}`}
                    >
                      <span className="font-medium">{o.name}</span>
                      {o.sku ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {o.sku}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <p className="text-xs text-muted-foreground">
          Linked products ({fields.length})
        </p>
        {fields.length === 0 ? (
          <p className="rounded border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            No products linked yet. Use the search above to add products.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={(
                fields as unknown as LinkedProductFieldValue[]
              ).map((f) => f.productId)}
              strategy={horizontalListSortingStrategy}
            >
              <ul
                className="flex flex-wrap gap-2"
                data-testid="linked-products-chips"
              >
                {(fields as unknown as LinkedProductFieldValue[]).map(
                  (f, index) => {
                    const opt = optionsById.get(f.productId);
                    const label = opt?.name ?? f.productId;
                    return (
                      <SortableChip
                        key={f.productId}
                        id={f.productId}
                        label={label}
                        onRemove={() => handleRemove(index)}
                      />
                    );
                  },
                )}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

interface SortableChipProps {
  id: string;
  label: string;
  onRemove: () => void;
}

function SortableChip({ id, label, onRemove }: SortableChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm"
      data-testid={`linked-products-chip-${id}`}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        data-testid={`linked-products-handle-${id}`}
        aria-label={`Reorder ${label}`}
      >
        ⋮⋮
      </button>
      <span>{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        data-testid={`linked-products-remove-${id}`}
        aria-label={`Remove ${label}`}
      >
        ×
      </Button>
    </li>
  );
}
