"use client";

// Plan 02-13b Task 13b.3 — ProductForm (D-01 / D-04 / D-05 / D-09 / W7).
//
// THE marquee admin editor — single-page surface that ships every product
// edit on top of plan 02-13a's saveProduct + duplicateProduct and plan
// 02-13b's lifecycle Server Actions.
//
// Layout (D-01 LOCKED — single page, NOT a wizard):
//
//   ┌── Header (per-locale completeness bars + status pill) ──────────────┐
//   │                                                                    │
//   ├── LocaleTabs ──────────────────────────────────────────────────────┤
//   │   uz | ru | en   ← only the four translatable fields swap here:    │
//   │                     name, slug, shortDesc, longDesc                 │
//   │                     each translatable field shows a MT toggle       │
//   ├── Shared (non-translatable) fields ───────────────────────────────┤
//   │   - categoryId (select)                                            │
//   │   - manufacturerId (select; nullable)                              │
//   │   - SpecValuesEditor                                               │
//   │   - MediaUploader (images, multi)                                  │
//   │   - MediaUploader (datasheets, multi, accept=pdf)                  │
//   ├── Lifecycle row ──────────────────────────────────────────────────┤
//   │   Save (content edits) | Publish | Unpublish | Duplicate          │
//   └────────────────────────────────────────────────────────────────────┘
//
// W7 enforcement (refusal-to-elevate, two layers):
//   1. UI — there is NO RHF status registration and NO status select in the
//      form. The displayed status is read-only. On submit, we freeze the
//      status payload to the persisted value (`initial?.status` or 'draft'
//      for inserts) so even a tampered field can't change it.
//   2. Server — saveProduct (plan 02-13a) throws USE_PUBLISH_ACTION on any
//      status transition; only publishProduct / unpublishProduct can flip.
//
// MediaUploader shape adapter (D-07 dep): the uploader's multi mode uses
// `useFieldArray` over `{ publicId: string }[]`, but the Zod schema expects
// `string[]`. We hold the UI form value in the wrapped object shape and
// flatten to strings on submit. The `EMPTY_INITIAL` shape uses the wrapped
// form below; the `initialFromDb` adapter in the parent RSC wraps existing
// public_ids the same way.
//
// Per-locale completeness (D-04): the parent RSC reads the persisted view
// for steady-state %s. While editing, we estimate live via useWatch so the
// admin sees feedback as they fill fields. On reload, the persisted view
// snaps back to source-of-truth.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useForm,
  FormProvider,
  Controller,
  useWatch,
  type Control,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  LocaleTabs,
  LOCALES,
  type Locale,
} from "@/components/admin/locale-tabs";
import { SlugInput } from "@/components/admin/slug-input";
import { TranslationCompleteness } from "@/components/admin/translation-completeness";
import { MediaUploader } from "@/components/admin/media-uploader";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { MachineTranslatedToggle } from "@/components/admin/machine-translated-toggle";
import {
  SpecValuesEditor,
  type SpecFieldOption,
} from "@/components/admin/spec-values-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  saveProduct,
  publishProduct,
  unpublishProduct,
  duplicateProduct,
  deleteProduct,
} from "@/actions/products";
import {
  productInsertSchema,
  type ProductInput,
} from "@/lib/zod/product";

// ─── UI shape (form state) — diverges from ProductInput ONLY in the two
//    Cloudinary arrays which MediaUploader's useFieldArray needs as
//    objects (RHF cannot key a primitive-string array stably).
type WrappedPublicId = { publicId: string };
interface ProductFormUiInput
  extends Omit<ProductInput, "imagePublicIds" | "datasheetPublicIds"> {
  imagePublicIds: WrappedPublicId[];
  datasheetPublicIds: WrappedPublicId[];
}

export interface CategoryOption {
  id: string;
  name: string;
}
export interface ManufacturerOption {
  id: string;
  name: string;
}

export interface ProductFormProps {
  locale: string;
  /** Choices for the category select (current-locale name). */
  categoryOptions: CategoryOption[];
  /** Choices for the manufacturer select (current-locale name). */
  manufacturerOptions: ManufacturerOption[];
  /** Active spec fields for the (initially) selected category. */
  availableSpecFields: SpecFieldOption[];
  /**
   * Pre-fill values for edit. Absent on the new page; presence of `id`
   * triggers update mode in saveProduct.
   */
  initial?: ProductFormUiInput & { id?: string };
}

const EMPTY_LOCALE_FIELDS = {
  name: "",
  slug: "",
  shortDesc: "",
  longDesc: "",
};

const EMPTY_UI_INITIAL: ProductFormUiInput = {
  categoryId: "",
  manufacturerId: null,
  status: "draft",
  translations: {
    uz: { ...EMPTY_LOCALE_FIELDS },
    ru: { ...EMPTY_LOCALE_FIELDS },
    en: { ...EMPTY_LOCALE_FIELDS },
  },
  specValues: [],
  imagePublicIds: [],
  datasheetPublicIds: [],
  mtFlags: { uz: {}, ru: {}, en: {} },
};

/**
 * Per-locale live completeness estimator. Uses useWatch so the bars react
 * as the admin types in any of the four translatable fields.
 *
 * D-04 deferral note (resolved in plan): the persisted view is the
 * source-of-truth on read. This live estimator gives feedback while
 * editing — on save+reload the bars snap to the view's value.
 */
function PerLocaleCompleteness({
  control,
  locale,
}: {
  control: Control<ProductFormUiInput>;
  locale: Locale;
}) {
  const t = useWatch({ control, name: `translations.${locale}` });
  const filled = (
    ["name", "slug", "shortDesc", "longDesc"] as const
  ).filter((k) => {
    const v = (t as Record<string, unknown> | undefined)?.[k];
    return typeof v === "string" && v.trim().length > 0;
  }).length;
  const pct = Math.round((filled / 4) * 100);
  return (
    <TranslationCompleteness
      percent={pct}
      label={locale.toUpperCase()}
      className="w-32"
    />
  );
}

export function ProductForm({
  locale,
  categoryOptions,
  manufacturerOptions,
  availableSpecFields,
  initial,
}: ProductFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<ProductFormUiInput>({
    // We resolve against the persisted Zod schema by transforming UI shape
    // → wire shape in onSubmit. Skip the Zod resolver here so the form's
    // `imagePublicIds` UI shape (objects) doesn't trip the schema's
    // string[] expectation.
    defaultValues: initial ?? EMPTY_UI_INITIAL,
    mode: "onBlur",
  });

  // Persisted status — the SSOT for the W7 status freeze. Inserts default
  // to 'draft'; edits inherit from the DB row.
  const persistedStatus = (initial?.status ?? "draft") as
    | "draft"
    | "published";

  // Live status display — equals persistedStatus by construction (the
  // form NEVER mutates `status`). useWatch keeps the display in sync if
  // a future change adds a status writer.
  const currentStatus =
    useWatch({ control: form.control, name: "status" }) ?? persistedStatus;

  // Plan 02-14 Task 14.3 — media-dirty indicator. RHF's `dirtyFields` flips
  // any time MediaUploader appends/removes/reorders a tile (the wrapped
  // `{ publicId }` rows or the SortableContext `move()` swap both write
  // through useFieldArray). We surface this as a visual cue on the Save
  // button so the admin knows pending media reorders/uploads aren't yet
  // persisted — protects against the "I dragged thumbnails but forgot to
  // hit Save" footgun.
  const dirtyFields = form.formState.dirtyFields as Partial<{
    imagePublicIds: unknown;
    datasheetPublicIds: unknown;
  }>;
  const mediaDirty = Boolean(
    dirtyFields.imagePublicIds || dirtyFields.datasheetPublicIds,
  );

  function onSubmit(values: ProductFormUiInput) {
    setServerError(null);

    // W7 freeze: status payload is set verbatim from `persistedStatus`,
    // not from form state. Combined with saveProduct's
    // refusal-to-elevate, this gives two layers of protection.
    const submission: ProductInput = {
      ...(initial?.id ? { id: initial.id } : {}),
      categoryId: values.categoryId,
      manufacturerId: values.manufacturerId ?? null,
      status: persistedStatus,
      translations: values.translations,
      specValues: values.specValues,
      imagePublicIds: values.imagePublicIds.map((w) => w.publicId),
      datasheetPublicIds: values.datasheetPublicIds.map((w) => w.publicId),
      mtFlags: values.mtFlags,
    };

    // Validate against the wire schema before we hit the network. Surfaces
    // any shape errors that the client UI somehow bypassed.
    const parsed = productInsertSchema.safeParse(submission);
    if (!parsed.success) {
      setServerError(
        "Some fields are invalid. Check the locale tabs for errors.",
      );
      return;
    }

    startTransition(async () => {
      const result = await saveProduct(parsed.data);
      if (result.ok) {
        if (!initial?.id) {
          // First save of a new product — push to its edit page so the
          // admin can iterate.
          router.push(
            `/${locale}/admin/products/${result.data.id}/edit`,
          );
        }
        router.refresh();
      } else {
        setServerError(
          result.error === "validation"
            ? "Some fields are invalid. Check the locale tabs for errors."
            : result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not save the product. Slugs may collide with an existing row.",
        );
      }
    });
  }

  function handlePublish() {
    if (!initial?.id) return;
    setServerError(null);
    startTransition(async () => {
      const result = await publishProduct({ id: initial.id! });
      if (result.ok) router.refresh();
      else setServerError("Could not publish this product.");
    });
  }

  function handleUnpublish() {
    if (!initial?.id) return;
    setServerError(null);
    startTransition(async () => {
      const result = await unpublishProduct({ id: initial.id! });
      if (result.ok) router.refresh();
      else setServerError("Could not unpublish this product.");
    });
  }

  function handleDuplicate() {
    if (!initial?.id) return;
    setServerError(null);
    startTransition(async () => {
      const result = await duplicateProduct({ sourceId: initial.id! });
      if (result.ok) {
        // Land the admin on the clone's edit page (status='draft', slugs
        // suffixed -copy per duplicateProduct contract).
        router.push(
          `/${locale}/admin/products/${result.data.id}/edit`,
        );
      } else {
        setServerError("Could not duplicate this product.");
      }
    });
  }

  function handleDelete() {
    if (!initial?.id) return;
    setServerError(null);
    startTransition(async () => {
      const result = await deleteProduct({ id: initial.id! });
      if (result.ok) {
        router.push(`/${locale}/admin/products`);
      } else {
        setServerError("Could not delete this product.");
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
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* Header: per-locale live completeness + status pill */}
        <div className="flex flex-wrap items-end gap-4">
          {LOCALES.map((l) => (
            <PerLocaleCompleteness
              key={l}
              control={form.control}
              locale={l}
            />
          ))}
          <div
            className="ml-auto rounded bg-muted px-3 py-1 text-sm"
            data-testid="status-display"
          >
            Status: <span className="font-medium">{currentStatus}</span>
          </div>
        </div>

        {/* Translatable fields — ONE form instance, three tabs swap (D-01) */}
        <LocaleTabs errors={tabErrors}>
          {(l) => {
            const flagsForLocale = (form.watch(`mtFlags.${l}`) ??
              {}) as Record<string, boolean | undefined>;
            // D-05 visual cue helper — amber left-border on MT-flagged fields.
            const mtClass = (fieldName: string) =>
              flagsForLocale[fieldName]
                ? "border-l-4 border-l-amber-500 pl-3"
                : "";
            return (
              <div className="grid gap-4">
                <div className={`grid gap-2 ${mtClass("name")}`}>
                  <Label htmlFor={`name-${l}`}>
                    Name ({l.toUpperCase()})
                    {flagsForLocale.name ? (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-900">
                        MT
                      </span>
                    ) : null}
                  </Label>
                  <SlugInput
                    nameField={`translations.${l}.name`}
                    slugField={`translations.${l}.slug`}
                    namePlaceholder={`Name in ${l.toUpperCase()}`}
                    slugPlaceholder={`slug-${l}`}
                  />
                  <MachineTranslatedToggle fieldName="name" locale={l} />
                  {form.formState.errors.translations?.[l]?.name ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.translations[l]?.name?.message}
                    </p>
                  ) : null}
                  {form.formState.errors.translations?.[l]?.slug ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.translations[l]?.slug
                        ?.message ??
                        "Invalid slug — use a-z, 0-9 and hyphens only."}
                    </p>
                  ) : null}
                </div>

                <div className={`grid gap-2 ${mtClass("shortDesc")}`}>
                  <Label htmlFor={`shortDesc-${l}`}>
                    Short description ({l.toUpperCase()})
                    {flagsForLocale.shortDesc ? (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-900">
                        MT
                      </span>
                    ) : null}
                  </Label>
                  <Textarea
                    id={`shortDesc-${l}`}
                    rows={2}
                    {...form.register(`translations.${l}.shortDesc`)}
                    disabled={pending}
                  />
                  <MachineTranslatedToggle
                    fieldName="shortDesc"
                    locale={l}
                  />
                </div>

                <div className={`grid gap-2 ${mtClass("longDesc")}`}>
                  <Label htmlFor={`longDesc-${l}`}>
                    Long description ({l.toUpperCase()})
                    {flagsForLocale.longDesc ? (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-900">
                        MT
                      </span>
                    ) : null}
                  </Label>
                  <Textarea
                    id={`longDesc-${l}`}
                    rows={6}
                    {...form.register(`translations.${l}.longDesc`)}
                    disabled={pending}
                  />
                  <MachineTranslatedToggle
                    fieldName="longDesc"
                    locale={l}
                  />
                </div>
              </div>
            );
          }}
        </LocaleTabs>

        {/* Shared (non-translatable) fields — render ONCE outside LocaleTabs */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="categoryId">Category</Label>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <select
                  id="categoryId"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  disabled={pending}
                  data-testid="category-select"
                >
                  <option value="">— Choose category —</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="manufacturerId">Manufacturer</Label>
            <Controller
              control={form.control}
              name="manufacturerId"
              render={({ field }) => (
                <select
                  id="manufacturerId"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? null : e.target.value,
                    )
                  }
                  onBlur={field.onBlur}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  disabled={pending}
                  data-testid="manufacturer-select"
                >
                  <option value="">— None —</option>
                  {manufacturerOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>

        <SpecValuesEditor availableSpecFields={availableSpecFields} />

        <div className="grid gap-2">
          <Label>Images</Label>
          <MediaUploader
            name="imagePublicIds"
            mode="multi"
            maxFiles={10}
            folder="products"
          />
        </div>

        <div className="grid gap-2">
          <Label>Datasheets (PDF)</Label>
          <MediaUploader
            name="datasheetPublicIds"
            mode="multi"
            maxFiles={5}
            accept="pdf"
            folder="products"
          />
        </div>

        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        ) : null}

        {/* Lifecycle row — Save (content), Publish | Unpublish, Duplicate, Delete */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            render={<Link href={`/${locale}/admin/products`}>Cancel</Link>}
          />
          <Button
            type="submit"
            data-testid="product-save"
            disabled={pending}
          >
            {pending
              ? "Saving…"
              : initial?.id
                ? mediaDirty
                  ? "Save changes (media)"
                  : "Save changes"
                : "Create product"}
          </Button>
          {initial?.id && currentStatus === "draft" ? (
            <Button
              type="button"
              variant="default"
              data-testid="product-publish"
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
                  data-testid="product-unpublish"
                  disabled={pending}
                >
                  Unpublish
                </Button>
              }
              title="Unpublish this product?"
              description="The public detail page will return 404 until you publish it again. The audit log records this transition."
              confirmLabel="Unpublish"
              onConfirm={handleUnpublish}
            />
          ) : null}
          {initial?.id ? (
            <Button
              type="button"
              variant="outline"
              data-testid="product-duplicate"
              disabled={pending}
              onClick={handleDuplicate}
            >
              Duplicate
            </Button>
          ) : null}
          {initial?.id ? (
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  variant="destructive"
                  data-testid="product-delete"
                  disabled={pending}
                >
                  Delete
                </Button>
              }
              title="Delete this product?"
              description={
                <>
                  This permanently deletes the product, its translations,
                  spec values, and MT flags. This cannot be undone.
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
