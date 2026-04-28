"use client";

// Plan 02-11 Task 11.4 — SpecFieldForm (D-01 / D-08).
//
// ONE useForm instance over the full specFieldSaveSchema (Zod resolver);
// LocaleTabs swaps only the translatable subtree (label + helpText) in place.
//
// Shared (non-translated) fields render OUTSIDE LocaleTabs:
//   - key (stable internal identifier; rename happens via the list-page
//     ConfirmDialog, NOT the form — the form's `key` field is read-only on
//     update to prevent accidental rename via the edit page).
//   - dataType (D-08 — DISABLED on update; the type-lock is enforced on
//     both layers (UI + saveSpecField).
//   - unit, required, filterKind, filterGroupKey, sortOrder, groupId,
//     categoryId.
//
// Submit calls saveSpecField via React.useTransition + narrows on .ok
// (typed object payload). Same posture as the manufacturers/categories
// forms.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { LocaleTabs, LOCALES } from "@/components/admin/locale-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { saveSpecField } from "@/actions/spec-fields";
import {
  specFieldSaveSchema,
  SPEC_DATA_TYPES,
  SPEC_FILTER_KINDS,
  type SpecFieldInput,
} from "@/lib/zod/spec-field";

export interface SpecFieldFormProps {
  locale: string;
  /**
   * List of {id, name} rows for the category select. Provided by the
   * parent RSC.
   */
  categoryOptions: Array<{ id: string; name: string }>;
  /** List of {id, label} rows for the optional group select. */
  groupOptions: Array<{ id: string; label: string }>;
  /** Pre-fill values for edit. Absent on /new. */
  initial?: SpecFieldInput;
}

const EMPTY_LOCALE_FIELDS = { label: "", helpText: "" };

export function SpecFieldForm({
  locale,
  categoryOptions,
  groupOptions,
  initial,
}: SpecFieldFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const defaultValues: SpecFieldInput = initial ?? {
    categoryId: categoryOptions[0]?.id ?? "",
    key: "",
    dataType: "number",
    unit: null,
    required: false,
    filterKind: null,
    filterGroupKey: null,
    groupId: null,
    sortOrder: 0,
    translations: {
      uz: { ...EMPTY_LOCALE_FIELDS },
      ru: { ...EMPTY_LOCALE_FIELDS },
      en: { ...EMPTY_LOCALE_FIELDS },
    },
  };

  const form = useForm<SpecFieldInput>({
    resolver: zodResolver(specFieldSaveSchema),
    defaultValues,
    mode: "onBlur",
  });

  const isUpdate = Boolean(initial?.id);

  function onSubmit(values: SpecFieldInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await saveSpecField(values);
      if (result.ok) {
        router.push(`/${locale}/admin/spec-fields`);
        router.refresh();
      } else {
        setServerError(
          result.error === "validation"
            ? "Some fields are invalid. Check the locale tabs for errors."
            : result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not save the spec field. The key may collide with an existing field in this category.",
        );
      }
    });
  }

  const tabErrors = LOCALES.reduce<
    Partial<Record<(typeof LOCALES)[number], typeof form.formState.errors>>
  >((acc, l) => {
    const slice = form.formState.errors.translations?.[l];
    if (slice) acc[l] = slice as typeof form.formState.errors;
    return acc;
  }, {});

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-w-2xl"
      >
        {/* Shared (non-translated) fields — categoryId, key, dataType,
            unit, required, filterKind, filterGroupKey, groupId, sortOrder. */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="categoryId">Category</Label>
            <select
              id="categoryId"
              {...form.register("categoryId")}
              disabled={pending || isUpdate}
              className="border rounded-md px-3 py-2 bg-background"
            >
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {isUpdate ? (
              <p className="text-xs text-muted-foreground">
                Category cannot be changed once saved (rebuilds the field on a
                different category instead).
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              {...form.register("key")}
              placeholder="pressure_max"
              disabled={pending || isUpdate}
              data-testid="key-input"
            />
            {isUpdate ? (
              <p className="text-xs text-muted-foreground">
                Use the Rename action on the list page to change the key
                (cascades extra_key in product_spec_values).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Lowercase letters, digits, underscore only.
              </p>
            )}
            {form.formState.errors.key ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.key.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dataType">Data type</Label>
            <select
              id="dataType"
              {...form.register("dataType")}
              disabled={pending || isUpdate}
              data-testid="data-type-select"
              className="border rounded-md px-3 py-2 bg-background"
            >
              {SPEC_DATA_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
            {isUpdate ? (
              <p className="text-xs text-muted-foreground">
                Type cannot be changed once saved (D-08 schema-evolution
                guardrail).
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="unit">Unit (optional)</Label>
            <Input
              id="unit"
              {...form.register("unit")}
              placeholder="bar, mm, °C"
              disabled={pending}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="required"
              checked={form.watch("required")}
              onCheckedChange={(checked) =>
                form.setValue("required", Boolean(checked))
              }
              disabled={pending}
            />
            <Label htmlFor="required" className="cursor-pointer">
              Required (counted toward translation completeness)
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="filterKind">Filter kind</Label>
            <select
              id="filterKind"
              {...form.register("filterKind")}
              disabled={pending}
              className="border rounded-md px-3 py-2 bg-background"
            >
              <option value="">— display only —</option>
              {SPEC_FILTER_KINDS.map((fk) => (
                <option key={fk} value={fk}>
                  {fk}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Range = pair of two number fields sharing a filter group key.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="filterGroupKey">
              Filter group key (optional)
            </Label>
            <Input
              id="filterGroupKey"
              {...form.register("filterGroupKey")}
              placeholder="pressure"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="groupId">Group (optional)</Label>
            <select
              id="groupId"
              {...form.register("groupId")}
              disabled={pending}
              className="border rounded-md px-3 py-2 bg-background"
            >
              <option value="">— ungrouped —</option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sortOrder">Sort order</Label>
            <Input
              id="sortOrder"
              type="number"
              {...form.register("sortOrder", { valueAsNumber: true })}
              disabled={pending}
            />
          </div>
        </div>

        {/* Translatable fields — label + helpText per locale. */}
        <LocaleTabs errors={tabErrors}>
          {(l) => (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor={`label-${l}`}>
                  Label ({l.toUpperCase()})
                </Label>
                <Input
                  id={`label-${l}`}
                  {...form.register(`translations.${l}.label`)}
                  disabled={pending}
                />
                {form.formState.errors.translations?.[l]?.label ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.translations[l]?.label?.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`helpText-${l}`}>
                  Help text ({l.toUpperCase()})
                </Label>
                <Textarea
                  id={`helpText-${l}`}
                  rows={3}
                  {...form.register(`translations.${l}.helpText`)}
                  disabled={pending}
                />
              </div>
            </div>
          )}
        </LocaleTabs>

        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            render={<Link href={`/${locale}/admin/spec-fields`}>Cancel</Link>}
          />
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving…"
              : isUpdate
                ? "Save changes"
                : "Create spec field"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
