"use client";

// Plan 02-09 Task 9.3 — CategoryForm (D-01 / Pattern 5).
//
// Marquee admin editor pattern: ONE useForm instance over the full
// `categoryInsertSchema` (Zod resolver) with three tabs that swap only
// the translatable fields in place. The shared parent-select + sortOrder
// render once outside the LocaleTabs so they aren't duplicated per locale.
//
// Submit calls the saveCategory Server Action via React.useTransition.
// The Server Action returns a discriminated AdminActionResult — narrow on
// `.ok` and either router.push back to the list (success) or surface the
// error inline. We don't use useActionState because the action takes a
// typed object payload rather than FormData (same posture as the admins
// InviteAdminDialog established in plan 02-07).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { LocaleTabs, LOCALES } from "@/components/admin/locale-tabs";
import { SlugInput } from "@/components/admin/slug-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { saveCategory } from "@/actions/categories";
import {
  categoryInsertSchema,
  type CategoryInput,
} from "@/lib/zod/category";

export interface CategoryParentOption {
  id: string;
  /** Localized name in the current request locale. */
  name: string;
}

export interface CategoryFormProps {
  locale: string;
  /** All non-self categories to populate the parent select. */
  parentOptions: CategoryParentOption[];
  /**
   * Pre-fill values for edit. Absent on the new page.
   * `id` triggers update mode in saveCategory.
   */
  initial?: CategoryInput;
}

const EMPTY_LOCALE_FIELDS = { name: "", slug: "", description: "" };

const EMPTY_INITIAL: CategoryInput = {
  parentId: null,
  sortOrder: 0,
  translations: {
    uz: { ...EMPTY_LOCALE_FIELDS },
    ru: { ...EMPTY_LOCALE_FIELDS },
    en: { ...EMPTY_LOCALE_FIELDS },
  },
};

export function CategoryForm({
  locale,
  parentOptions,
  initial,
}: CategoryFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categoryInsertSchema),
    defaultValues: initial ?? EMPTY_INITIAL,
    // Mode 'onBlur' so SlugInput's blur handler can read fresh dirty state
    // and validation surfaces in tab badges as the admin tabs across.
    mode: "onBlur",
  });

  function onSubmit(values: CategoryInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await saveCategory(values);
      if (result.ok) {
        router.push(`/${locale}/admin/categories`);
        router.refresh();
      } else {
        setServerError(
          result.error === "validation"
            ? "Some fields are invalid. Check the locale tabs for errors."
            : result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not save the category. Slugs may collide with an existing row.",
        );
      }
    });
  }

  // Per-locale slice of formState.errors for the LocaleTabs badges.
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
        {/* Shared (non-translated) fields — rendered ONCE outside LocaleTabs */}
        <div className="grid gap-2">
          <Label htmlFor="parentId">Parent category</Label>
          <Controller
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <select
                id="parentId"
                name="parentId"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : e.target.value)
                }
                onBlur={field.onBlur}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                disabled={pending}
              >
                <option value="">— Top level —</option>
                {parentOptions
                  .filter((opt) => opt.id !== initial?.id)
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
              </select>
            )}
          />
        </div>

        <div className="grid gap-2 max-w-[12rem]">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            type="number"
            min={0}
            {...form.register("sortOrder", { valueAsNumber: true })}
            disabled={pending}
          />
        </div>

        {/* Translatable fields — ONE instance, three tabs swap in place (D-01) */}
        <LocaleTabs errors={tabErrors}>
          {(l) => (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor={`name-${l}`}>Name ({l.toUpperCase()})</Label>
                <SlugInput
                  nameField={`translations.${l}.name`}
                  slugField={`translations.${l}.slug`}
                  namePlaceholder={`Name in ${l.toUpperCase()}`}
                  slugPlaceholder={`slug-${l}`}
                />
                <input
                  type="hidden"
                  data-testid={`slug-${l}`}
                  value={form.watch(`translations.${l}.slug`) ?? ""}
                  readOnly
                />
                {form.formState.errors.translations?.[l]?.name ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.translations[l]?.name?.message}
                  </p>
                ) : null}
                {form.formState.errors.translations?.[l]?.slug ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.translations[l]?.slug?.message ??
                      "Invalid slug — use a-z, 0-9 and hyphens only."}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`description-${l}`}>
                  Description ({l.toUpperCase()})
                </Label>
                <Textarea
                  id={`description-${l}`}
                  rows={4}
                  {...form.register(`translations.${l}.description`)}
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
            render={
              <Link href={`/${locale}/admin/categories`}>Cancel</Link>
            }
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : initial?.id ? "Save changes" : "Create category"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
