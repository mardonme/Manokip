"use client";

// Plan 02-09 Task 9.1 — SlugInput (D-01 / RESEARCH §Pattern 5 follow-up).
//
// Two coupled <input>s that share a row in the locale tab body:
//   1. name input  (registered against `nameField`)
//   2. slug input  (registered against `slugField`)
//
// Behaviour: when the name input blurs, generate a slug via the canonical
// Phase-1 helper (`@/lib/slug` — apostrophe-variant set + Uzbek Latin Uʻ/Gʻ
// normalization to U+02BB) and write it into the slug field, BUT only if
// the user has not manually edited the slug. The dirty-flag check uses
// RHF's `formState.dirtyFields` which is the SSOT for "user touched this
// field" state.
//
// Why a render-prop helper rather than a wrapped Input? Because Phase-2
// forms render <FormField> + <FormControl> wrappers (shadcn/RHF) around
// each input — those wrappers want to own the <Input> render. SlugInput
// returns the bare register() spreadable, leaving FormField composition
// to the caller. (See category-form.tsx for the consumption pattern.)

import { useFormContext } from "react-hook-form";
import { toSlug } from "@/lib/slug";
import { Input } from "@/components/ui/input";

export interface SlugInputProps {
  /**
   * RHF dotted path to the name field driving the slug generation,
   * e.g. `"translations.uz.name"`.
   */
  nameField: string;
  /**
   * RHF dotted path to the slug field, e.g. `"translations.uz.slug"`.
   */
  slugField: string;
  /** Optional placeholder for the name input. */
  namePlaceholder?: string;
  /** Optional placeholder for the slug input. */
  slugPlaceholder?: string;
}

export function SlugInput({
  nameField,
  slugField,
  namePlaceholder = "Name",
  slugPlaceholder = "slug",
}: SlugInputProps) {
  const { register, getValues, setValue, getFieldState, formState } =
    useFormContext();

  // Subscribe to formState so RHF re-renders this island when the user
  // dirties the slug (otherwise getFieldState reads stale dirty state).
  // Reading `formState.isDirty` once is the documented React Hook Form
  // proxy hook for dirty-tracking subscriptions.
  void formState.isDirty;

  function handleNameBlur() {
    const slugState = getFieldState(slugField);
    if (slugState.isDirty) return; // user manually edited slug — don't override

    const name = getValues(nameField) as string | undefined;
    if (!name) return;

    setValue(slugField, toSlug(name), {
      shouldValidate: true,
      // Do NOT mark the slug as dirty — auto-generated slugs should keep
      // following the name field until the user takes ownership.
      shouldDirty: false,
    });
  }

  return (
    <div className="grid gap-2">
      <Input
        {...register(nameField, { onBlur: handleNameBlur })}
        placeholder={namePlaceholder}
      />
      <Input
        {...register(slugField)}
        placeholder={slugPlaceholder}
        data-testid="slug-input"
      />
    </div>
  );
}
