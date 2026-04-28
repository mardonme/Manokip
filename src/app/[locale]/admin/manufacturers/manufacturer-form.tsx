"use client";

// Plan 02-10 Task 10.3 — ManufacturerForm (D-01 / Pattern 5).
//
// Mirrors src/app/[locale]/admin/categories/category-form.tsx (plan 02-09)
// but with two manufacturer-specific differences:
//
//   1. No `parentId` field — manufacturers are flat (no tree).
//
//   2. <MediaUploader name="logoPublicId" mode="single" folder="manufacturers" />
//      renders OUTSIDE the LocaleTabs because the logo is shared across all
//      three locales (one Cloudinary asset per manufacturer, not per locale).
//
// ONE useForm instance over the full manufacturerInsertSchema (Zod resolver);
// LocaleTabs swaps only the translatable subtree in place. Submit calls
// saveManufacturer via React.useTransition + narrows on .ok (typed object
// payload, same posture as the categories form — useActionState's FormData
// reducer would force serialise/deserialise of the form tree).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { LocaleTabs, LOCALES } from "@/components/admin/locale-tabs";
import { SlugInput } from "@/components/admin/slug-input";
import { MediaUploader } from "@/components/admin/media-uploader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { saveManufacturer } from "@/actions/manufacturers";
import {
  manufacturerInsertSchema,
  type ManufacturerInput,
} from "@/lib/zod/manufacturer";

export interface ManufacturerFormProps {
  locale: string;
  /**
   * Pre-fill values for edit. Absent on the new page; `id` triggers update
   * mode in saveManufacturer.
   */
  initial?: ManufacturerInput;
}

const EMPTY_LOCALE_FIELDS = { name: "", slug: "", description: "" };

const EMPTY_INITIAL: ManufacturerInput = {
  logoPublicId: null,
  translations: {
    uz: { ...EMPTY_LOCALE_FIELDS },
    ru: { ...EMPTY_LOCALE_FIELDS },
    en: { ...EMPTY_LOCALE_FIELDS },
  },
};

export function ManufacturerForm({ locale, initial }: ManufacturerFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<ManufacturerInput>({
    resolver: zodResolver(manufacturerInsertSchema),
    defaultValues: initial ?? EMPTY_INITIAL,
    mode: "onBlur",
  });

  function onSubmit(values: ManufacturerInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await saveManufacturer(values);
      if (result.ok) {
        router.push(`/${locale}/admin/manufacturers`);
        router.refresh();
      } else {
        setServerError(
          result.error === "validation"
            ? "Some fields are invalid. Check the locale tabs for errors."
            : result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not save the manufacturer. Slugs may collide with an existing row.",
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
        {/* Shared (non-translated) field — logo. Lives OUTSIDE LocaleTabs
            because one Cloudinary asset is shared across all 3 locales. */}
        <div className="grid gap-2">
          <Label>Logo</Label>
          <MediaUploader
            name="logoPublicId"
            mode="single"
            folder="manufacturers"
          />
          {form.formState.errors.logoPublicId ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.logoPublicId.message ??
                "Invalid logo reference."}
            </p>
          ) : null}
        </div>

        {/* Translatable fields — ONE form instance, three tabs swap in place (D-01) */}
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
              <Link href={`/${locale}/admin/manufacturers`}>Cancel</Link>
            }
          />
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving…"
              : initial?.id
                ? "Save changes"
                : "Create manufacturer"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
