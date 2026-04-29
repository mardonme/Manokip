"use client";

// Plan 02-13b Task 13b.3 — SpecValuesEditor (D-19/20).
//
// Controlled list-editor for product_spec_values rows. The form holds an
// array under `specValues`; each entry mirrors `productSpecValueInput`
// (src/lib/zod/product.ts) — typed slots for num/text/enum/bool with the
// optional unit override + sort order + per-locale text translations.
//
// Two-mode rows:
//   - Catalog row (isExtra=false): user picks a `spec_field` from
//     `availableSpecFields` (the active fields for the product's category).
//     The data_type slot is rendered inline based on spec_field.dataType:
//       - 'number' → a number Input bound to numValue
//       - 'text'   → a text Input bound to textValue
//       - 'enum'   → a <select> of opaque enum keys (full enum-options
//                    catalog wiring is deferred to a future plan; for v1
//                    the editor accepts a free-form string for the option
//                    key — admins type the catalog key)
//       - 'bool'   → a Checkbox bound to boolValue
//   - Extra row (isExtra=true): no spec_field FK; user types a free-form
//     `extraKey` and a textValue. Translations are accepted via the
//     `translations.{uz,ru,en}` field map (saveProduct splits these into
//     product_spec_value_translations rows).
//
// Replace-on-save semantics live in saveProduct (Step 3 of the 5-step tx)
// — this editor is a flat client list. Removing a row here drops the
// corresponding row from the next save's INSERT.

import * as React from "react";
import {
  useFormContext,
  useFieldArray,
  Controller,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ProductInput } from "@/lib/zod/product";

export interface SpecFieldOption {
  id: string;
  key: string;
  /**
   * Catalog data_type — drives which typed slot the row renders. Mirrors
   * src/db/schema/spec-fields.ts:specDataTypeEnum.
   */
  dataType: "number" | "text" | "enum" | "bool";
  unit: string | null;
}

export interface SpecValuesEditorProps {
  /** Active spec_fields scoped to the current product's category. */
  availableSpecFields: SpecFieldOption[];
}

const EMPTY_CATALOG_ROW: ProductInput["specValues"][number] = {
  specFieldId: null,
  isExtra: false,
  extraKey: null,
  numValue: null,
  textValue: null,
  enumValue: null,
  boolValue: null,
  unit: null,
  sortOrder: 0,
};

const EMPTY_EXTRA_ROW: ProductInput["specValues"][number] = {
  specFieldId: null,
  isExtra: true,
  extraKey: "",
  numValue: null,
  textValue: null,
  enumValue: null,
  boolValue: null,
  unit: null,
  sortOrder: 0,
};

export function SpecValuesEditor({
  availableSpecFields,
}: SpecValuesEditorProps) {
  const { control, register, watch } = useFormContext<ProductInput>();
  const { fields, append, remove } = useFieldArray<ProductInput>({
    control,
    // useFieldArray doesn't accept primitive arrays; specValues holds objects
    // so this just works.
    name: "specValues",
  });

  return (
    <div className="space-y-3" data-testid="spec-values-editor">
      <div className="flex items-center justify-between">
        <Label>Specifications</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="spec-add-catalog"
            onClick={() =>
              append({
                ...EMPTY_CATALOG_ROW,
                sortOrder: fields.length,
              })
            }
          >
            + Catalog spec
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="spec-add-extra"
            onClick={() =>
              append({
                ...EMPTY_EXTRA_ROW,
                sortOrder: fields.length,
              })
            }
          >
            + Free-form
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No specifications yet.</p>
      ) : null}

      <div className="space-y-2">
        {fields.map((f, i) => {
          const isExtra = watch(`specValues.${i}.isExtra`);
          const specFieldId = watch(`specValues.${i}.specFieldId`);
          const selected = availableSpecFields.find(
            (s) => s.id === specFieldId,
          );
          const dataType = selected?.dataType;

          return (
            <div
              key={f.id}
              className="grid gap-2 rounded border p-3 md:grid-cols-[12rem,1fr,8rem,2.5rem]"
              data-testid={`spec-row-${i}`}
            >
              {/* Column 1: spec selector or extraKey input */}
              {isExtra ? (
                <Input
                  placeholder="extra_key"
                  data-testid={`spec-extra-key-${i}`}
                  {...register(`specValues.${i}.extraKey`)}
                />
              ) : (
                <Controller
                  control={control}
                  name={`specValues.${i}.specFieldId`}
                  render={({ field }) => (
                    <select
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.value,
                        )
                      }
                      onBlur={field.onBlur}
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      data-testid={`spec-field-select-${i}`}
                    >
                      <option value="">— Choose spec field —</option>
                      {availableSpecFields.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.key} ({s.dataType})
                        </option>
                      ))}
                    </select>
                  )}
                />
              )}

              {/* Column 2: typed-value editor */}
              <div className="flex items-center gap-2">
                {isExtra ? (
                  <Input
                    placeholder="value (uz)"
                    data-testid={`spec-text-${i}`}
                    {...register(`specValues.${i}.textValue`)}
                  />
                ) : dataType === "number" ? (
                  <Controller
                    control={control}
                    name={`specValues.${i}.numValue`}
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          )
                        }
                        onBlur={field.onBlur}
                        data-testid={`spec-num-${i}`}
                      />
                    )}
                  />
                ) : dataType === "text" ? (
                  <Input
                    placeholder="text value"
                    data-testid={`spec-text-${i}`}
                    {...register(`specValues.${i}.textValue`)}
                  />
                ) : dataType === "enum" ? (
                  <Input
                    placeholder="enum option key"
                    data-testid={`spec-enum-${i}`}
                    {...register(`specValues.${i}.enumValue`)}
                  />
                ) : dataType === "bool" ? (
                  <Controller
                    control={control}
                    name={`specValues.${i}.boolValue`}
                    render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(v) => field.onChange(!!v)}
                          data-testid={`spec-bool-${i}`}
                        />
                        Yes
                      </label>
                    )}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Pick a spec field to edit value
                  </span>
                )}
              </div>

              {/* Column 3: unit override */}
              <Input
                placeholder={selected?.unit ?? "unit"}
                data-testid={`spec-unit-${i}`}
                {...register(`specValues.${i}.unit`)}
              />

              {/* Column 4: remove */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid={`spec-remove-${i}`}
                onClick={() => remove(i)}
                aria-label="Remove spec value"
              >
                ×
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
