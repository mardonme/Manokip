"use client";

// Plan 04-07 Task 7.3 — RecipeForm (CONT-01 / D-03 / D-05 / D-06 / W7).
//
// Marquee admin editor for recipes — single-page surface mirroring the Phase-2
// product-form pattern (plan 02-13b) verbatim:
//
//   ┌── Header (status pill) ─────────────────────────────────────────────┐
//   ├── LocaleTabs ──────────────────────────────────────────────────────┤
//   │   uz | ru | en   ← swap title / slug / excerpt / body per locale    │
//   ├── Shared (non-translatable) fields ────────────────────────────────┤
//   │   - Featured image via MediaUploader (mode='single', folder='recipes') │
//   │   - LinkedProductsPicker (options pre-fetched by parent RSC)        │
//   ├── Lifecycle row ───────────────────────────────────────────────────┤
//   │   Save (content edits) | Publish | Unpublish | Delete              │
//   └────────────────────────────────────────────────────────────────────┘
//
// W7 enforcement (refusal-to-elevate, two layers):
//   1. UI — no RHF status registration; status payload frozen to persistedStatus
//      on submit so even a tampered field can't change it.
//   2. Server — saveRecipe (plan 04-05) throws USE_PUBLISH_ACTION on any
//      status transition; only publishRecipe / unpublishRecipe can flip.
//
// The form uses the recipeInsertSchema directly (src/lib/zod/recipe.ts) — no
// UI/wire shape divergence here because the body is jsonb (Tiptap JSONContent)
// and the linked-products picker writes [{productId, position}] which already
// matches the Zod array shape. No wrapping like Phase-2 product-form's
// imagePublicIds is needed.

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
import { RecipeBodyEditor } from "@/components/admin/recipe-body-editor";
import {
  LinkedProductsPicker,
  type ProductOption,
} from "@/components/admin/linked-products-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  saveRecipe,
  publishRecipe,
  unpublishRecipe,
  deleteRecipe,
} from "@/actions/recipes";
import { recipeInsertSchema, type RecipeInput } from "@/lib/zod/recipe";

const EMPTY_LOCALE_FIELDS = {
  title: "",
  slug: "",
  excerpt: "",
  body: null as unknown,
};

const EMPTY_INITIAL: RecipeInput = {
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

export interface RecipeFormProps {
  locale: string;
  productOptions: ProductOption[];
  /**
   * Pre-fill values for edit. Absent on /new; presence of `id` triggers
   * update mode in saveRecipe.
   */
  initial?: RecipeInput & { id?: string };
}

export function RecipeForm({
  locale,
  productOptions,
  initial,
}: RecipeFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<RecipeInput>({
    defaultValues: initial ?? EMPTY_INITIAL,
    mode: "onBlur",
  });

  // Persisted status — SSOT for the W7 status freeze. Inserts default to
  // 'draft'; edits inherit from the DB row (the parent RSC threads it in
  // via initial.status).
  const persistedStatus = (initial?.status ?? "draft") as
    | "draft"
    | "published";
  const currentStatus = persistedStatus;

  function onSubmit(values: RecipeInput) {
    setServerError(null);

    // W7 freeze: status payload is set verbatim from persistedStatus, not
    // form state. Combined with saveRecipe's refusal-to-elevate, this gives
    // two layers of protection.
    const submission: RecipeInput = {
      ...(initial?.id ? { id: initial.id } : {}),
      status: persistedStatus,
      // saveRecipe doesn't touch publishedAt — pass-through whatever was
      // persisted (or null on insert).
      publishedAt: initial?.publishedAt ?? null,
      featuredImagePublicId: values.featuredImagePublicId ?? null,
      translations: values.translations,
      linkedProductIds: values.linkedProductIds,
    };

    // Final wire-shape validation before the network hit.
    const parsed = recipeInsertSchema.safeParse(submission);
    if (!parsed.success) {
      setServerError(
        "Some fields are invalid. Check the locale tabs for errors.",
      );
      return;
    }

    startTransition(async () => {
      const result = await saveRecipe(parsed.data);
      if (result.ok) {
        if (!initial?.id) {
          // First save of a new recipe — push to its edit page.
          router.push(
            `/${locale}/admin/recipes/${result.data.id}/edit`,
          );
        }
        router.refresh();
      } else {
        setServerError(
          result.error === "validation"
            ? "Some fields are invalid. Check the locale tabs for errors."
            : result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not save the recipe. Slugs may collide with an existing row.",
        );
      }
    });
  }

  function handlePublish() {
    if (!initial?.id) return;
    setServerError(null);
    startTransition(async () => {
      const result = await publishRecipe({ id: initial.id! });
      if (result.ok) router.refresh();
      else setServerError("Could not publish this recipe.");
    });
  }

  function handleUnpublish() {
    if (!initial?.id) return;
    setServerError(null);
    startTransition(async () => {
      const result = await unpublishRecipe({ id: initial.id! });
      if (result.ok) router.refresh();
      else setServerError("Could not unpublish this recipe.");
    });
  }

  function handleDelete() {
    if (!initial?.id) return;
    setServerError(null);
    startTransition(async () => {
      const result = await deleteRecipe({ id: initial.id! });
      if (result.ok) {
        router.push(`/${locale}/admin/recipes`);
      } else {
        setServerError("Could not delete this recipe.");
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
                {/* Path is translations.<locale>.body to match recipeInsertSchema
                    (deviation Rule 1 from 04-07-PLAN — locale-tab swap shape is
                    the contract, not the literal `body.uz` path). */}
                <RecipeBodyEditor name={`translations.${l}.body`} />
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
                folder="recipes"
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
              <Link href={`/${locale}/admin/recipes`}>Cancel</Link>
            }
          />
          <Button
            type="submit"
            data-testid="recipe-save"
            disabled={pending}
          >
            {pending
              ? "Saving…"
              : initial?.id
                ? "Save changes"
                : "Create recipe"}
          </Button>
          {initial?.id && currentStatus === "draft" ? (
            <Button
              type="button"
              variant="default"
              data-testid="recipe-publish"
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
                  data-testid="recipe-unpublish"
                  disabled={pending}
                >
                  Unpublish
                </Button>
              }
              title="Unpublish this recipe?"
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
                  data-testid="recipe-delete"
                  disabled={pending}
                >
                  Delete
                </Button>
              }
              title="Delete this recipe?"
              description={
                <>
                  This permanently deletes the recipe, its translations, and
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
// with product-form imports).
void Input;
