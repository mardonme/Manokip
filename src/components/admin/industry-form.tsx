"use client";

// Plan 04-08 Task 8.1 — IndustryForm (CONT-02 / D-03 / D-05 / D-06 / W7).
//
// Verbatim mirror of `src/components/admin/recipe-form.tsx` (plan 04-07) with
// the entity swap (Recipe → Industry, recipeInsertSchema → industryInsertSchema,
// saveRecipe → saveIndustry, etc.) and the MediaUploader folder swap
// ('recipes' → 'industries'). LinkedProductsPicker is REUSED verbatim from
// 04-07 — same import, same generic options prop. No industry-specific picker.
//
// W7 enforcement (refusal-to-elevate, two layers):
//   1. UI — no RHF status registration; status payload frozen to persistedStatus
//      on submit so even a tampered field can't change it.
//   2. Server — saveIndustry (plan 04-06) throws USE_PUBLISH_ACTION on any
//      status transition; only publishIndustry / unpublishIndustry can flip.
//
// Body field path is `translations.<locale>.body` — matches industryInsertSchema
// (sibling of recipeInsertSchema). See plan 04-07's deviation Rule 1 — same
// applies here.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, Controller } from "react-hook-form";

import {
  LocaleTabs,
  LOCALES,
  type Locale,
} from "@/components/admin/locale-tabs";
import { SlugInput } from "@/components/admin/slug-input";
import { MediaUploader } from "@/components/admin/media-uploader";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { IndustryBodyEditor } from "@/components/admin/industry-body-editor";
import {
  LinkedProductsPicker,
  type ProductOption,
} from "@/components/admin/linked-products-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  saveIndustry,
  publishIndustry,
  unpublishIndustry,
  deleteIndustry,
} from "@/actions/industries";
import { industryInsertSchema, type IndustryInput } from "@/lib/zod/industry";

const EMPTY_LOCALE_FIELDS = {
  title: "",
  slug: "",
  excerpt: "",
  body: null as unknown,
};

const EMPTY_INITIAL: IndustryInput = {
  status: "draft",
  publishedAt: null,
  featuredImagePublicId: null,
  translations: {
    uz: { ...EMPTY_LOCALE_FIELDS },
    ru: { ...EMPTY_LOCALE_FIELDS },
    en: { ...EMPTY_LOCALE_FIELDS },
  },
  linkedProductIds: [],
};

export interface IndustryFormProps {
  locale: string;
  productOptions: ProductOption[];
  /**
   * Pre-fill values for edit. Absent on /new; presence of `id` triggers
   * update mode in saveIndustry.
   */
  initial?: IndustryInput & { id?: string };
}

export function IndustryForm({
  locale,
  productOptions,
  initial,
}: IndustryFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<IndustryInput>({
    defaultValues: initial ?? EMPTY_INITIAL,
    mode: "onBlur",
  });

  // Persisted status — SSOT for the W7 status freeze. See RecipeForm comments.
  const persistedStatus = (initial?.status ?? "draft") as
    | "draft"
    | "published";
  const currentStatus = persistedStatus;

  function onSubmit(values: IndustryInput) {
    setServerError(null);

    const submission: IndustryInput = {
      ...(initial?.id ? { id: initial.id } : {}),
      status: persistedStatus,
      publishedAt: initial?.publishedAt ?? null,
      featuredImagePublicId: values.featuredImagePublicId ?? null,
      translations: values.translations,
      linkedProductIds: values.linkedProductIds,
    };

    const parsed = industryInsertSchema.safeParse(submission);
    if (!parsed.success) {
      setServerError(
        "Some fields are invalid. Check the locale tabs for errors.",
      );
      return;
    }

    startTransition(async () => {
      const result = await saveIndustry(parsed.data);
      if (result.ok) {
        if (!initial?.id) {
          router.push(
            `/${locale}/admin/industries/${result.data.id}/edit`,
          );
        }
        router.refresh();
      } else {
        setServerError(
          result.error === "validation"
            ? "Some fields are invalid. Check the locale tabs for errors."
            : result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not save the industry. Slugs may collide with an existing row.",
        );
      }
    });
  }

  function handlePublish() {
    if (!initial?.id) return;
    setServerError(null);
    startTransition(async () => {
      const result = await publishIndustry({ id: initial.id! });
      if (result.ok) router.refresh();
      else setServerError("Could not publish this industry.");
    });
  }

  function handleUnpublish() {
    if (!initial?.id) return;
    setServerError(null);
    startTransition(async () => {
      const result = await unpublishIndustry({ id: initial.id! });
      if (result.ok) router.refresh();
      else setServerError("Could not unpublish this industry.");
    });
  }

  function handleDelete() {
    if (!initial?.id) return;
    setServerError(null);
    startTransition(async () => {
      const result = await deleteIndustry({ id: initial.id! });
      if (result.ok) {
        router.push(`/${locale}/admin/industries`);
      } else {
        setServerError("Could not delete this industry.");
      }
    });
  }

  const tabErrors = LOCALES.reduce<
    Partial<Record<Locale, typeof form.formState.errors>>
  >((acc, l) => {
    const slice = form.formState.errors.translations?.[l];
    if (slice) acc[l] = slice as typeof form.formState.errors;
    return acc;
  }, {});

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header: status pill */}
        <div className="flex flex-wrap items-end gap-4">
          <div
            className="ml-auto rounded bg-muted px-3 py-1 text-sm"
            data-testid="status-display"
          >
            Status: <span className="font-medium">{currentStatus}</span>
          </div>
        </div>

        {/* Translatable fields — ONE form instance, three tabs swap (D-05) */}
        <LocaleTabs errors={tabErrors}>
          {(l) => (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor={`title-${l}`}>
                  Title ({l.toUpperCase()})
                </Label>
                <SlugInput
                  nameField={`translations.${l}.title`}
                  slugField={`translations.${l}.slug`}
                  namePlaceholder={`Title in ${l.toUpperCase()}`}
                  slugPlaceholder={`slug-${l}`}
                />
                {form.formState.errors.translations?.[l]?.title ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.translations[l]?.title?.message}
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
                <Label htmlFor={`excerpt-${l}`}>
                  Excerpt ({l.toUpperCase()})
                </Label>
                <Textarea
                  id={`excerpt-${l}`}
                  rows={2}
                  {...form.register(`translations.${l}.excerpt`)}
                  disabled={pending}
                />
              </div>

              <div className="grid gap-2">
                <Label>Body ({l.toUpperCase()})</Label>
                {/* Path is translations.<locale>.body to match
                    industryInsertSchema (mirror of RecipeForm pattern from
                    plan 04-07 deviation Rule 1). */}
                <IndustryBodyEditor name={`translations.${l}.body`} />
              </div>
            </div>
          )}
        </LocaleTabs>

        {/* Shared (non-translatable) fields */}
        <div className="grid gap-2">
          <Label>Featured image</Label>
          <Controller
            control={form.control}
            name="featuredImagePublicId"
            render={() => (
              <MediaUploader
                name="featuredImagePublicId"
                mode="single"
                folder="industries"
              />
            )}
          />
        </div>

        <div className="grid gap-2">
          <Label>Linked products</Label>
          <LinkedProductsPicker
            name="linkedProductIds"
            options={productOptions}
          />
        </div>

        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        ) : null}

        {/* Lifecycle row */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            render={
              <Link href={`/${locale}/admin/industries`}>Cancel</Link>
            }
          />
          <Button
            type="submit"
            data-testid="industry-save"
            disabled={pending}
          >
            {pending
              ? "Saving…"
              : initial?.id
                ? "Save changes"
                : "Create industry"}
          </Button>
          {initial?.id && currentStatus === "draft" ? (
            <Button
              type="button"
              variant="default"
              data-testid="industry-publish"
              disabled={pending}
              onClick={handlePublish}
            >
              Publish
            </Button>
          ) : null}
          {initial?.id && currentStatus === "published" ? (
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  data-testid="industry-unpublish"
                  disabled={pending}
                >
                  Unpublish
                </Button>
              }
              title="Unpublish this industry?"
              description="The public detail page will return 404 until you publish it again. The audit log records this transition."
              confirmLabel="Unpublish"
              onConfirm={handleUnpublish}
            />
          ) : null}
          {initial?.id ? (
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="destructive"
                  data-testid="industry-delete"
                  disabled={pending}
                >
                  Delete
                </Button>
              }
              title="Delete this industry?"
              description={
                <>
                  This permanently deletes the industry, its translations, and
                  its product links. This cannot be undone.
                </>
              }
              confirmLabel="Delete permanently"
              destructive
              onConfirm={handleDelete}
            />
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}

// Suppress unused-import warning if Input ends up unused in v1 (kept for parity
// with recipe-form imports).
void Input;
