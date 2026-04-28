"use client";

// Plan 02-11 Task 11.4 — GroupForm (D-09).
//
// ONE useForm instance over specFieldGroupSaveSchema; LocaleTabs swaps the
// per-locale label field. Shared (non-translated) fields:
//   - categoryId (locked on update)
//   - key (locked on update — re-creating with a different key is the
//     migration path; matches the spec_field key-stability posture)
//   - sortOrder

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { LocaleTabs, LOCALES } from "@/components/admin/locale-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { saveSpecFieldGroup } from "@/actions/spec-field-groups";
import {
  specFieldGroupSaveSchema,
  type SpecFieldGroupInput,
} from "@/lib/zod/spec-field-group";

export interface GroupFormProps {
  locale: string;
  categoryOptions: Array<{ id: string; name: string }>;
  initial?: SpecFieldGroupInput;
}

const EMPTY_LOCALE_FIELDS = { label: "" };

export function GroupForm({ locale, categoryOptions, initial }: GroupFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const defaultValues: SpecFieldGroupInput = initial ?? {
    categoryId: categoryOptions[0]?.id ?? "",
    key: "",
    sortOrder: 0,
    translations: {
      uz: { ...EMPTY_LOCALE_FIELDS },
      ru: { ...EMPTY_LOCALE_FIELDS },
      en: { ...EMPTY_LOCALE_FIELDS },
    },
  };

  const form = useForm<SpecFieldGroupInput>({
    resolver: zodResolver(specFieldGroupSaveSchema),
    defaultValues,
    mode: "onBlur",
  });

  const isUpdate = Boolean(initial?.id);

  function onSubmit(values: SpecFieldGroupInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await saveSpecFieldGroup(values);
      if (result.ok) {
        router.push(`/${locale}/admin/spec-fields/groups`);
        router.refresh();
      } else {
        setServerError(
          result.error === "validation"
            ? "Some fields are invalid. Check the locale tabs for errors."
            : result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not save the group. The key may already exist in this category.",
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              {...form.register("key")}
              placeholder="dimensions"
              disabled={pending || isUpdate}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase letters, digits, underscore only.
            </p>
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

        <LocaleTabs errors={tabErrors}>
          {(l) => (
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
              <Link href={`/${locale}/admin/spec-fields/groups`}>Cancel</Link>
            }
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isUpdate ? "Save changes" : "Create group"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
